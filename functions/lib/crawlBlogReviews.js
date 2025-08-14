"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlBlogReviews = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors = require("cors");
const logger_1 = require("./utils/logger");
const dateUtils_1 = require("./utils/dateUtils");
const clog = (...args) => console.log("[crawlBlogReviews]", ...args);
const corsMiddleware = cors({
    origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});
const extractPlaceId = (url) => {
    // 데스크탑 환경: /place/숫자 패턴
    const placeMatch = url.match(/place\/(\d+)/);
    if (placeMatch) {
        return placeMatch[1];
    }
    // 모바일 환경: pinId 파라미터
    const pinIdMatch = url.match(/[?&]pinId=(\d+)/);
    if (pinIdMatch) {
        return pinIdMatch[1];
    }
    return null;
};
// 모바일 환경에서 더 안정적인 URL 리다이렉트 처리
async function resolveShortUrl(inputUrl) {
    if (!inputUrl.includes("naver.me")) {
        return inputUrl;
    }
    clog(`🔗 단축 URL 감지: ${inputUrl}`);
    let finalUrl = inputUrl;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
        try {
            attempts++;
            clog(`🔄 리다이렉트 시도 ${attempts}/${maxAttempts}: ${finalUrl}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(finalUrl, {
                method: "HEAD",
                redirect: "manual",
                headers: {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const location = response.headers.get("location");
            if (location) {
                finalUrl = location.startsWith("http")
                    ? location
                    : `https://map.naver.com${location}`;
                clog(`🔀 리다이렉트 발견: ${finalUrl}`);
                // placeId 또는 pinId가 포함된 URL인지 확인
                if (finalUrl.includes("/place/") || finalUrl.includes("pinId=")) {
                    return finalUrl;
                }
            }
            else {
                // HEAD 요청이 실패하면 GET으로 시도
                clog(`🔄 HEAD 실패, GET 요청으로 재시도`);
                const getController = new AbortController();
                const getTimeoutId = setTimeout(() => getController.abort(), 15000);
                const getResponse = await fetch(finalUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                    },
                    signal: getController.signal,
                });
                clearTimeout(getTimeoutId);
                const resolvedUrl = getResponse.url;
                clog(`🔀 GET 요청으로 최종 URL 확인: ${resolvedUrl}`);
                return resolvedUrl;
            }
        }
        catch (error) {
            clog(`❌ 리다이렉트 시도 ${attempts} 실패:`, error.message);
            if (attempts === maxAttempts) {
                // 마지막 시도로 직접 GET 요청
                try {
                    const fallbackController = new AbortController();
                    const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 20000);
                    const fallbackResponse = await fetch(inputUrl, {
                        signal: fallbackController.signal,
                    });
                    clearTimeout(fallbackTimeoutId);
                    const fallbackUrl = fallbackResponse.url;
                    clog(`🔀 Fallback GET 요청으로 최종 URL: ${fallbackUrl}`);
                    return fallbackUrl;
                }
                catch (fallbackError) {
                    clog(`❌ Fallback도 실패:`, fallbackError.message);
                    throw new Error(`단축 URL 해석 실패: ${fallbackError.message}`);
                }
            }
        }
    }
    return finalUrl;
}
exports.crawlBlogReviews = (0, https_1.onRequest)({
    memory: "4GiB",
    timeoutSeconds: 600, // 10분으로 증가 (540초 → 600초)
    maxInstances: 5,
}, (req, res) => {
    corsMiddleware(req, res, async () => {
        const startTime = Date.now();
        const requestDate = (0, dateUtils_1.getCurrentDateString)(); // 요청 날짜 생성
        // 로깅 정보 추출
        const requestId = req.headers['x-request-id'];
        const logger = logger_1.ReviewLogger.getInstance();
        let inputUrl = req.query.url;
        if (!inputUrl) {
            if (requestId) {
                await logger.logError(requestId, "url 파라미터가 필요합니다.", requestDate);
            }
            res.status(400).json({ error: "url 파라미터가 필요합니다." });
            return;
        }
        let browser;
        try {
            // 시스템 안정화를 위한 의도적 지연 (1-3초 랜덤)
            const initialDelay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
            clog(`⏱️ 시스템 안정화 대기: ${initialDelay}ms`);
            await new Promise((resolve) => setTimeout(resolve, initialDelay));
            // 단축 URL 해석
            inputUrl = await resolveShortUrl(inputUrl);
            const placeId = extractPlaceId(inputUrl);
            if (!placeId) {
                throw new Error("URL에서 placeId를 추출할 수 없습니다. URL 형식을 확인해주세요: " +
                    inputUrl);
            }
            clog(`🆔 추출된 placeId: ${placeId}`);
            clog(`📅 요청 날짜: ${requestDate}`);
            // 요청 정보 업데이트 (일자별로 저장)
            if (requestId) {
                await logger.updateRequestInfo(requestId, {
                    placeId,
                    crawlingUrl: inputUrl,
                    requestDate
                });
            }
            const chromium = require("chrome-aws-lambda");
            clog(`🧭 Blog Crawling 시작`);
            // Chrome 실행 재시도 로직 (spawn EFAULT 오류 방지)
            let browserLaunchAttempts = 0;
            const maxBrowserAttempts = 3;
            while (browserLaunchAttempts < maxBrowserAttempts) {
                try {
                    browserLaunchAttempts++;
                    clog(`🚀 Chrome 실행 시도 ${browserLaunchAttempts}/${maxBrowserAttempts}`);
                    browser = await chromium.puppeteer.launch({
                        args: [
                            ...chromium.args,
                            "--no-sandbox",
                            "--disable-setuid-sandbox",
                            "--disable-dev-shm-usage",
                            "--disable-gpu",
                            "--single-process",
                            "--no-zygote",
                            "--disable-extensions",
                            "--disable-plugins",
                            "--disable-background-timer-throttling",
                            "--disable-backgrounding-occluded-windows",
                            "--disable-renderer-backgrounding",
                            "--disable-features=TranslateUI",
                            "--disable-ipc-flooding-protection",
                            "--memory-pressure-off",
                            "--max_old_space_size=4096",
                        ],
                        defaultViewport: chromium.defaultViewport,
                        executablePath: await chromium.executablePath,
                        headless: chromium.headless,
                        timeout: 45000,
                        ignoreDefaultArgs: ["--disable-extensions"],
                    });
                    clog(`✅ Chrome 실행 성공 (시도 ${browserLaunchAttempts})`);
                    break;
                }
                catch (launchError) {
                    clog(`❌ Chrome 실행 실패 (시도 ${browserLaunchAttempts}):`, launchError.message);
                    if (browser) {
                        try {
                            await browser.close();
                        }
                        catch (closeError) {
                            clog(`⚠️ 브라우저 종료 실패:`, closeError);
                        }
                        browser = null;
                    }
                    if (browserLaunchAttempts === maxBrowserAttempts) {
                        throw new Error(`Chrome 실행 실패 (${maxBrowserAttempts}번 시도): ${launchError.message}`);
                    }
                    // 재시도 전 잠시 대기
                    await new Promise((resolve) => setTimeout(resolve, 2000 * browserLaunchAttempts));
                }
            }
            const page = await browser.newPage();
            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            await page.setExtraHTTPHeaders({
                "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            });
            await page.setRequestInterception(true);
            page.on("request", (req) => {
                if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
                    req.abort();
                }
                else {
                    req.continue();
                }
            });
            const targetUrl = `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,2,dh&placePath=/review`;
            clog(`🔄 리뷰 페이지로 이동: ${targetUrl}`);
            // 더 안정적인 페이지 로딩 전략
            let pageLoadAttempts = 0;
            const maxPageLoadAttempts = 3;
            while (pageLoadAttempts < maxPageLoadAttempts) {
                try {
                    pageLoadAttempts++;
                    clog(`📄 페이지 로딩 시도 ${pageLoadAttempts}/${maxPageLoadAttempts}`);
                    await page.goto(targetUrl, {
                        waitUntil: "domcontentloaded", // networkidle2 대신 더 빠른 조건 사용
                        timeout: 90000, // 90초로 증가
                    });
                    clog(`✅ 페이지 로딩 성공 (시도 ${pageLoadAttempts})`);
                    break;
                }
                catch (loadError) {
                    clog(`❌ 페이지 로딩 실패 (시도 ${pageLoadAttempts}):`, loadError.message);
                    if (pageLoadAttempts === maxPageLoadAttempts) {
                        throw new Error(`페이지 로딩 실패 (${maxPageLoadAttempts}번 시도): ${loadError.message}`);
                    }
                    // 재시도 전 잠시 대기
                    await new Promise((resolve) => setTimeout(resolve, 3000 * pageLoadAttempts));
                }
            }
            // iframe 로딩 재시도 로직
            let iframeAttempts = 0;
            const maxIframeAttempts = 3;
            let frame = null;
            while (iframeAttempts < maxIframeAttempts) {
                try {
                    iframeAttempts++;
                    clog(`🖼️ iframe 로딩 시도 ${iframeAttempts}/${maxIframeAttempts}`);
                    await page.waitForSelector("#entryIframe", { timeout: 45000 }); // 45초로 증가
                    const iframe = await page.$("#entryIframe");
                    frame = await iframe.contentFrame();
                    if (frame) {
                        clog(`✅ iframe 로딩 성공 (시도 ${iframeAttempts})`);
                        break;
                    }
                    else {
                        throw new Error("iframe contentFrame을 가져올 수 없습니다.");
                    }
                }
                catch (iframeError) {
                    clog(`❌ iframe 로딩 실패 (시도 ${iframeAttempts}):`, iframeError.message);
                    if (iframeAttempts === maxIframeAttempts) {
                        throw new Error(`iframe 로딩 실패 (${maxIframeAttempts}번 시도): ${iframeError.message}`);
                    }
                    // 재시도 전 페이지 새로고침
                    await page.reload({
                        waitUntil: "domcontentloaded",
                        timeout: 60000,
                    });
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
            }
            if (!frame)
                throw new Error("iframe을 찾을 수 없습니다.");
            let blogLinks = [];
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    clog(`[시도 ${attempt}] 블로그 리뷰 탭 클릭 및 링크 추출 시작`);
                    if (attempt === 1) {
                        clog("⚙️ Iframe 초기화 시작 (방문자 리뷰 탭 클릭)");
                        const visitorTabXPath = "//a[@role='tab' and (contains(., '리뷰') or contains(., '방문자'))]";
                        try {
                            await frame.waitForXPath(visitorTabXPath, { timeout: 20000 }); // 20초로 증가
                            const [visitorTabElement] = await frame.$x(visitorTabXPath);
                            if (visitorTabElement) {
                                await visitorTabElement.click();
                                clog("👍 Iframe 초기화 완료");
                                await frame.waitForTimeout(3000); // 3초로 증가
                            }
                            else {
                                clog("⚠️ Iframe 초기화 실패 (방문자 리뷰 탭을 찾을 수 없음)");
                            }
                        }
                        catch (visitorTabError) {
                            clog("⚠️ 방문자 리뷰 탭 클릭 실패:", visitorTabError.message);
                            // 실패해도 계속 진행
                        }
                    }
                    const blogTabXPath = "//a[@role='tab' and contains(., '블로그')]";
                    clog("🔍 블로그 탭 검색 중...");
                    // 블로그 탭이 존재하는지 먼저 확인
                    try {
                        await frame.waitForXPath(blogTabXPath, { timeout: 20000 });
                        const [blogTabElement] = await frame.$x(blogTabXPath);
                        if (blogTabElement) {
                            await blogTabElement.click();
                            clog("🖱️ 블로그 리뷰 탭 클릭 성공");
                        }
                        else {
                            throw new Error("블로그 리뷰 탭을 찾을 수 없습니다.");
                        }
                    }
                    catch (tabError) {
                        clog(`⚠️ 블로그 탭을 찾을 수 없음: ${tabError.message}`);
                        // 블로그 탭이 없는 경우 빈 배열로 처리하고 종료
                        if (attempt === 5) {
                            clog("⚠️ 블로그 리뷰 탭이 존재하지 않는 장소입니다. 빈 결과로 처리합니다.");
                            blogLinks = [];
                            break;
                        }
                        throw tabError;
                    }
                    clog("⏳ 블로그 리뷰 로딩 대기 중...");
                    await frame.waitForTimeout(5000); // 5초로 증가
                    clog("🔍 블로그 링크 컨테이너 검색 중...");
                    // 블로그 링크 컨테이너가 존재하는지 확인
                    try {
                        await frame.waitForSelector(".EblIP", { timeout: 20000 });
                        const extractedLinks = await frame.evaluate(() => {
                            const elements = Array.from(document.getElementsByClassName("EblIP"));
                            const urls = [];
                            for (const el of elements) {
                                const aTag = el.querySelector("a");
                                const href = (aTag === null || aTag === void 0 ? void 0 : aTag.href) || "";
                                if (aTag &&
                                    aTag instanceof HTMLAnchorElement &&
                                    href &&
                                    !href.includes("cafe.naver.com")) {
                                    urls.push(href);
                                }
                            }
                            return urls;
                        });
                        if (extractedLinks.length > 0) {
                            blogLinks = extractedLinks;
                            clog(`✅ [시도 ${attempt}] 블로그 링크 ${blogLinks.length}개 추출 성공`);
                            break;
                        }
                        else {
                            clog("⚠️ 블로그 링크 컨테이너는 찾았지만, 링크가 비어있습니다.");
                            // 빈 링크인 경우도 정상적으로 처리
                            if (attempt === 5) {
                                blogLinks = [];
                                break;
                            }
                            throw new Error("블로그 링크가 비어있습니다.");
                        }
                    }
                    catch (selectorError) {
                        clog(`⚠️ 블로그 링크 컨테이너를 찾을 수 없음: ${selectorError.message}`);
                        if (attempt === 5) {
                            clog("⚠️ 블로그 리뷰가 없는 장소입니다. 빈 결과로 처리합니다.");
                            blogLinks = [];
                            break;
                        }
                        throw selectorError;
                    }
                }
                catch (e) {
                    clog(`❌ [시도 ${attempt}] 실패: ${e.message}`);
                    if (attempt === 5) {
                        clog("⚠️ 최종 시도 실패. 블로그 리뷰가 없는 것으로 처리합니다.");
                        blogLinks = [];
                        break;
                    }
                    await page.waitForTimeout(2000 + attempt * 1000);
                }
            }
            clog(`🔗 블로그 리뷰 링크 ${blogLinks.length}개 수집됨`);
            const blogReviews = [];
            // 개별 블로그 추출 함수 (재시도 로직 포함)
            const extractBlogContent = async (url, maxRetries = 3) => {
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    let blogPage;
                    try {
                        clog(`📖 [시도 ${attempt}/${maxRetries}] 블로그 내용 추출: ${url.slice(0, 50)}...`);
                        blogPage = await browser.newPage();
                        await blogPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                        await blogPage.goto(url, {
                            waitUntil: "domcontentloaded",
                            timeout: 20000,
                        });
                        const iframeElement = await blogPage.$("iframe");
                        if (iframeElement) {
                            const src = await iframeElement.evaluate((el) => el.getAttribute("src"));
                            if (src && src.startsWith("/")) {
                                const realUrl = "https://blog.naver.com" + src;
                                await blogPage.goto(realUrl, {
                                    waitUntil: "domcontentloaded",
                                    timeout: 20000,
                                });
                            }
                        }
                        await blogPage.waitForSelector("div.se-main-container, div#postViewArea", { timeout: 20000 });
                        for (let i = 0; i < 5; i++) {
                            await blogPage.evaluate(() => window.scrollBy(0, window.innerHeight));
                            await blogPage.waitForTimeout(500);
                        }
                        const text = await blogPage.evaluate(() => {
                            const se = document.querySelector("div.se-main-container");
                            if (se)
                                return se.innerText
                                    .replace(/\n/g, " ")
                                    .trim();
                            const legacy = document.querySelector("div#postViewArea");
                            if (legacy)
                                return legacy.innerText
                                    .replace(/\n/g, " ")
                                    .trim();
                            return "";
                        });
                        await blogPage.close();
                        if (text && text.length > 50) {
                            // 최소 길이 체크
                            clog(`✅ [시도 ${attempt}] 블로그 내용 추출 성공: ${url.slice(0, 40)}...`);
                            return text;
                        }
                        else {
                            throw new Error("추출된 텍스트가 너무 짧거나 비어있습니다.");
                        }
                    }
                    catch (e) {
                        clog(`❌ [시도 ${attempt}/${maxRetries}] 블로그 추출 실패: ${url.slice(0, 40)}... - ${e.message}`);
                        if (blogPage) {
                            try {
                                await blogPage.close();
                            }
                            catch (closeError) {
                                clog(`⚠️ 페이지 종료 실패:`, closeError);
                            }
                        }
                        if (attempt === maxRetries) {
                            clog(`🔥 최종 실패: ${url} (${maxRetries}번 시도 후 포기)`);
                            return null;
                        }
                        // 재시도 전 대기 (지수 백오프)
                        const delay = 2000 * attempt;
                        clog(`⏳ ${delay}ms 후 재시도...`);
                        await new Promise((resolve) => setTimeout(resolve, delay));
                    }
                }
                return null;
            };
            // 블로그 링크가 없는 경우 빈 결과 반환
            if (blogLinks.length === 0) {
                clog("⚠️ 블로그 리뷰 링크가 없습니다. 빈 결과를 반환합니다.");
                res.status(200).json({
                    blogReviews: [],
                    blogReviewCount: 0,
                });
                return;
            }
            const totalBlogCount = Math.min(blogLinks.length, 10);
            clog(`📚 총 ${totalBlogCount}개 블로그에서 내용 추출 시작`);
            // 모든 블로그 링크에 대해 재시도 로직 적용
            for (let i = 0; i < totalBlogCount; i++) {
                const url = blogLinks[i];
                const content = await extractBlogContent(url);
                if (content) {
                    blogReviews.push(content);
                    clog(`📝 [블로그 본문 추출 완료] 총 ${totalBlogCount}개 중 ${blogReviews.length}개 추출 완료`);
                }
                else {
                    clog(`⚠️ [블로그 본문 추출 실패] ${url.slice(0, 40)}... - 건너뛰고 다음 블로그로 진행`);
                }
            }
            // 추출된 블로그가 없어도 에러가 아닌 빈 결과로 처리
            if (blogReviews.length === 0) {
                clog("⚠️ 모든 블로그에서 내용 추출에 실패했습니다. 빈 결과를 반환합니다.");
                // 빈 결과도 로깅에 기록
                if (requestId) {
                    await logger.updateBlogCrawling(requestId, {
                        crawledUrls: blogLinks.slice(0, 10),
                        reviewCount: 0,
                        reviews: [],
                        processingTime: Date.now() - startTime,
                        requestDate
                    });
                }
                res.status(200).json({
                    blogReviews: [],
                    blogReviewCount: 0,
                    crawlingData: {
                        requestId,
                        requestDate,
                        placeId: extractPlaceId(inputUrl),
                        crawlingUrl: inputUrl,
                        reviewCount: 0,
                        reviews: [],
                        blogLinks: blogLinks.slice(0, 10),
                        processingTime: Date.now() - startTime,
                        timestamp: new Date().toISOString()
                    }
                });
                return;
            }
            clog(`✅ 블로그 리뷰 ${blogReviews.length}개 추출됨`);
            // 일자별 크롤링 데이터 저장
            const crawlingData = {
                requestId,
                requestDate,
                placeId: extractPlaceId(inputUrl),
                crawlingUrl: inputUrl,
                reviewCount: blogReviews.length,
                reviews: (0, logger_1.truncateArray)(blogReviews, 5),
                blogLinks: blogLinks.slice(0, 10),
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
            // 성공 로깅 (일자별로 저장)
            if (requestId) {
                await logger.updateBlogCrawling(requestId, {
                    crawledUrls: blogLinks.slice(0, 10), // 최대 10개 URL만 로깅
                    reviewCount: blogReviews.length,
                    reviews: (0, logger_1.truncateArray)(blogReviews, 5), // 최대 5개 리뷰만 로깅
                    processingTime: Date.now() - startTime,
                    requestDate
                });
            }
            res.status(200).json({
                blogReviews,
                blogReviewCount: blogReviews.length,
                crawlingData // 크롤링 메타데이터 포함
            });
        }
        catch (err) {
            clog("🔥 처리 실패:", err);
            // 에러 로깅 (일자별로 저장)
            if (requestId) {
                await logger.updateBlogCrawling(requestId, {
                    crawlingError: err.message,
                    processingTime: Date.now() - startTime,
                    requestDate
                });
            }
            res.status(500).json({
                error: "블로그 리뷰 수집에 실패했습니다.",
                detail: err.message,
            });
        }
        finally {
            if (browser) {
                await browser.close();
                clog("🧹 Browser closed");
            }
        }
    });
});
//# sourceMappingURL=crawlBlogReviews.js.map
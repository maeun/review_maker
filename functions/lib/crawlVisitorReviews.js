"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlVisitorReviews = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors = require("cors");
const logger_1 = require("./utils/logger");
const dateUtils_1 = require("./utils/dateUtils");
const firestoreLogger_1 = require("./utils/firestoreLogger");
const clog = (...args) => console.log("[crawlVisitorReviews]", ...args);
const corsMiddleware = cors({
    origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});
function extractPlaceId(url) {
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
}
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
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3",
                    "Accept-Encoding": "gzip, deflate, br",
                    Connection: "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get("location");
                if (location) {
                    finalUrl = new URL(location, finalUrl).href;
                    clog(`➡️ 리다이렉트됨: ${finalUrl}`);
                    continue;
                }
            }
            break;
        }
        catch (error) {
            clog(`⚠️ 리다이렉트 시도 ${attempts} 실패:`, error.message);
            if (attempts === maxAttempts) {
                throw new Error(`단축 URL 확인 실패: ${error.message}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    clog(`✅ 최종 URL: ${finalUrl}`);
    return finalUrl;
}
// 브라우저 실행 안정성 개선을 위한 재시도 로직
async function launchBrowserWithRetry(chromium, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            clog(`🌐 브라우저 실행 시도 ${attempt}/${maxAttempts}`);
            const browser = await chromium.puppeteer.launch({
                args: [
                    ...chromium.args,
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--disable-gpu-sandbox",
                    "--memory-pressure-off",
                    "--single-process",
                    "--no-zygote",
                ],
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath,
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
            clog(`✅ 브라우저 실행 성공 (시도 ${attempt})`);
            return browser;
        }
        catch (error) {
            clog(`❌ 브라우저 실행 실패 (시도 ${attempt}):`, error.message);
            if (attempt === maxAttempts) {
                throw new Error(`브라우저 실행 실패 (${maxAttempts}회 시도): ${error.message}`);
            }
            // 지수 백오프 대기
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            clog(`⏱️ ${delay}ms 후 재시도...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw new Error("브라우저 실행 실패");
}
exports.crawlVisitorReviews = (0, https_1.onRequest)({
    memory: "4GiB",
    timeoutSeconds: 180,
    maxInstances: 5,
}, (req, res) => {
    corsMiddleware(req, res, async () => {
        const startTime = Date.now();
        const requestDate = (0, dateUtils_1.getCurrentDateString)(); // 요청 날짜 생성
        // 로깅 정보 추출
        const requestId = req.headers['x-request-id'];
        const logger = logger_1.ReviewLogger.getInstance();
        if (req.method !== "GET") {
            if (requestId) {
                await logger.logError(requestId, "GET 요청만 허용됩니다.", requestDate);
            }
            res.status(405).json({ error: "GET 요청만 허용됩니다." });
            return;
        }
        const url = req.query.url;
        if (!url) {
            if (requestId) {
                await logger.logError(requestId, "URL 파라미터가 필요합니다.", requestDate);
            }
            res.status(400).json({ error: "URL 파라미터가 필요합니다." });
            return;
        }
        let browser = null;
        try {
            clog("🚀 방문자 리뷰 크롤링 시작");
            clog(`📍 요청 URL: ${url}`);
            clog(`📅 요청 날짜: ${requestDate}`);
            // URL 처리
            let targetUrl = await resolveShortUrl(url);
            // PlaceID 추출
            const placeId = extractPlaceId(targetUrl);
            if (!placeId) {
                const errorMsg = "올바른 네이버 지도 URL이 아닙니다.";
                if (requestId) {
                    await logger.updateRequestInfo(requestId, {
                        crawlingUrl: targetUrl,
                        requestDate
                    });
                    await logger.logError(requestId, errorMsg, requestDate);
                }
                res.status(400).json({ error: errorMsg });
                return;
            }
            clog(`🏢 PlaceID: ${placeId}`);
            // 요청 정보 업데이트 (일자별로 저장)
            if (requestId) {
                await logger.updateRequestInfo(requestId, {
                    placeId,
                    crawlingUrl: targetUrl,
                    requestDate
                });
            }
            // 크롤링 시작
            const chromium = require("chrome-aws-lambda");
            browser = await launchBrowserWithRetry(chromium);
            const page = await browser.newPage();
            // 리소스 차단으로 속도 향상
            await page.setRequestInterception(true);
            page.on("request", (req) => {
                if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
                    req.abort();
                }
                else {
                    req.continue();
                }
            });
            await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1");
            await page.setViewport({ width: 375, height: 667 });
            clog(`🔍 페이지 로딩 중: ${targetUrl}`);
            await page.goto(targetUrl, {
                waitUntil: "networkidle0",
                timeout: 60000,
            });
            // 시스템 안정화를 위한 의도적 지연
            const stabilizationDelay = Math.floor(Math.random() * 3000) + 2000;
            clog(`⏱️ 시스템 안정화 대기: ${stabilizationDelay}ms`);
            await new Promise((resolve) => setTimeout(resolve, stabilizationDelay));
            // iframe 처리
            const frames = page.frames();
            let targetFrame = page;
            for (const frame of frames) {
                try {
                    const frameUrl = frame.url();
                    if (frameUrl && frameUrl.includes("place")) {
                        targetFrame = frame;
                        clog(`🖼️ iframe 감지: ${frameUrl}`);
                        break;
                    }
                }
                catch (err) {
                    continue;
                }
            }
            // 리뷰 섹션으로 스크롤
            try {
                await targetFrame.evaluate(() => {
                    const reviewSection = document.querySelector('.pui__vn15t2, [data-testid="review-item"], .review_item, .visitor-review, .review-content, .Lia3P, .YeINN');
                    if (reviewSection) {
                        reviewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
            catch (scrollError) {
                clog("⚠️ 리뷰 섹션 스크롤 실패:", scrollError);
            }
            // 추가 스크롤로 더 많은 리뷰 로드
            for (let i = 0; i < 3; i++) {
                await targetFrame.evaluate(() => window.scrollBy(0, 800));
                await targetFrame.waitForTimeout(2000);
            }
            // 리뷰 추출 함수 (재시도 로직 포함)
            const extractReviewsWithRetry = async (maxRetries = 3) => {
                const selectors = [
                    ".pui__vn15t2",
                    "[data-testid='review-item']",
                    ".review_item",
                    ".visitor-review",
                    ".review-content",
                    ".Lia3P",
                    ".YeINN"
                ];
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    clog(`🔍 리뷰 추출 시도 ${attempt}/${maxRetries}`);
                    let reviews = [];
                    let usedSelector = "";
                    for (const selector of selectors) {
                        try {
                            const elements = await targetFrame.$$(selector);
                            if (elements.length > 0) {
                                clog(`✅ 셀렉터 성공: ${selector} (${elements.length}개 요소) - 시도 ${attempt}`);
                                for (const element of elements) {
                                    try {
                                        const text = await element.evaluate((el) => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(); });
                                        if (text && text.length > 10 && text.length < 500) {
                                            reviews.push(text);
                                        }
                                    }
                                    catch (err) {
                                        continue;
                                    }
                                }
                                usedSelector = selector;
                                break;
                            }
                        }
                        catch (err) {
                            clog(`⚠️ 셀렉터 ${selector} 실패 (시도 ${attempt}):`, err.message);
                            continue;
                        }
                    }
                    if (reviews.length > 0) {
                        clog(`✅ 리뷰 추출 성공: ${reviews.length}개 (시도 ${attempt})`);
                        return { reviews, usedSelector };
                    }
                    if (attempt < maxRetries) {
                        // 재시도 전 페이지 새로고침 및 대기
                        const retryDelay = 3000 + (attempt * 2000); // 3초, 5초, 7초...
                        clog(`🔄 리뷰 추출 실패. ${retryDelay}ms 후 재시도... (시도 ${attempt}/${maxRetries})`);
                        try {
                            // 페이지 새로고침
                            await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
                            clog(`🔄 페이지 새로고침 완료 (시도 ${attempt})`);
                            // iframe 다시 찾기
                            const frames = page.frames();
                            for (const frame of frames) {
                                try {
                                    const frameUrl = frame.url();
                                    if (frameUrl && frameUrl.includes("place")) {
                                        targetFrame = frame;
                                        clog(`🖼️ iframe 재감지: ${frameUrl} (시도 ${attempt})`);
                                        break;
                                    }
                                }
                                catch (err) {
                                    continue;
                                }
                            }
                            // 안정화 대기
                            await new Promise((resolve) => setTimeout(resolve, retryDelay));
                            // 리뷰 섹션으로 다시 스크롤
                            try {
                                await targetFrame.evaluate(() => {
                                    const reviewSection = document.querySelector('.pui__vn15t2, [data-testid="review-item"], .review_item, .visitor-review, .review-content, .Lia3P, .YeINN');
                                    if (reviewSection) {
                                        reviewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                });
                                await new Promise((resolve) => setTimeout(resolve, 2000));
                            }
                            catch (scrollError) {
                                clog(`⚠️ 리뷰 섹션 스크롤 실패 (시도 ${attempt}):`, scrollError);
                            }
                            // 추가 스크롤로 더 많은 리뷰 로드
                            for (let i = 0; i < 3; i++) {
                                await targetFrame.evaluate(() => window.scrollBy(0, 800));
                                await targetFrame.waitForTimeout(2000);
                            }
                        }
                        catch (reloadError) {
                            clog(`❌ 페이지 새로고침 실패 (시도 ${attempt}):`, reloadError.message);
                            // 새로고침 실패해도 계속 진행
                            await new Promise((resolve) => setTimeout(resolve, retryDelay));
                        }
                    }
                }
                return { reviews: [], usedSelector: "" };
            };
            // 재시도 로직을 포함한 리뷰 추출 실행
            const { reviews: rawReviews, usedSelector } = await extractReviewsWithRetry(3);
            // 중복 제거 및 정리
            const reviews = [...new Set(rawReviews)].filter(review => review.length >= 10 &&
                review.length <= 500 &&
                !review.includes('로그인') &&
                !review.includes('회원가입'));
            clog(`📝 추출된 리뷰 수: ${reviews.length}`);
            clog(`🎯 사용된 셀렉터: ${usedSelector}`);
            if (reviews.length === 0) {
                const errorMsg = "방문자 리뷰를 가져올 수 없습니다. 3회 재시도 후에도 실패했습니다.";
                if (requestId) {
                    await logger.updateRequestInfo(requestId, {
                        crawlingUrl: `${targetUrl} (셀렉터: ${usedSelector || '모든 셀렉터 실패'}, 3회 재시도 실패)`,
                        requestDate
                    });
                    await logger.logError(requestId, errorMsg, requestDate);
                }
                res.status(500).json({
                    error: errorMsg,
                    detail: `사용된 셀렉터: ${usedSelector || '없음'} (3회 재시도 실패)`,
                    placeId,
                    retryAttempts: 3
                });
                return;
            }
            // 일자별 크롤링 데이터 저장
            const crawlingData = {
                requestId,
                requestDate,
                placeId,
                crawlingUrl: targetUrl,
                reviewCount: reviews.length,
                reviews: (0, logger_1.truncateArray)(reviews, 30),
                usedSelector,
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
            // Firebase에 일자별로 크롤링 데이터 저장
            if (requestId) {
                await logger.updateRequestInfo(requestId, {
                    crawlingUrl: `${targetUrl} (${usedSelector})`,
                    requestDate
                });
                // Firestore에 크롤링 정보 저장
                const firestoreLogger = firestoreLogger_1.FirestoreLogger.getInstance();
                await firestoreLogger.updateCrawlingInfo(requestId, placeId, targetUrl);
                // 방문자 리뷰 크롤링 데이터 저장
                await firestoreLogger.updateVisitorReviewData(requestId, {
                    referenceReviewCount: reviews.length,
                    referenceReviews: (0, logger_1.truncateArray)(reviews, 30),
                    crawlingSuccess: true,
                    processingTimeSeconds: Math.round((Date.now() - startTime) / 1000)
                });
            }
            const response = {
                visitorReviews: reviews,
                visitorReviewCount: reviews.length,
                placeId,
                crawlingData // 크롤링 메타데이터 포함
            };
            res.status(200).json(response);
            clog(`✅ 방문자 리뷰 크롤링 완료: ${reviews.length}개 (${Date.now() - startTime}ms)`);
        }
        catch (error) {
            clog("❌ 크롤링 중 오류 발생:", error.message);
            if (requestId) {
                await logger.logError(requestId, `크롤링 실패: ${error.message}`, requestDate);
                // Firestore에 에러 로깅
                const firestoreLogger = firestoreLogger_1.FirestoreLogger.getInstance();
                await firestoreLogger.updateVisitorReviewData(requestId, {
                    crawlingSuccess: false,
                    errorMessage: `크롤링 실패: ${error.message}`
                });
                await firestoreLogger.logError(requestId, 'visitor', `크롤링 실패: ${error.message}`);
            }
            res.status(500).json({
                error: "방문자 리뷰 크롤링 중 오류가 발생했습니다.",
                detail: error.message,
                requestDate
            });
        }
        finally {
            if (browser) {
                try {
                    await browser.close();
                    clog("🔒 브라우저 종료 완료");
                }
                catch (closeError) {
                    clog("⚠️ 브라우저 종료 중 오류:", closeError);
                }
            }
        }
    });
});
//# sourceMappingURL=crawlVisitorReviews.js.map
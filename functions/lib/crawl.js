"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlReviews = void 0;
const puppeteer_1 = require("puppeteer");
// placeId 추출 함수
function extractPlaceId(url) {
    const match = url.match(/place\/(\d+)/);
    return match ? match[1] : null;
}
async function crawlReviews(placeId) {
    // placeId가 URL 형태로 들어온 경우 숫자만 추출
    if (placeId && typeof placeId === "string" && !/^\d+$/.test(placeId)) {
        const extracted = extractPlaceId(placeId);
        if (!extracted) {
            throw new Error("유효한 placeId를 추출할 수 없습니다.");
        }
        placeId = extracted;
    }
    let browser;
    try {
        browser = await puppeteer_1.default.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-web-security",
                "--disable-features=VizDisplayCompositor",
            ],
        });
        const page = await browser.newPage();
        // User-Agent 설정
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        await page.goto(`https://map.naver.com/p/entry/place/${placeId}`, {
            waitUntil: "networkidle2",
            timeout: 30000,
        });
        // 페이지 로딩 대기
        await page.waitForTimeout(3000);
        // entryIframe 진입
        const entryFrameElement = await page.waitForSelector("#entryIframe", {
            timeout: 10000,
        });
        if (!entryFrameElement) {
            throw new Error("entryIframe element를 찾을 수 없습니다.");
        }
        const entryFrame = await entryFrameElement.contentFrame();
        if (!entryFrame) {
            throw new Error("entryIframe을 찾을 수 없습니다.");
        }
        // 방문자 리뷰 크롤링
        let visitorReviews = [];
        try {
            // 리뷰 탭 찾기 및 클릭 (iframe 내부)
            await entryFrame.waitForSelector(".veBoZ", { timeout: 10000 });
            const tabButtons = await entryFrame.$$(".veBoZ");
            for (const btn of tabButtons) {
                const text = await btn.evaluate((el) => el.textContent);
                if (text && text.includes("리뷰")) {
                    await btn.click();
                    break;
                }
            }
            // 탭 전환 대기
            await entryFrame.waitForTimeout(2000);
            // 방문자 리뷰 추출 (iframe 내부)
            visitorReviews = await entryFrame.evaluate(() => {
                const nodes = document.querySelectorAll(".pui__vn15t2");
                return Array.from(nodes)
                    .map((el) => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ""; })
                    .filter(Boolean);
            });
            console.log(`방문자 리뷰 ${visitorReviews.length}개 추출됨`);
        }
        catch (e) {
            console.log("방문자 리뷰 크롤링 실패:", e);
            throw new Error("방문자 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 리뷰를 확인해주세요.");
        }
        // 블로그 리뷰 크롤링
        let blogReviews = [];
        try {
            // 블로그 리뷰 탭 클릭 (iframe 내부, XPATH 사용)
            const blogTabBtnHandles = await entryFrame.$x("/html/body/div[3]/div/div/div/div[6]/div[2]/div/a[2]");
            if (blogTabBtnHandles.length > 0) {
                await blogTabBtnHandles[0].click();
            }
            else {
                throw new Error("블로그 리뷰 탭을 찾을 수 없습니다.");
            }
            // 블로그 리뷰 카드 로딩 대기 (EblIP)
            await entryFrame.waitForSelector(".EblIP", { timeout: 10000 });
            // 블로그 리뷰 카드에서 a 태그 href 추출
            const blogLinks = await entryFrame.evaluate(() => {
                const elements = Array.from(document.querySelectorAll(".EblIP a"));
                return elements
                    .map((el) => el.href)
                    .filter(Boolean);
            });
            // 각 블로그 리뷰 링크에서 본문 텍스트 추출
            for (const url of blogLinks.slice(0, 10)) {
                try {
                    const blogPage = await browser.newPage();
                    await blogPage.goto(url, {
                        waitUntil: "domcontentloaded",
                        timeout: 20000,
                    });
                    // 블로그 본문 iframe이 있으면 src로 재접속
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
                    // 본문 텍스트 추출
                    const text = await blogPage.evaluate(() => {
                        var _a, _b;
                        const se = document.querySelector("div.se-main-container");
                        if (se)
                            return ((_a = se.textContent) === null || _a === void 0 ? void 0 : _a.replace(/\n/g, "").trim()) || "";
                        const legacy = document.querySelector("div#postViewArea");
                        if (legacy)
                            return ((_b = legacy.textContent) === null || _b === void 0 ? void 0 : _b.replace(/\n/g, "").trim()) || "";
                        return "네이버 블로그는 맞지만, 확인불가";
                    });
                    if (text && text.length > 10)
                        blogReviews.push(text);
                    await blogPage.close();
                }
                catch (err) {
                    // 개별 블로그 실패는 무시
                }
            }
            console.log(`블로그 리뷰 ${blogReviews.length}개 추출됨`);
        }
        catch (e) {
            console.log("블로그 리뷰 크롤링 실패:", e);
            throw new Error("블로그 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 블로그 리뷰를 확인해주세요.");
        }
        // 최소한의 리뷰가 있는지 확인
        if (visitorReviews.length === 0) {
            throw new Error("방문자 리뷰가 없습니다. 다른 장소를 시도해주세요.");
        }
        if (blogReviews.length === 0) {
            throw new Error("블로그 리뷰가 없습니다. 다른 장소를 시도해주세요.");
        }
        return {
            visitorReviews,
            blogReviews,
            visitorReviewCount: visitorReviews.length,
            blogReviewCount: blogReviews.length,
        };
    }
    catch (e) {
        console.error("크롤링 오류:", e);
        throw e;
    }
    finally {
        if (browser)
            await browser.close();
    }
}
exports.crawlReviews = crawlReviews;
//# sourceMappingURL=crawl.js.map
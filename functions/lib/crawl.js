"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawl = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
function extractPlaceId(url) {
    const match = url.match(/place\/(\d+)/);
    return match ? match[1] : null;
}
exports.crawl = functions.onRequest({
    memory: "2GiB",
    timeoutSeconds: 540,
    maxInstances: 1
}, async (req, res) => {
    const allowedOrigins = [
        'https://review-maker-nvr.web.app',
        'http://localhost:3000'
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    }
    else {
        res.set('Access-Control-Allow-Origin', 'https://review-maker-nvr.web.app');
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    const inputUrl = req.query.url;
    if (!inputUrl) {
        res.status(400).json({ error: "url 파라미터가 필요합니다." });
        return;
    }
    const placeId = extractPlaceId(inputUrl);
    if (!placeId) {
        res.status(400).json({ error: "placeId를 url에서 추출할 수 없습니다." });
        return;
    }
    const targetUrl = `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,2,dh&placePath=/review`;
    let browser;
    try {
        const chromiumModule = await Promise.resolve().then(() => __importStar(require("chrome-aws-lambda")));
        const chromium = chromiumModule.default;
        console.log(`🧭 Crawling 시작: placeId=${placeId}`);
        console.log(`🎯 대상 URL: ${targetUrl}`);
        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            timeout: 30000,
        });
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        await page.setExtraHTTPHeaders({ 'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' });
        await page.setViewport({ width: 1280, height: 800 });
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
                req.abort();
            }
            else {
                req.continue();
            }
        });
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("#entryIframe", { timeout: 30000 });
        const iframe = await page.$("#entryIframe");
        const frame = await iframe.contentFrame();
        if (!frame)
            throw new Error("iframe을 찾을 수 없습니다.");
        // 방문자 리뷰 수집
        let visitorReviews = [];
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                await frame.waitForSelector("a[role='tab']", { timeout: 15000 });
                const tabButtons = await frame.$$("a[role='tab']");
                let reviewTabClicked = false;
                for (const btn of tabButtons) {
                    const text = await btn.evaluate((el) => el.textContent);
                    if (text && (text.includes("리뷰") || text.includes("방문자"))) {
                        await btn.click();
                        reviewTabClicked = true;
                        break;
                    }
                }
                if (!reviewTabClicked)
                    throw new Error("리뷰 탭을 찾을 수 없습니다.");
                await frame.waitForTimeout(3000);
                for (let i = 0; i < 3; i++) {
                    await frame.evaluate(() => window.scrollBy(0, 800));
                    await frame.waitForTimeout(2000);
                }
                visitorReviews = await frame.evaluate(() => {
                    const selectors = [
                        ".pui__vn15t2",
                        "[data-testid='review-item']",
                        ".review_item",
                        ".visitor-review",
                        ".review-content"
                    ];
                    for (const selector of selectors) {
                        const nodes = document.querySelectorAll(selector);
                        if (nodes.length > 0) {
                            return Array.from(nodes)
                                .map((el) => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ""; })
                                .filter(Boolean);
                        }
                    }
                    return [];
                });
                console.log(`✅ [시도 ${attempt}] 방문자 리뷰 ${visitorReviews.length}개 추출됨`);
                console.log(visitorReviews.map((v, i) => `리뷰 ${i + 1}: ${v}`).join("\n"));
                if (visitorReviews.length > 0)
                    break;
            }
            catch (e) {
                console.log(`[시도 ${attempt}] 리뷰 수집 실패:`, e);
                await frame.waitForTimeout(2000);
            }
        }
        if (visitorReviews.length === 0) {
            throw new Error("방문자 리뷰를 가져올 수 없습니다.");
        }
        const blogReviews = [];
        let blogLinks = [];
        try {
            const blogTabXPath = "/html/body/div[3]/div/div/div[7]/div[2]/div/a[2]";
            const [blogTabElement] = await frame.$x(blogTabXPath);
            if (blogTabElement) {
                await blogTabElement.click();
                await frame.waitForTimeout(3000);
            }
            await frame.waitForSelector(".EblIP", { timeout: 30000 });
            blogLinks = await frame.evaluate(() => {
                const elements = Array.from(document.getElementsByClassName("EblIP"));
                const urls = [];
                for (const el of elements) {
                    const aTag = el.querySelector("a");
                    const href = (aTag === null || aTag === void 0 ? void 0 : aTag.href) || "";
                    if (aTag && aTag instanceof HTMLAnchorElement && href && !href.includes("cafe.naver.com")) {
                        urls.push(href);
                    }
                }
                return urls;
            });
            console.log(`🔗 블로그 리뷰 링크 ${blogLinks.length}개 수집됨`);
            console.log(blogLinks.join("\n"));
            for (const url of blogLinks.slice(0, 10)) {
                try {
                    const blogPage = await browser.newPage();
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
                    await blogPage.waitForSelector("div.se-main-container, div#postViewArea", {
                        timeout: 20000,
                    });
                    for (let i = 0; i < 10; i++) {
                        await blogPage.evaluate(() => window.scrollBy(0, 1000));
                        await blogPage.waitForTimeout(1000);
                    }
                    const text = await blogPage.evaluate(() => {
                        const se = document.querySelector("div.se-main-container");
                        if (se)
                            return se.innerText.replace(/\n/g, " ").trim();
                        const legacy = document.querySelector("div#postViewArea");
                        if (legacy)
                            return legacy.innerText.replace(/\n/g, " ").trim();
                        return "네이버 블로그는 맞지만, 확인불가";
                    });
                    blogReviews.push(text);
                    console.log(`📝 [블로그 본문 추출 완료] ${url}\n${text.slice(0, 200)}...`);
                    await blogPage.close();
                }
                catch (e) {
                    console.log(`❌ [블로그 본문 크롤링 실패] ${url}`, e);
                }
            }
        }
        catch (e) {
            console.log("❗ 블로그 리뷰 크롤링 전체 실패:", e);
        }
        let generatedReview = null;
        try {
            const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
            console.log("🚀 generate 호출 요청 프롬프트:");
            console.log("visitorReviews (상위 5개):", visitorReviews.join("\n"));
            console.log("blogReviews (상위 2개):", blogReviews.join("\n"));
            const genRes = await fetch('https://us-central1-review-maker-nvr.cloudfunctions.net/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitorReviews, blogReviews })
            });
            if (genRes.ok) {
                generatedReview = await genRes.json();
                console.log("✅ generate 응답 결과:\n", JSON.stringify(generatedReview, null, 2));
            }
            else {
                const errorText = await genRes.text();
                console.error("❌ generate 호출 실패 응답:\n", errorText);
            }
        }
        catch (e) {
            console.error("❌ generate 호출 중 예외 발생:", e);
        }
        res.status(200).json({
            visitorReviews,
            blogLinks,
            blogReviews,
            visitorReviewCount: visitorReviews.length,
            blogReviewCount: blogReviews.length,
            generatedReview,
        });
    }
    catch (err) {
        console.error("🔥 크롤링 실패:", err);
        res.status(500).json({
            error: "크롤링에 실패했습니다.",
            detail: err.message,
            placeId,
            targetUrl
        });
    }
    finally {
        if (browser) {
            try {
                await browser.close();
                console.log('🧹 Browser closed');
            }
            catch (e) {
                console.error('❗ Browser close 실패:', e);
            }
        }
    }
});
//# sourceMappingURL=crawl.js.map
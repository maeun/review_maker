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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlVisitorReviews = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors = require("cors");
const clog = (...args) => console.log("[crawlVisitorReviews]", ...args);
const corsMiddleware = cors({
    origin: [
        'https://review-maker-nvr.web.app',
        'http://localhost:3000'
    ],
});
function extractPlaceId(url) {
    const match = url.match(/place\/(\d+)/);
    return match ? match[1] : null;
}
exports.crawlVisitorReviews = (0, https_1.onRequest)({
    memory: "2GiB",
    timeoutSeconds: 180,
    maxInstances: 5
}, (req, res) => {
    corsMiddleware(req, res, async () => {
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
            clog(`🧭 Crawling 시작: placeId=${placeId}`);
            clog(`🎯 대상 URL: ${targetUrl}`);
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
                            clog('✅ 리뷰 탭 클릭 성공');
                            break;
                        }
                    }
                    if (!reviewTabClicked)
                        throw new Error("리뷰 탭을 찾을 수 없습니다.");
                    await frame.waitForTimeout(3000);
                    clog("📜 스크롤 시작");
                    for (let i = 0; i < 3; i++) {
                        await frame.evaluate(() => window.scrollBy(0, 800));
                        await frame.waitForTimeout(2000);
                        clog(`📜 스크롤 ${i + 1}/3 완료`);
                    }
                    clog("📜 스크롤 완료");
                    visitorReviews = await frame.evaluate(() => {
                        const selectors = [
                            ".pui__vn15t2",
                            "[data-testid='review-item']",
                            ".review_item",
                            ".visitor-review",
                            ".review-content",
                            ".Lia3P",
                            ".YeINN"
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
                    clog(`✅ [시도 ${attempt}] 방문자 리뷰 ${visitorReviews.length}개 추출됨`);
                    if (visitorReviews.length > 0)
                        break;
                }
                catch (e) {
                    clog(`[시도 ${attempt}] 리뷰 수집 실패:`, e);
                    await frame.waitForTimeout(2000);
                }
            }
            if (visitorReviews.length === 0) {
                throw new Error("방문자 리뷰를 가져올 수 없습니다.");
            }
            res.status(200).json({
                visitorReviews,
                visitorReviewCount: visitorReviews.length,
                placeId,
            });
        }
        catch (err) {
            clog("🔥 처리 실패:", err);
            res.status(500).json({
                error: "방문자 리뷰 수집에 실패했습니다.",
                detail: err.message,
            });
        }
        finally {
            if (browser) {
                await browser.close();
                clog('🧹 Browser closed');
            }
        }
    });
});
//# sourceMappingURL=crawlVisitorReviews.js.map
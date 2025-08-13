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
exports.generateVisitorReview = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
const functionsV1 = __importStar(require("firebase-functions"));
const openai_1 = require("openai");
const clog = (...args) => console.log("[generateVisitorReview]", ...args);
const visitorPrompt = (reviews) => `다음은 네이버 지도 방문자 리뷰들이다:\n${reviews.join("\n")}\n이 리뷰들을 바탕으로 한글로 3~4문장, 짧고 긍정적이며, 적절한 emoji를 포함한 방문자 리뷰를 생성해줘. 설명이나 추가 텍스트 없이 리뷰 내용만 제공해줘.`;
exports.generateVisitorReview = functions.onRequest({
    memory: "2GiB",
    timeoutSeconds: 180,
    maxInstances: 5 // 병렬 처리를 위해 인스턴스 수 조정
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
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
    let browser;
    try {
        // 1. 크롤링 시작
        const chromiumModule = await Promise.resolve().then(() => __importStar(require("chrome-aws-lambda")));
        const chromium = chromiumModule.default;
        clog(`🧭 Crawling 시작`);
        clog(`🎯 대상 URL: ${inputUrl}`);
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
        await page.goto(inputUrl, { waitUntil: "networkidle0", timeout: 30000 });
        const finalUrl = page.url();
        clog(`➡️ 최종 URL: ${finalUrl}`);
        const placeIdMatch = finalUrl.match(/place\/(\d+)/);
        const placeId = placeIdMatch ? placeIdMatch[1] : null;
        if (!placeId) {
            throw new Error("최종 URL에서 placeId를 추출할 수 없습니다.");
        }
        clog(`🆔 추출된 placeId: ${placeId}`);
        await page.waitForSelector("#entryIframe", { timeout: 30000 });
        const iframe = await page.$("#entryIframe");
        const frame = await iframe.contentFrame();
        if (!frame)
            throw new Error("iframe을 찾을 수 없습니다.");
        // 방문자 리뷰 수집
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
        const visitorReviews = await frame.evaluate(() => {
            const selectors = [".pui__vn15t2", "[data-testid='review-item']", ".review_item", ".visitor-review", ".review-content"];
            for (const selector of selectors) {
                const nodes = document.querySelectorAll(selector);
                if (nodes.length > 0) {
                    return Array.from(nodes).map((el) => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ""; }).filter(Boolean);
                }
            }
            return [];
        });
        if (visitorReviews.length === 0) {
            throw new Error("방문자 리뷰를 가져올 수 없습니다.");
        }
        clog(`✅ 방문자 리뷰 ${visitorReviews.length}개 추출됨`);
        await browser.close();
        clog('🧹 Browser closed after visitor review crawl');
        // 2. 방문자 리뷰 생성
        const openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY || ((_a = functionsV1.config().openai) === null || _a === void 0 ? void 0 : _a.key) || "",
        });
        let visitorReviewText = "";
        try {
            const prompt = visitorPrompt(visitorReviews);
            clog("[방문자 리뷰 OpenAI 프롬프트]", prompt);
            const visitor = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 300,
            });
            visitorReviewText = ((_e = (_d = (_c = (_b = visitor.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.trim()) || "";
            clog("[OpenAI 방문자 리뷰 생성 완료]", visitorReviewText);
        }
        catch (e) {
            clog("[OpenAI 방문자 리뷰 실패 → Gemini fallback 시도]");
            try {
                const geminiKey = process.env.GEMINI_API_KEY || ((_f = functionsV1.config().gemini) === null || _f === void 0 ? void 0 : _f.key);
                if (!geminiKey)
                    throw new Error("Gemini API key not found.");
                const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require("@google/generative-ai")));
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = visitorPrompt(visitorReviews);
                clog("[방문자 리뷰 Gemini 프롬프트]", prompt);
                const result = await model.generateContent(prompt);
                const response = result.response;
                visitorReviewText = response.text();
                clog("[Gemini 방문자 리뷰 생성 완료]", visitorReviewText);
            }
            catch (err) {
                clog("[Gemini 방문자 리뷰 실패]", String(err));
                throw new Error("Gemini 방문자 리뷰 생성에 실패했습니다.");
            }
        }
        res.status(200).json({
            visitorReview: visitorReviewText,
            visitorReviewCount: visitorReviews.length,
            placeId,
        });
    }
    catch (err) {
        clog("🔥 처리 실패:", err);
        res.status(500).json({
            error: "방문자 리뷰 생성에 실패했습니다.",
            detail: err.message,
        });
    }
    finally {
        if (browser && browser.process() != null) {
            try {
                await browser.close();
                clog('🧹 Browser closed in finally block');
            }
            catch (e) {
                clog('❗ Browser close 실패:', e);
            }
        }
    }
});
//# sourceMappingURL=generateVisitorReview.js.map
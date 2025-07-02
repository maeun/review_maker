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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawl = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
const chrome_aws_lambda_1 = __importDefault(require("chrome-aws-lambda"));
// import puppeteer from "puppeteer-core"; // 제거
const generate_1 = require("./generate");
// placeId 추출 함수
function extractPlaceId(url) {
    const match = url.match(/place\/(\d+)/);
    return match ? match[1] : null;
}
exports.crawl = functions.onRequest({ memory: "1GiB", timeoutSeconds: 300 }, async (req, res) => {
    // CORS 헤더 추가
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    // OPTIONS 프리플라이트 요청 처리
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
        browser = await chrome_aws_lambda_1.default.puppeteer.launch({
            args: [
                ...chrome_aws_lambda_1.default.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            defaultViewport: chrome_aws_lambda_1.default.defaultViewport,
            executablePath: await chrome_aws_lambda_1.default.executablePath,
            headless: chrome_aws_lambda_1.default.headless,
        });
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
        await page.setExtraHTTPHeaders({
            'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
        });
        await page.setViewport({ width: 1280, height: 800 });
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (["image", "stylesheet", "font"].includes(req.resourceType())) {
                req.abort();
            }
            else {
                req.continue();
            }
        });
        await page.goto(targetUrl, { waitUntil: "networkidle2" });
        // 네이버 맵은 iframe 구조이므로, iframe 진입
        await page.waitForSelector("#entryIframe", { timeout: 100000 });
        const iframe = await page.$("#entryIframe");
        const frame = await iframe.contentFrame();
        // 리뷰가 로드될 때까지 대기 (타임아웃 증가, 에러 핸들링 추가)
        try {
            await frame.waitForSelector(".pui__vn15t2", { timeout: 200000 });
        }
        catch (e) {
            res.status(200).json({ placeId, reviews: "", finalReview: "리뷰가 없습니다." });
            if (browser)
                await browser.close();
            return;
        }
        // 방문자 리뷰 텍스트 추출
        const reviews = await frame.evaluate(() => {
            const reviewElements = Array.from(document.querySelectorAll(".pui__vn15t2"));
            return reviewElements.map(el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ""; }).join(" ");
        });
        // OpenAI 기반 리뷰 생성
        const { visitorReview } = await (0, generate_1.generateReviews)([reviews], []);
        const finalReview = visitorReview || "리뷰 생성 실패";
        res.status(200).json({ placeId, reviews, finalReview });
    }
    catch (err) {
        console.error('🛑 Crawl failed:', err);
        res.status(500).json({ error: err instanceof Error ? err.stack : String(err) });
    }
    finally {
        if (browser)
            await browser.close();
    }
});
//# sourceMappingURL=crawl.js.map
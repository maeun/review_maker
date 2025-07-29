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
exports.generateBlogReview = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
const functionsV1 = __importStar(require("firebase-functions"));
const openai_1 = require("openai");
const clog = (...args) => console.log("[generateBlogReview]", ...args);
const systemPrompt = "You are an expert Korean blog writer. Write in Markdown, soliloquy style ending each sentence with '~다'. Never use '체험' or '경험'. Use informal but rich vocabulary. Add emojis. Don't use honorifics.";
const digestPrompt = (reviews) => `다음은 블로그 리뷰 모음이다:\n\n${reviews.join("\n\n")}\n\n이 리뷰들을 모두 분석해서, 장소에 대한 통합적 인사이트를 정리해줘.`;
const indexPrompt = (summary) => `다음은 블로그 글 작성 조건이다:

- 각 문장은 '~다'로 끝나는 혼잣말 스타일
- Markdown 사용
- 내용은 긍정적이고 통찰력 있게
- 이모지 사용
- '체험'이나 '경험'이라는 단어는 사용 금지
- 존댓말 금지
- 중복이나 누락 없이 MECE한 6개의 블로그 목차(번호와 제목)를 구성해줘
- 아래 통합 요약을 참고해서 장소에 맞는 목차를 작성해줘:

${summary}

목차만 출력해줘.`;
const sectionPrompt = (index, summary) => `다음은 블로그 목차의 한 항목이다: ${index}

이 항목에 해당하는 내용을 아래 통합 요약을 바탕으로 길고 풍부하게 작성해줘. Markdown 형식으로, 혼잣말처럼 쓰되 '~다'로 끝나고 이모지를 넣어줘. 중복 없이 MECE하게 작성해.

통합 리뷰 요약:
${summary}`;
const titlePrompt = (body) => `아래 블로그 글을 읽고 키워드와 이모지를 포함한 매력적인 제목을 만들어줘. 단 한 줄만 반환해줘:\n\n${body}`;
exports.generateBlogReview = functions.onRequest({
    memory: "2GiB",
    timeoutSeconds: 540,
    maxInstances: 5
}, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
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
        // 1. 블로그 리뷰 크롤링
        const chromiumModule = await Promise.resolve().then(() => __importStar(require("chrome-aws-lambda")));
        const chromium = chromiumModule.default;
        clog(`🧭 Blog Crawling 시작`);
        clog(`🎯 대상 URL: ${inputUrl}`);
        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            timeout: 30000,
        });
        const page = await browser.newPage();
        await page.goto(inputUrl, { waitUntil: "networkidle0", timeout: 30000 });
        await page.waitForSelector("#entryIframe", { timeout: 30000 });
        const iframe = await page.$("#entryIframe");
        const frame = await iframe.contentFrame();
        if (!frame)
            throw new Error("iframe을 찾을 수 없습니다.");
        const blogTabXPath = "/html/body/div[3]/div/div/div[7]/div[2]/div/a[2]";
        const [blogTabElement] = await frame.$x(blogTabXPath);
        if (blogTabElement) {
            await blogTabElement.click();
            await frame.waitForTimeout(3000);
        }
        else {
            throw new Error("블로그 리뷰 탭을 찾을 수 없습니다.");
        }
        await frame.waitForSelector(".EblIP", { timeout: 30000 });
        const blogLinks = await frame.evaluate(() => {
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
        if (blogLinks.length === 0) {
            throw new Error("블로그 리뷰 링크를 찾을 수 없습니다.");
        }
        clog(`🔗 블로그 리뷰 링크 ${blogLinks.length}개 수집됨`);
        const blogReviews = [];
        for (const url of blogLinks.slice(0, 5)) { // 블로그는 5개만
            try {
                const blogPage = await browser.newPage();
                await blogPage.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
                const iframeElement = await blogPage.$("iframe");
                if (iframeElement) {
                    const src = await iframeElement.evaluate((el) => el.getAttribute("src"));
                    if (src && src.startsWith("/")) {
                        const realUrl = "https://blog.naver.com" + src;
                        await blogPage.goto(realUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
                    }
                }
                await blogPage.waitForSelector("div.se-main-container, div#postViewArea", { timeout: 20000 });
                const text = await blogPage.evaluate(() => {
                    const se = document.querySelector("div.se-main-container");
                    if (se)
                        return se.innerText.replace(/\n/g, " ").trim();
                    const legacy = document.querySelector("div#postViewArea");
                    if (legacy)
                        return legacy.innerText.replace(/\n/g, " ").trim();
                    return "";
                });
                if (text)
                    blogReviews.push(text);
                await blogPage.close();
            }
            catch (e) {
                clog(`❌ [블로그 본문 크롤링 실패] ${url}`, e);
            }
        }
        if (blogReviews.length === 0) {
            throw new Error("블로그 리뷰 내용을 가져올 수 없습니다.");
        }
        clog(`✅ 블로그 리뷰 ${blogReviews.length}개 추출됨`);
        await browser.close();
        clog('🧹 Browser closed after blog review crawl');
        // 2. 블로그 리뷰 생성
        const openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY || ((_a = functionsV1.config().openai) === null || _a === void 0 ? void 0 : _a.key) || "",
        });
        let blogReviewText = "";
        try {
            const summaryRes = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: digestPrompt(blogReviews) }],
                temperature: 0.7,
                max_tokens: 1000,
            });
            const reviewSummary = ((_e = (_d = (_c = (_b = summaryRes.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.trim()) || "";
            const indexRes = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: indexPrompt(reviewSummary) }],
                temperature: 0.7,
                max_tokens: 500,
            });
            const blogIndexes = ((_j = (_h = (_g = (_f = indexRes.choices) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.message) === null || _h === void 0 ? void 0 : _h.content) === null || _j === void 0 ? void 0 : _j.split(/\n|\d+\.\s*/).map((x) => x.trim()).filter(Boolean).slice(0, 6)) || [];
            const sections = await Promise.all(blogIndexes.map(async (title) => {
                var _a, _b, _c, _d;
                const sectionRes = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: sectionPrompt(title, reviewSummary) }],
                    temperature: 0.7,
                    max_tokens: 1800,
                });
                return ((_d = (_c = (_b = (_a = sectionRes.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) || "";
            }));
            const blogBody = sections.join("\n\n");
            const titleRes = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: titlePrompt(blogBody) }],
                temperature: 0.7,
                max_tokens: 100,
            });
            let title = ((_o = (_m = (_l = (_k = titleRes.choices) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.message) === null || _m === void 0 ? void 0 : _m.content) === null || _o === void 0 ? void 0 : _o.trim()) || "";
            if (title.includes("\n")) {
                title = title.split("\n").find((l) => l.trim()) || title;
            }
            blogReviewText = `${title}\n\n${blogBody}`;
            clog("[OpenAI 최종 블로그 리뷰]", blogReviewText);
        }
        catch (err) {
            clog("[OpenAI 블로그 리뷰 생성 실패]", String(err));
            // Gemini Fallback은 일단 생략 (필요 시 추가)
            throw new Error("블로그 리뷰 생성에 실패했습니다.");
        }
        res.status(200).json({
            blogReview: blogReviewText,
            blogReviewCount: blogReviews.length,
        });
    }
    catch (err) {
        clog("🔥 처리 실패:", err);
        res.status(500).json({
            error: "블로그 리뷰 생성에 실패했습니다.",
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
//# sourceMappingURL=generateBlogReview.js.map
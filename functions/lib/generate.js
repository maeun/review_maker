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
exports.generate = void 0;
const openai_1 = require("openai");
const functions = __importStar(require("firebase-functions/v2/https"));
// 방문자 리뷰 프롬프트
const visitorPrompt = (reviews) => `다음은 네이버 지도 방문자 리뷰들이다:\n${reviews.slice(0, 10).join("\n")}\n이 리뷰들을 바탕으로 한글로 3~4문장, 짧고 긍정적이며, 적절한 emoji를 포함한 방문자 리뷰를 생성해줘. 설명이나 추가 텍스트 없이 리뷰 내용만 제공해줘.`;
// 개별 블로그 리뷰 요약 프롬프트
const blogSinglePrompt = (review) => `아래는 네이버 지도 블로그 리뷰의 일부이다. 줄바꿈 없이 한 문장처럼 읽어라. 핵심 키워드와 주요 내용을 파악해줘.\n\n${review}`;
// 전체 리뷰 정보로 목차 생성 프롬프트
const blogSystemPrompt = "you are an expert blog post writer specializing in writing with maximum token, in Korean.";
const blogUserPrompt = `Based on the information I gave you, I want to paraphrase it as I visited.\n\nCondition 1: Please provide a thorough analysis in your writing. It should comprise of detailed, insightful and in positive way.\nCondition 2: Including tables and lists to enhance understanding and readability is an optional.\nCondition 3: You may write consistently in Markdown to maintain uniformity and ease of comprehension.\nCondition 4: Do ensure your content is extensive, relevant, and in soliloquy with informal style for this blog post. Do not use 존댓말. But the writing style must be soliloquy.\nCondition 5: use relevant emojis\nCondition 6: Make a title with one of the key words.\nCondition 7: Use each key words at least 5 times in the content.\nCondition 8: Do not need to use English in sub-title.\nCondition 9: Do not use the word "체험" and "경험". It is really important.\nCondition 10: Don't write as if you're speaking to someone. Write in a diary-like style\nCondition 11: Each sentence should end as '~다' as self-conversation style.\nCondition 12: First of all, please suggest the 6-index from start to end.\n추가 조건: 각 목차와 본문, 제목 모두 마크다운(#, ##, **, __, *, _ 등) 사용하지 말고, 자연스러운 문장과 이모지로 소제목을 만들어줘. 소제목은 줄바꿈 없이 본문과 자연스럽게 이어지게 해줘. 실제 블로그 글처럼 복사해서 바로 붙여넣을 수 있게 해줘.`;
exports.generate = functions.onRequest({
    memory: "2GiB",
    timeoutSeconds: 540,
    maxInstances: 1
}, async (req, res) => {
    var _a, _b, _c, _d;
    // CORS 헤더 추가
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
    // OPTIONS 프리플라이트 요청 처리
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== "POST") {
        res.status(405).end();
        return;
    }
    const { visitorReviews, blogReviews } = req.body;
    if (!visitorReviews || visitorReviews.length === 0) {
        res.status(400).json({ error: "방문자 리뷰 데이터 필요" });
        return;
    }
    // blogReviews가 없으면 빈 배열로 처리
    const safeBlogReviews = Array.isArray(blogReviews) ? blogReviews : [];
    try {
        const openai = new openai_1.OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        // 1. 블로그 리뷰 개별 요약/파악 (blogReviews가 있을 때만)
        let blogSummaries = [];
        if (safeBlogReviews.length > 0) {
            const cleanedBlogReviews = safeBlogReviews.map((r) => r.replace(/\n/g, " "));
            for (const review of cleanedBlogReviews) {
                const summary = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: blogSinglePrompt(review) }],
                    temperature: 0.5,
                    max_tokens: 300,
                });
                blogSummaries.push((_a = summary.choices[0].message.content) !== null && _a !== void 0 ? _a : "");
            }
        }
        // 2. 전체 리뷰 정보로 목차 6개 생성 (blogReviews가 있을 때만)
        let indexArr = [];
        let finalBlogReview = "";
        let blogTitle = "";
        if (safeBlogReviews.length > 0 && blogSummaries.length > 0) {
            const systemMsg = { role: "system", content: blogSystemPrompt };
            const userMsg = {
                role: "user",
                content: blogUserPrompt + "\n\n" + blogSummaries.join("\n"),
            };
            const indexRes = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [systemMsg, userMsg],
                temperature: 0.7,
                max_tokens: 500,
            });
            const indexList = indexRes.choices[0].message.content;
            indexArr = (indexList || "")
                .split(/\n|\d+\.|\d+\)/)
                .map((s) => (s !== null && s !== void 0 ? s : "").trim())
                .filter(Boolean);
            // 3. 목차 6개 중 2개씩(3회) 본문 생성 요청
            const blogSections = [];
            for (let i = 0; i < 6; i += 2) {
                const sectionTitles = indexArr.slice(i, i + 2).join(", ");
                const sectionPrompt = `아래는 블로그 리뷰 목차 일부이다: ${sectionTitles}\n위 목차에 해당하는 본문을 실제 블로그 글처럼 자연스럽게 이어지게 작성해줘.\n각 소제목(목차)마다 이모지, 장소명 또는 주요 키워드, 감성적 디테일을 포함하고, diary style, soliloquy, '~다'로 끝나게, 존댓말 금지, 마크다운(#, ##, **, __, *, _ 등) 금지, 각 소제목은 이모지+자연스러운 문장으로 줄바꿈 없이 본문과 자연스럽게 이어지게 해줘.`;
                const sectionRes = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        systemMsg,
                        {
                            role: "user",
                            content: sectionPrompt + "\n\n" + blogSummaries.join("\n"),
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 1200,
                });
                blogSections.push((_b = sectionRes.choices[0].message.content) !== null && _b !== void 0 ? _b : "");
            }
            finalBlogReview = blogSections.join("\n\n");
            // 4. 최종 리뷰에 대한 제목 생성 요청
            const titleRes = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    systemMsg,
                    {
                        role: "user",
                        content: `아래 블로그 리뷰 본문을 읽고, 키워드와 이모지를 포함해서 실제 블로그 제목처럼 만들어줘.\n\n${finalBlogReview}`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 100,
            });
            blogTitle = (_c = titleRes.choices[0].message.content) !== null && _c !== void 0 ? _c : "";
        }
        // 방문자 리뷰는 항상 생성
        const visitor = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: visitorPrompt(visitorReviews) }],
            temperature: 0.7,
        });
        const visitorReviewText = (_d = visitor.choices[0].message.content) !== null && _d !== void 0 ? _d : "";
        // 생성된 방문자 리뷰를 로그에 남김
        console.log("[방문자 리뷰 생성 결과]", visitorReviewText);
        res.status(200).json({
            visitorReview: visitorReviewText || "리뷰 생성에 실패했습니다.",
            blogReview: finalBlogReview,
            blogTitle,
            blogIndex: indexArr,
            blogSummaries,
        });
    }
    catch (e) {
        res.status(500).json({ error: "리뷰 생성 실패", detail: String(e) });
    }
});
//# sourceMappingURL=generate.js.map
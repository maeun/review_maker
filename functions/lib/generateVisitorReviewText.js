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
exports.generateVisitorReviewText = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors = require("cors");
const clog = (...args) => console.log("[generateVisitorReviewText]", ...args);
const visitorPrompt = (reviews) => `다음은 네이버 지도 방문자 리뷰들이다:\n${reviews.join("\n")}\n이 리뷰들을 바탕으로 한글로 3~4문장, 짧고 긍정적이며, 적절한 emoji를 포함한 방문자 리뷰를 생성해줘. 설명이나 추가 텍스트 없이 리뷰 내용만 제공해줘.`;
const corsMiddleware = cors({
    origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});
const tryGroqVisitorFallback = async (reviews) => {
    var _a, _b, _c, _d;
    const prompt = visitorPrompt(reviews);
    const { default: fetch } = await Promise.resolve().then(() => __importStar(require("node-fetch")));
    const groqModels = [
        "gemma2-9b-it",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "compound-beta-mini",
    ];
    for (const model of groqModels) {
        try {
            clog(`📡 Groq 모델 시도: ${model}`);
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                }),
            });
            // 응답 상태 확인
            if (!res.ok) {
                const errorText = await res.text();
                clog(`❌ Groq API HTTP 오류 (${res.status}):`, errorText);
                throw new Error(`Groq API HTTP ${res.status}: ${errorText.slice(0, 200)}`);
            }
            // Content-Type 확인
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const responseText = await res.text();
                clog(`❌ Groq API 비JSON 응답:`, responseText.slice(0, 200));
                throw new Error(`Groq API returned non-JSON response: ${responseText.slice(0, 100)}`);
            }
            // 안전한 JSON 파싱
            let json;
            try {
                const responseText = await res.text();
                json = JSON.parse(responseText);
            }
            catch (parseError) {
                clog(`❌ Groq API JSON 파싱 실패:`, parseError.message);
                throw new Error(`JSON parsing failed: ${parseError.message}`);
            }
            // 응답 구조 검증
            if (!json.choices ||
                !Array.isArray(json.choices) ||
                json.choices.length === 0) {
                clog(`❌ Groq API 잘못된 응답 구조:`, JSON.stringify(json).slice(0, 200));
                throw new Error("Invalid Groq API response structure");
            }
            let content = (_d = (_c = (_b = (_a = json.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim();
            // 빈 응답 확인
            if (!content) {
                clog(`❌ Groq API 빈 응답`);
                throw new Error("Empty response from Groq API");
            }
            // 불필요한 접두사 제거
            content = content
                .replace(/^.*here are the generated reviews?:?\s*/i, "")
                .replace(/^.*generated review:?\s*/i, "")
                .replace(/^.*review:?\s*/i, "")
                .replace(/^.*다음은.*리뷰입니다?:?\s*/i, "")
                .replace(/^.*생성된.*리뷰:?\s*/i, "")
                .trim();
            if (content) {
                return content;
            }
        }
        catch (err) {
            clog(`❌ Groq 모델 실패: ${model}`, err.message);
        }
    }
    throw new Error("모든 Groq 모델 실패");
};
exports.generateVisitorReviewText = (0, https_1.onRequest)({
    memory: "256MiB",
    timeoutSeconds: 120,
    maxInstances: 5,
    secrets: ["OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY"],
}, (req, res) => {
    corsMiddleware(req, res, async () => {
        var _a, _b, _c, _d;
        if (req.method !== "POST") {
            res.status(405).json({ error: "POST 요청만 허용됩니다." });
            return;
        }
        const { visitorReviews } = req.body;
        if (!visitorReviews ||
            !Array.isArray(visitorReviews) ||
            visitorReviews.length === 0) {
            res.status(400).json({ error: "visitorReviews 데이터가 필요합니다." });
            return;
        }
        const prompt = visitorPrompt(visitorReviews);
        let visitorReviewText = "";
        try {
            // 시스템 안정화를 위한 의도적 지연 (1-3초 랜덤)
            const initialDelay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
            clog(`⏱️ 시스템 안정화 대기: ${initialDelay}ms`);
            await new Promise((resolve) => setTimeout(resolve, initialDelay));
            clog("1차: OpenAI API로 방문자 리뷰 생성 시도");
            const { OpenAI } = await Promise.resolve().then(() => __importStar(require("openai")));
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const visitor = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 300,
            });
            visitorReviewText =
                ((_d = (_c = (_b = (_a = visitor.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) || "";
            clog("✅ OpenAI 방문자 리뷰 생성 완료");
        }
        catch (openAiError) {
            clog("⚠️ OpenAI API 실패:", openAiError.message);
            clog("2차: Gemini API로 방문자 리뷰 생성 시도");
            try {
                const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require("@google/generative-ai")));
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                visitorReviewText = response.text().trim();
                clog("✅ Gemini 방문자 리뷰 생성 완료");
            }
            catch (geminiError) {
                clog("⚠️ Gemini API 실패:", geminiError.message);
                clog("3차: Groq API 시도");
                try {
                    visitorReviewText = await tryGroqVisitorFallback(visitorReviews);
                    clog("✅ Groq 방문자 리뷰 생성 완료");
                }
                catch (groqError) {
                    clog("🔥 최종 실패: 모든 LLM 실패");
                    res.status(500).json({
                        error: "모든 LLM에서 리뷰 생성에 실패했습니다.",
                        openai_error: openAiError.message,
                        gemini_error: geminiError.message,
                        groq_error: groqError.message,
                    });
                    return;
                }
            }
        }
        // 응답 검증 및 안전한 JSON 반환
        if (!visitorReviewText || visitorReviewText.trim() === "") {
            clog("⚠️ 빈 방문자 리뷰 텍스트 감지");
            res.status(500).json({
                error: "방문자 리뷰 생성 실패",
                detail: "생성된 리뷰 내용이 비어있습니다.",
            });
            return;
        }
        // 안전한 JSON 응답
        try {
            const response = { visitorReview: visitorReviewText };
            res.status(200).json(response);
            clog("✅ 방문자 리뷰 응답 전송 완료");
        }
        catch (jsonError) {
            clog("❌ JSON 응답 생성 실패:", jsonError.message);
            res.status(500).json({
                error: "응답 생성 실패",
                detail: "JSON 형식 오류",
            });
        }
    });
});
//# sourceMappingURL=generateVisitorReviewText.js.map
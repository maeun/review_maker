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
exports.generateBlogReviewText = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors = require("cors");
const logger_1 = require("./utils/logger");
const impressionValidator_1 = require("./utils/impressionValidator");
const dateUtils_1 = require("./utils/dateUtils");
const clog = (...args) => console.log("[generateBlogReviewText]", ...args);
const systemPrompt = "You are an expert Korean blog writer specializing in positive, authentic reviews. Write in natural, friendly style for blog readers. Never use '체험' or '경험'. Use CONSISTENT formal speech (존댓말) throughout - always use '~요', '~습니다', '~예요' endings. Use sophisticated but approachable vocabulary. Add emojis sparingly for emphasis. Focus on specific positive details and personal observations. Always maintain a positive, enthusiastic tone while being authentic. Avoid negative comments or complaints.";
const digestPrompt = (reviews, userImpression) => {
    const basePrompt = `Summarize these place reviews in Korean, focusing on positive aspects:\n\n${reviews.join("\n\n")}\n\n`;
    const userImpressionPart = userImpression
        ? `Also consider this user's personal impression: "${userImpression}"\n\nIntegrate the user's impression naturally if it aligns with the reviews, but prioritize the actual reviews if there are significant discrepancies.\n\n`
        : '';
    return basePrompt + userImpressionPart + `Rules:
  1. Only use positive content mentioned in reviews
  2. No generic info or other places
  3. Focus on positive features by place type:
     - Restaurant/Cafe: delicious menu items, great taste, good value, pleasant atmosphere, excellent service
     - Hospital/Clinic: skilled staff, modern facilities, efficient service, effective treatment, caring staff
     - Beauty/Nail: expert skills, reasonable prices, comfortable atmosphere, quality service, convenient location
     - Shopping: quality products, fair prices, welcoming atmosphere, helpful staff, easy accessibility
     - Accommodation: comfortable rooms, excellent facilities, attentive service, great location, good value
     - Tourism: amazing attractions, well-maintained facilities, easy access, reasonable prices, high satisfaction
     - Other: unique positive features mentioned in reviews
  4. Ignore negative comments, complaints, or criticisms
  5. Emphasize what makes this place special and worth visiting
  
  IMPORTANT: Respond in Korean only with positive tone.`;
};
const indexPrompt = (summary) => `Create 6 Korean blog section titles based on this summary. Rules:
- Natural blog style ending with '요' or '습니다'
- Positive and enthusiastic tone
- Use emojis sparingly (max 1 per title)
- No '체험' or '경험' words
- Use formal speech (존댓말)
- MECE structure - each section must cover completely distinct aspects with NO overlap
- Only about this specific place
- Focus on positive highlights for each unique aspect:
  * Restaurant: 1) signature/popular dishes, 2) taste/quality details, 3) atmosphere/interior, 4) service excellence, 5) location/convenience, 6) value/pricing
  * Clinic: 1) medical expertise, 2) facility quality, 3) treatment process, 4) patient care, 5) convenience factors, 6) overall satisfaction

Summary: ${summary}

IMPORTANT: Output exactly 6 distinct titles in Korean formal speech (존댓말) only (no numbers, no markdown), each covering a completely unique positive aspect.`;
const sectionPrompt = (index, summary) => `Write detailed Korean blog content for: ${index}

Rules:
1. Only use specific POSITIVE info from summary below - absolutely NO repetition from other sections
2. No generic info or other places
3. Natural blog style (friendly and informative for readers)
4. Use CONSISTENT formal speech (존댓말) throughout - ALWAYS use '~요', '~습니다', '~예요' endings
5. Use emojis sparingly (2-3 per paragraph max)
6. No '체험' or '경험' words
7. Include specific positive details, prices, descriptions when available
8. Write 3-4 substantial paragraphs with unique positive insights
9. Focus ONLY on the specific aspect mentioned in the section title - do not mention other aspects
10. NO markdown formatting (no ##, **, etc.) - use plain text only
11. Start directly with content, no section title repetition or summary
12. POSITIVE TONE ONLY - no complaints, criticisms, or negative comments
13. Each section must be completely unique - check that you're not repeating information from other sections
14. NEVER start with greetings like '네,', '안녕하세요', '오늘은', '여러분' - jump straight into the content
15. NEVER use conversational starters - begin with factual, descriptive content about the specific topic
16. NO introductory phrases like '소개합니다', '말씀드릴게요', '이야기해볼게요'

Summary: ${summary}

IMPORTANT: Write in Korean only with positive, engaging content in plain text format. Focus solely on the unique aspect in the title. Start with concrete, specific information immediately.`;
const titlePrompt = (body) => `Create an attractive Korean blog title based on this content. Requirements:
- Include the place name and key appeal
- Use 1-2 relevant emojis maximum
- Make it catchy but not clickbait
- 15-25 characters ideal length
- Reflect the main theme of the content

Content: ${body}

IMPORTANT: Respond with one Korean title only.`;
const corsMiddleware = cors({
    origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});
// 공통 텍스트 정리 함수
const cleanGeneratedText = (text) => {
    return (text
        // 불필요한 영어 접두사 제거
        .replace(/^.*here\s+(is|are)\s+.*:?\s*/i, "")
        .replace(/^.*below\s+(is|are)\s+.*:?\s*/i, "")
        .replace(/^.*following\s+(is|are)\s+.*:?\s*/i, "")
        .replace(/^.*potential.*:?\s*/i, "")
        .replace(/^.*blog post.*:?\s*/i, "")
        .replace(/^.*section titles?.*:?\s*/i, "")
        .replace(/^.*table of contents.*:?\s*/i, "")
        // 불필요한 한국어 접두사 제거
        .replace(/^.*다음은.*:?\s*/i, "")
        .replace(/^.*생성된.*:?\s*/i, "")
        .replace(/^.*제목.*:?\s*/i, "")
        .replace(/^.*섹션.*:?\s*/i, "")
        .replace(/^.*목차.*:?\s*/i, "")
        // 대화형/인사 표현 제거
        .replace(/^네,?\s*/gm, "")
        .replace(/^안녕하세요[,!]?\s*/gm, "")
        .replace(/^오늘은\s*/gm, "")
        .replace(/^여러분[,!]?\s*/gm, "")
        .replace(/^그럼\s*/gm, "")
        .replace(/^자,?\s*/gm, "")
        .replace(/^음,?\s*/gm, "")
        .replace(/^.*소개합니다[,!]?\s*/gm, "")
        .replace(/^.*말씀드릴게요[,!]?\s*/gm, "")
        .replace(/^.*이야기해?볼게요[,!]?\s*/gm, "")
        .replace(/^.*설명해?드릴게요[,!]?\s*/gm, "")
        .replace(/^.*알려드릴게요[,!]?\s*/gm, "")
        .replace(/^.*추천해?드릴게요[,!]?\s*/gm, "")
        .replace(/^.*보여드릴게요[,!]?\s*/gm, "")
        .replace(/^.*함께\s+.*해?볼게요[,!]?\s*/gm, "")
        // 번호 목록 제거
        .replace(/^\d+\.\s*/gm, "")
        .replace(/^-\s*/gm, "")
        // 여러 줄바꿈을 두 줄바꿈으로 정리
        .replace(/\n{3,}/g, "\n\n")
        .trim());
};
// Groq fallback 함수 - 컨텍스트 연속성 강화
const tryGroqModels = async (blogReviews, userImpression) => {
    const system = { role: "system", content: systemPrompt };
    const { default: fetch } = await Promise.resolve().then(() => __importStar(require("node-fetch")));
    const groqModels = [
        "llama3-8b-8192",
        "gemma2-9b-it",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.3-70b-versatile",
        "compound-beta",
    ];
    // Groq용 재시도 헬퍼 함수
    const retryApiCall = async (fn, retries = 2, delay = 1000) => {
        for (let i = 0; i <= retries; i++) {
            try {
                return await fn();
            }
            catch (error) {
                if (i === retries)
                    throw error;
                clog(`🔄 Groq 재시도 ${i + 1}/${retries + 1} - ${delay}ms 후 재시도`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 1.5; // 지수 백오프
            }
        }
    };
    for (const model of groqModels) {
        try {
            clog(`📡 Groq 모델 시도: ${model}`);
            // 대화 히스토리를 유지하는 메시지 체인
            const conversationHistory = [system];
            const callGroqWithContext = async (prompt, context) => {
                var _a, _b, _c, _d;
                const messages = [...conversationHistory];
                if (context) {
                    messages.push({ role: "assistant", content: context });
                }
                messages.push({ role: "user", content: prompt });
                const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model,
                        messages,
                        temperature: 0.5,
                    }),
                    timeout: 60000, // 60초 타임아웃
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
                let content = ((_d = (_c = (_b = (_a = json.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) || "";
                // 빈 응답 확인
                if (!content) {
                    clog(`❌ Groq API 빈 응답`);
                    throw new Error("Empty response from Groq API");
                }
                // 불필요한 접두사 및 마크다운 제거 (cleanGeneratedText 함수와 동일하게)
                content = content
                    .replace(/^.*here is.*:?\s*/i, "")
                    .replace(/^.*potential.*:?\s*/i, "")
                    .replace(/^.*blog post.*:?\s*/i, "")
                    .replace(/^.*다음은.*:?\s*/i, "")
                    .replace(/^.*생성된.*:?\s*/i, "")
                    .replace(/^.*제목.*:?\s*/i, "")
                    // 대화형/인사 표현 제거
                    .replace(/^네,?\s*/gm, "")
                    .replace(/^안녕하세요[,!]?\s*/gm, "")
                    .replace(/^오늘은\s*/gm, "")
                    .replace(/^여러분[,!]?\s*/gm, "")
                    .replace(/^그럼\s*/gm, "")
                    .replace(/^자,?\s*/gm, "")
                    .replace(/^음,?\s*/gm, "")
                    .replace(/^.*소개합니다[,!]?\s*/gm, "")
                    .replace(/^.*말씀드릴게요[,!]?\s*/gm, "")
                    .replace(/^.*이야기해?볼게요[,!]?\s*/gm, "")
                    .replace(/^.*설명해?드릴게요[,!]?\s*/gm, "")
                    .replace(/^.*알려드릴게요[,!]?\s*/gm, "")
                    .replace(/^.*추천해?드릴게요[,!]?\s*/gm, "")
                    .replace(/^.*보여드릴게요[,!]?\s*/gm, "")
                    .replace(/^.*함께\s+.*해?볼게요[,!]?\s*/gm, "")
                    .replace(/#{1,6}\s*/g, "") // 마크다운 헤더 제거
                    .replace(/\*\*(.*?)\*\*/g, "$1") // 볼드 마크다운 제거
                    .replace(/\*(.*?)\*/g, "$1") // 이탤릭 마크다운 제거
                    .replace(/^\d+\.\s*/gm, "") // 번호 목록 제거
                    .trim();
                // 무관한 주제가 포함된 경우 해당 섹션 제거
                const irrelevantPatterns = [
                    /\*\*.*(?:Korean|K-|Beauty|Fashion|Makeup|서울|밤거리|발리|프랑스|향수|여행|문화).*\*\*[\s\S]*?(?=\*\*|$)/gi,
                    /それは/g,
                    /暗面/g,
                    /島/g,
                ];
                irrelevantPatterns.forEach((pattern) => {
                    content = content.replace(pattern, "");
                });
                // 대화 히스토리에 추가
                conversationHistory.push({ role: "user", content: prompt });
                conversationHistory.push({ role: "assistant", content: content });
                return content.trim();
            };
            // 1단계: 리뷰 요약 (재시도 로직 적용)
            const summary = await retryApiCall(() => callGroqWithContext(digestPrompt(blogReviews, userImpression)));
            clog(`📝 Groq 요약 생성 완료: ${summary.slice(0, 100)}...`);
            // 메모리 최적화: 대화 히스토리 정리
            conversationHistory.length = 1; // system prompt만 유지
            // 2단계: 목차 생성 (재시도 로직 적용)
            const indexRaw = await retryApiCall(() => callGroqWithContext(`Create table of contents based on previous summary:\n${indexPrompt(summary)}`, summary.slice(0, 500) // 요약 길이 제한
            ));
            const cleanedIndexRaw = cleanGeneratedText(indexRaw);
            const blogIndexes = cleanedIndexRaw
                .split(/\n|\d+\.\s*/)
                .map((x) => x.trim())
                .filter(Boolean)
                .slice(0, 6);
            clog(`📋 Groq 목차 생성 완료: ${blogIndexes.length}개`);
            // 메모리 최적화: 대화 히스토리 다시 정리
            conversationHistory.length = 1;
            // 3단계: 각 섹션 작성 (재시도 로직 적용)
            const sections = [];
            for (const title of blogIndexes) {
                const section = await retryApiCall(() => callGroqWithContext(`Write "${title}" section based on summary and TOC:\n${sectionPrompt(title, summary)}`, `요약: ${summary.slice(0, 300)}\n목차: ${blogIndexes.join(", ")}`));
                const cleanedSection = cleanGeneratedText(section);
                sections.push(`**${title}**\n\n${cleanedSection}`);
                // 각 섹션 후 히스토리 정리
                conversationHistory.length = 1;
            }
            clog(`📄 Groq 섹션 생성 완료: ${sections.length}개`);
            const body = sections.join("\n\n");
            // 4단계: 제목 생성 (재시도 로직 적용)
            let title = await retryApiCall(() => callGroqWithContext(`Create title based on all content:\n${titlePrompt(body)}`, `요약: ${summary.slice(0, 200)}\n목차: ${blogIndexes.join(", ")}\n본문: ${body.slice(0, 200)}...`));
            if (title.includes("\n")) {
                title = title.split("\n").find((l) => l.trim()) || title;
            }
            clog(`🏷️ Groq 제목 생성 완료: ${title}`);
            // 최종 포맷팅: 목차는 볼드로 유지하고 다른 마크다운만 제거
            const cleanBody = body
                .replace(/#{1,6}\s*/g, "") // 마크다운 헤더 제거
                // 볼드 마크다운(**text**)은 유지하고, 단일 이탤릭(*text*)만 제거
                .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1") // 이탤릭만 제거, 볼드는 유지
                .replace(/^\d+\.\s*/gm, "") // 번호 목록 제거
                .replace(/^-\s*/gm, "") // 불릿 포인트 제거
                .split("\n\n")
                .filter((section) => section.trim().length > 0)
                .join("\n\n");
            return `**${title}**\n\n${cleanBody}`;
        }
        catch (groqErr) {
            clog(`❌ Groq 모델 실패: ${model}`, groqErr.message);
        }
    }
    throw new Error("모든 Groq 모델 실패");
};
exports.generateBlogReviewText = (0, https_1.onRequest)({
    memory: "4GiB",
    timeoutSeconds: 300,
    maxInstances: 5,
    secrets: ["OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY"],
}, (req, res) => {
    corsMiddleware(req, res, async () => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        const startTime = Date.now();
        const requestDate = (0, dateUtils_1.getCurrentDateString)(); // 요청 날짜 생성
        // 로깅 정보 추출
        const requestId = req.headers['x-request-id'];
        const logger = logger_1.ReviewLogger.getInstance();
        if (req.method !== "POST") {
            if (requestId) {
                await logger.logError(requestId, "POST 요청만 허용됩니다.", requestDate);
            }
            res.status(405).json({ error: "POST 요청만 허용됩니다." });
            return;
        }
        const { blogReviews, userImpression } = req.body;
        if (!blogReviews ||
            !Array.isArray(blogReviews) ||
            blogReviews.length === 0) {
            if (requestId) {
                await logger.logError(requestId, "blogReviews 데이터가 필요합니다.", requestDate);
            }
            res.status(400).json({ error: "blogReviews 데이터가 필요합니다." });
            return;
        }
        // User impression 검증 및 필터링
        let validatedUserImpression = undefined;
        let impressionValidationMessage = "";
        if (userImpression && typeof userImpression === 'string') {
            const validationResult = impressionValidator_1.ImpressionValidator.validateImpression(userImpression);
            if (validationResult.isValid) {
                validatedUserImpression = validationResult.filteredImpression;
                impressionValidationMessage = impressionValidator_1.ImpressionValidator.getValidationMessage(validationResult.reason || 'valid');
                clog("✅ 사용자 감상 검증 통과:", validatedUserImpression);
            }
            else {
                impressionValidationMessage = impressionValidator_1.ImpressionValidator.getValidationMessage(validationResult.reason || 'invalid');
                clog("⚠️ 사용자 감상 검증 실패:", validationResult.reason, "메시지:", impressionValidationMessage);
                // 검증 실패 로깅
                if (requestId) {
                    await logger.updateBlogReview(requestId, {
                        impressionValidation: {
                            original: userImpression,
                            isValid: false,
                            reason: validationResult.reason,
                            message: impressionValidationMessage
                        },
                        requestDate
                    });
                }
            }
        }
        let blogReviewText = "";
        // 재시도 헬퍼 함수
        const retryWithDelay = async (fn, retries = 2, delay = 1000) => {
            for (let i = 0; i <= retries; i++) {
                try {
                    return await fn();
                }
                catch (error) {
                    if (i === retries)
                        throw error;
                    clog(`🔄 재시도 ${i + 1}/${retries + 1} - ${delay}ms 후 재시도`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    delay *= 1.5; // 지수 백오프
                }
            }
        };
        try {
            // 시스템 안정화를 위한 의도적 지연 (1-3초 랜덤)
            const initialDelay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
            clog(`⏱️ 시스템 안정화 대기: ${initialDelay}ms`);
            await new Promise((resolve) => setTimeout(resolve, initialDelay));
            // 1차: OpenAI 시도 - 컨텍스트 연속성 강화
            clog("1차: OpenAI API로 블로그 리뷰 생성 시도");
            const { OpenAI } = await Promise.resolve().then(() => __importStar(require("openai")));
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            // OpenAI 대화 히스토리 유지
            const openaiHistory = [
                { role: "system", content: systemPrompt },
            ];
            // 1단계: 리뷰 요약 (재시도 로직 적용)
            const summaryRes = await retryWithDelay(() => openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    ...openaiHistory,
                    { role: "user", content: digestPrompt(blogReviews, validatedUserImpression) },
                ],
                temperature: 0.7,
                max_tokens: 1000,
            }));
            const reviewSummary = ((_d = (_c = (_b = (_a = summaryRes.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) || "";
            // 메모리 최적화: 대화 히스토리를 간소화
            openaiHistory.length = 1; // system prompt만 유지
            openaiHistory.push({ role: "assistant", content: reviewSummary });
            clog(`📝 OpenAI 요약 생성 완료: ${reviewSummary.slice(0, 100)}...`);
            // 2단계: 목차 생성 (이전 요약 참조)
            const indexPromptWithContext = `Create TOC based on summary:\n${indexPrompt(reviewSummary)}`;
            const indexRes = await retryWithDelay(() => openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    ...openaiHistory,
                    { role: "user", content: indexPromptWithContext },
                ],
                temperature: 0.7,
                max_tokens: 500,
            }));
            const indexContent = cleanGeneratedText(((_g = (_f = (_e = indexRes.choices) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.content) || "");
            const blogIndexes = indexContent
                .split(/\n|\d+\.\s*/)
                .map((x) => x.trim())
                .filter(Boolean)
                .slice(0, 6);
            openaiHistory.push({ role: "user", content: indexPromptWithContext });
            openaiHistory.push({
                role: "assistant",
                content: ((_k = (_j = (_h = indexRes.choices) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.message) === null || _k === void 0 ? void 0 : _k.content) || "",
            });
            clog(`📋 OpenAI 목차 생성 완료: ${blogIndexes.length}개`);
            // 3단계: 각 섹션 작성 (요약과 목차 모두 참조, 재시도 로직 적용)
            const sections = await Promise.all(blogIndexes.map(async (title) => {
                var _a, _b, _c, _d;
                const sectionPromptWithContext = `Write "${title}" section:\n${sectionPrompt(title, reviewSummary)}\n\nTOC: ${blogIndexes.join(", ")}`;
                const sectionRes = await retryWithDelay(() => openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        ...openaiHistory,
                        { role: "user", content: sectionPromptWithContext },
                    ],
                    temperature: 0.7,
                    max_tokens: 1800,
                }));
                const content = ((_d = (_c = (_b = (_a = sectionRes.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) || "";
                const cleanedContent = cleanGeneratedText(content);
                return `**${title}**\n\n${cleanedContent}`;
            }));
            const blogBody = sections.join("\n\n");
            clog(`📄 OpenAI 섹션 생성 완료: ${sections.length}개`);
            // 4단계: 제목 생성 (전체 컨텍스트 참조)
            const titlePromptWithContext = `Create title:\n${titlePrompt(blogBody)}\n\nSummary: ${reviewSummary.slice(0, 200)}...\nTOC: ${blogIndexes.join(", ")}`;
            const titleRes = await retryWithDelay(() => openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    ...openaiHistory,
                    { role: "user", content: titlePromptWithContext },
                ],
                temperature: 0.7,
                max_tokens: 100,
            }));
            let title = ((_p = (_o = (_m = (_l = titleRes.choices) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.message) === null || _o === void 0 ? void 0 : _o.content) === null || _p === void 0 ? void 0 : _p.trim()) || "";
            if (title.includes("\n")) {
                title = title.split("\n").find((l) => l.trim()) || title;
            }
            clog(`🏷️ OpenAI 제목 생성 완료: ${title}`);
            // 최종 포맷팅: 목차는 볼드로 유지하고 다른 마크다운만 제거
            const cleanBody = blogBody
                .replace(/#{1,6}\s*/g, "") // 마크다운 헤더 제거
                // 볼드 마크다운(**text**)은 유지하고, 단일 이탤릭(*text*)만 제거
                .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1") // 이탤릭만 제거, 볼드는 유지
                .replace(/^\d+\.\s*/gm, "") // 번호 목록 제거
                .replace(/^-\s*/gm, "") // 불릿 포인트 제거
                .split("\n\n")
                .filter((section) => section.trim().length > 0)
                .join("\n\n");
            blogReviewText = `**${title}**\n\n${cleanBody}`;
            // OpenAI 성공 로깅
            if (requestId) {
                const combinedPrompt = `System: ${systemPrompt}\n\nDigest: ${digestPrompt(blogReviews, validatedUserImpression)}\n\nIndex: ${indexPrompt(reviewSummary)}\n\nSection: ${sectionPrompt('[섹션]', reviewSummary)}\n\nTitle: ${titlePrompt(blogBody)}`;
                await logger.updateBlogReview(requestId, {
                    reviewCount: blogReviews.length,
                    reviews: (0, logger_1.truncateArray)(blogReviews, 10),
                    prompt: (0, logger_1.truncateString)(combinedPrompt, 2000),
                    generatedReview: (0, logger_1.truncateString)(blogReviewText, 3000),
                    aiModel: 'openai-gpt4o',
                    processingTime: Date.now() - startTime,
                    requestDate
                });
            }
            clog("✅ OpenAI 최종 블로그 리뷰 생성 완료");
        }
        catch (openAiError) {
            clog("⚠️ OpenAI API 실패:", openAiError.message);
            clog("2차: Gemini API로 블로그 리뷰 생성 시도");
            try {
                const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require("@google/generative-ai")));
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                // 1단계: 리뷰 요약 (재시도 로직 적용)
                const reviewSummary = await retryWithDelay(() => model
                    .generateContent(`${systemPrompt}\n\n${digestPrompt(blogReviews, validatedUserImpression)}`)
                    .then((result) => result.response.text().trim()));
                clog(`📝 Gemini 요약 생성 완료: ${reviewSummary.slice(0, 100)}...`);
                // 2단계: 목차 생성 (재시도 로직 적용)
                const indexPromptWithContext = `${systemPrompt}\n\nCreate TOC:\n${indexPrompt(reviewSummary)}`;
                const indexContent = await retryWithDelay(() => model
                    .generateContent(indexPromptWithContext)
                    .then((result) => result.response.text().trim()));
                const cleanedIndexContent = cleanGeneratedText(indexContent);
                const blogIndexes = cleanedIndexContent
                    .split(/\n|\d+\.\s*/)
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .slice(0, 6);
                clog(`📋 Gemini 목차 생성 완료: ${blogIndexes.length}개`);
                // 3단계: 각 섹션 작성 (재시도 로직 적용)
                const sections = await Promise.all(blogIndexes.map(async (title) => {
                    const sectionPromptWithContext = `${systemPrompt}\n\nWrite "${title}" section:\n${sectionPrompt(title, reviewSummary)}\n\nTOC: ${blogIndexes.join(", ")}`;
                    const content = await retryWithDelay(() => model
                        .generateContent(sectionPromptWithContext)
                        .then((result) => result.response.text().trim()));
                    const cleanedContent = cleanGeneratedText(content);
                    return `**${title}**\n\n${cleanedContent}`;
                }));
                const blogBody = sections.join("\n\n");
                clog(`📄 Gemini 섹션 생성 완료: ${sections.length}개`);
                // 4단계: 제목 생성 (재시도 로직 적용)
                const titlePromptWithContext = `${systemPrompt}\n\nCreate title:\n${titlePrompt(blogBody)}\n\nSummary: ${reviewSummary.slice(0, 200)}...\nTOC: ${blogIndexes.join(", ")}`;
                let title = await retryWithDelay(() => model
                    .generateContent(titlePromptWithContext)
                    .then((result) => result.response.text().trim()));
                if (title.includes("\n")) {
                    title = title.split("\n").find((l) => l.trim()) || title;
                }
                clog(`🏷️ Gemini 제목 생성 완료: ${title}`);
                // 최종 포맷팅: 목차는 볼드로 유지하고 다른 마크다운만 제거
                const cleanBody = blogBody
                    .replace(/#{1,6}\s*/g, "") // 마크다운 헤더 제거
                    // 볼드 마크다운(**text**)은 유지하고, 단일 이탤릭(*text*)만 제거
                    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1") // 이탤릭만 제거, 볼드는 유지
                    .replace(/^\d+\.\s*/gm, "") // 번호 목록 제거
                    .replace(/^-\s*/gm, "") // 불릿 포인트 제거
                    .split("\n\n")
                    .filter((section) => section.trim().length > 0)
                    .join("\n\n");
                blogReviewText = `**${title}**\n\n${cleanBody}`;
                clog("✅ Gemini 최종 블로그 리뷰 생성 완료");
            }
            catch (geminiError) {
                clog("⚠️ Gemini API 실패:", geminiError.message);
                clog("3차: Groq API 시도");
                try {
                    blogReviewText = await tryGroqModels(blogReviews, validatedUserImpression);
                    // Groq 성공 로깅
                    if (requestId) {
                        const combinedPrompt = `System: ${systemPrompt}\n\nDigest: ${digestPrompt(blogReviews, validatedUserImpression)}\n\nGroq Fallback Chain`;
                        await logger.updateBlogReview(requestId, {
                            reviewCount: blogReviews.length,
                            reviews: (0, logger_1.truncateArray)(blogReviews, 10),
                            prompt: (0, logger_1.truncateString)(combinedPrompt, 2000),
                            generatedReview: (0, logger_1.truncateString)(blogReviewText, 3000),
                            aiModel: 'groq-fallback',
                            processingTime: Date.now() - startTime,
                            requestDate
                        });
                    }
                    clog("✅ Groq 최종 블로그 리뷰 생성 완료");
                }
                catch (groqError) {
                    clog("🔥 최종 실패: 모든 LLM 실패");
                    // 모든 LLM 실패 로깅
                    if (requestId) {
                        await logger.updateBlogReview(requestId, {
                            generationError: `All LLMs failed - OpenAI: ${openAiError.message}, Gemini: ${geminiError.message}, Groq: ${groqError.message}`,
                            processingTime: Date.now() - startTime,
                            requestDate
                        });
                    }
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
        if (!blogReviewText || blogReviewText.trim() === "") {
            clog("⚠️ 빈 블로그 리뷰 텍스트 감지");
            res.status(500).json({
                error: "블로그 리뷰 생성 실패",
                detail: "생성된 리뷰 내용이 비어있습니다.",
            });
            return;
        }
        // 안전한 JSON 응답
        try {
            const response = {
                blogReview: blogReviewText,
                impressionValidation: impressionValidationMessage
            };
            res.status(200).json(response);
            clog("✅ 블로그 리뷰 응답 전송 완료");
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
//# sourceMappingURL=generateBlogReviewText.js.map
import { onRequest } from "firebase-functions/v2/https";
import cors = require("cors");
import { ReviewLogger, truncateString, truncateArray } from "./utils/logger";
import { ImpressionValidator } from "./utils/impressionValidator";
import { getCurrentDateString } from "./utils/dateUtils";
import { FirestoreLogger } from "./utils/firestoreLogger";

const clog = (...args: any[]) =>
  console.log("[generateBlogReviewText]", ...args);

const getToneInstruction = (toneMode: string) => {
  switch (toneMode) {
    case 'gentle':
      return "정중하고 예의 바른 존댓말 톤으로 작성해주세요. 품격 있고 신뢰감 있는 표현을 사용하세요.";
    case 'casual':
      return "자연스럽고 친근한 말투로 작성해주세요. 혼잣말하듯 솔직하고 개인적인 느낌을 담아주세요.";
    case 'energetic':
      return "생동감 있고 재미있게 작성해주세요. 이모지를 적극 활용하고 감탄사나 의성어/의태어를 사용하세요.";
    default:
      return "자연스럽고 친근한 말투로 작성해주세요.";
  }
};

const systemPrompt =
  "You are an expert Korean blog writer specializing in EXCLUSIVELY POSITIVE reviews. Write in natural, friendly style for blog readers. Never use '체험' or '경험'. Use CONSISTENT formal speech (존댓말) throughout - always use '~요', '~습니다', '~예요' endings. Use sophisticated but approachable vocabulary. Add emojis sparingly for emphasis. Focus on specific positive details and personal observations. CRITICAL: NEVER include negative comments, complaints, disappointments, or any criticism. Only write about satisfying, pleasant, and recommendable experiences. Transform any negative aspects into positive ones or omit them entirely.";

const digestPrompt = (reviews: string[], userImpression?: string, toneMode?: string) => {
  const basePrompt = `Summarize these place reviews in Korean, focusing on positive aspects:\n\n${reviews.join(
    "\n\n"
  )}\n\n`;
  
  const userImpressionPart = userImpression 
    ? `Also consider this user's personal impression: "${userImpression}"\n\nIntegrate the user's impression naturally if it aligns with the reviews, but prioritize the actual reviews if there are significant discrepancies.\n\n`
    : '';
    
  const toneInstruction = toneMode ? getToneInstruction(toneMode) : "";
  const toneSection = toneInstruction ? `\n\n**Tone & Style Guidelines**: ${toneInstruction}\n` : "";
    
  return basePrompt + userImpressionPart + `**CRITICAL POSITIVE TONE REQUIREMENTS**:
  - ABSOLUTELY NO negative expressions, complaints, disappointments, or criticisms
  - NEVER use words like: 실망, 아쉬움, 별로, 그저그래, 쏘쏘, 못미쳤다, 딱딱해서, 기대에못미쳤다, 불만, 불편
  - ONLY write about satisfying, pleasant, and recommendable experiences
  - Transform any negative aspects mentioned in reviews into positive aspects or omit them entirely
  - Emphasize excellence, satisfaction, and recommendation value

Rules:
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
  4. Ignore negative comments, complaints, or criticisms completely
  5. Emphasize what makes this place special and worth visiting
  6. Use positive expressions like: 맛있었어요, 좋았어요, 만족스러웠어요, 추천해요, 훌륭해요, 완벽해요
  
  IMPORTANT: Respond in Korean only with exclusively positive tone.${toneSection}`;
};

const indexPrompt = (
  summary: string
) => `Create 6 Korean blog section titles based on this summary. Rules:
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

const sectionPrompt = (
  index: string,
  summary: string
) => `Write detailed Korean blog content for: ${index}

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

const titlePrompt = (body: string) =>
  `Create an attractive Korean blog title based on this content. Requirements:
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
const cleanGeneratedText = (text: string): string => {
  return (
    text
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
      .trim()
  );
};

// Groq fallback 함수 - 컨텍스트 연속성 강화
const tryGroqModels = async (blogReviews: string[], userImpression?: string, toneMode?: string): Promise<string> => {
  const system = { role: "system", content: systemPrompt };
  const { default: fetch } = await import("node-fetch");
  const groqModels = [
    "llama3-8b-8192",
    "gemma2-9b-it",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.3-70b-versatile",
    "compound-beta",
  ];

  // Groq용 재시도 헬퍼 함수
  const retryApiCall = async (
    fn: () => Promise<any>,
    retries: number = 2,
    delay: number = 1000
  ): Promise<any> => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries) throw error;
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
      const conversationHistory: any[] = [system];

      const callGroqWithContext = async (
        prompt: string,
        context?: string
      ): Promise<string> => {
        const messages = [...conversationHistory];
        if (context) {
          messages.push({ role: "assistant", content: context });
        }
        messages.push({ role: "user", content: prompt });

        const res = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
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
          }
        );

        // 응답 상태 확인
        if (!res.ok) {
          const errorText = await res.text();
          clog(`❌ Groq API HTTP 오류 (${res.status}):`, errorText);
          throw new Error(
            `Groq API HTTP ${res.status}: ${errorText.slice(0, 200)}`
          );
        }

        // Content-Type 확인
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await res.text();
          clog(`❌ Groq API 비JSON 응답:`, responseText.slice(0, 200));
          throw new Error(
            `Groq API returned non-JSON response: ${responseText.slice(0, 100)}`
          );
        }

        // 안전한 JSON 파싱
        let json;
        try {
          const responseText = await res.text();
          json = JSON.parse(responseText);
        } catch (parseError: any) {
          clog(`❌ Groq API JSON 파싱 실패:`, parseError.message);
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }

        // 응답 구조 검증
        if (
          !json.choices ||
          !Array.isArray(json.choices) ||
          json.choices.length === 0
        ) {
          clog(
            `❌ Groq API 잘못된 응답 구조:`,
            JSON.stringify(json).slice(0, 200)
          );
          throw new Error("Invalid Groq API response structure");
        }

        let content = json.choices?.[0]?.message?.content?.trim() || "";

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
      const summary = await retryApiCall(() =>
        callGroqWithContext(digestPrompt(blogReviews, userImpression))
      );
      clog(`📝 Groq 요약 생성 완료: ${summary.slice(0, 100)}...`);

      // 메모리 최적화: 대화 히스토리 정리
      conversationHistory.length = 1; // system prompt만 유지

      // 2단계: 목차 생성 (재시도 로직 적용)
      const indexRaw = await retryApiCall(() =>
        callGroqWithContext(
          `Create table of contents based on previous summary:\n${indexPrompt(
            summary
          )}`,
          summary.slice(0, 500) // 요약 길이 제한
        )
      );
      const cleanedIndexRaw = cleanGeneratedText(indexRaw);
      const blogIndexes = cleanedIndexRaw
        .split(/\n|\d+\.\s*/)
        .map((x: string) => x.trim())
        .filter(Boolean)
        .slice(0, 6);
      clog(`📋 Groq 목차 생성 완료: ${blogIndexes.length}개`);

      // 메모리 최적화: 대화 히스토리 다시 정리
      conversationHistory.length = 1;

      // 3단계: 각 섹션 작성 (재시도 로직 적용)
      const sections: string[] = [];
      for (const title of blogIndexes) {
        const section = await retryApiCall(() =>
          callGroqWithContext(
            `Write "${title}" section based on summary and TOC:\n${sectionPrompt(
              title,
              summary
            )}`,
            `요약: ${summary.slice(0, 300)}\n목차: ${blogIndexes.join(", ")}`
          )
        );
        const cleanedSection = cleanGeneratedText(section);
        sections.push(`**${title}**\n\n${cleanedSection}`);
        // 각 섹션 후 히스토리 정리
        conversationHistory.length = 1;
      }
      clog(`📄 Groq 섹션 생성 완료: ${sections.length}개`);

      const body = sections.join("\n\n");

      // 4단계: 제목 생성 (재시도 로직 적용)
      let title = await retryApiCall(() =>
        callGroqWithContext(
          `Create title based on all content:\n${titlePrompt(body)}`,
          `요약: ${summary.slice(0, 200)}\n목차: ${blogIndexes.join(
            ", "
          )}\n본문: ${body.slice(0, 200)}...`
        )
      );

      if (title.includes("\n")) {
        title = title.split("\n").find((l: string) => l.trim()) || title;
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
    } catch (groqErr) {
      clog(`❌ Groq 모델 실패: ${model}`, (groqErr as any).message);
    }
  }

  throw new Error("모든 Groq 모델 실패");
};

export const generateBlogReviewText = onRequest(
  {
    memory: "4GiB",
    timeoutSeconds: 300,
    maxInstances: 5,
    secrets: ["OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY"],
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      const startTime = Date.now();
      const requestDate = getCurrentDateString(); // 요청 날짜 생성
      
      // 로깅 정보 추출
      const requestId = req.headers['x-request-id'] as string;
      const logger = ReviewLogger.getInstance();
      
      if (req.method !== "POST") {
        if (requestId) {
          await logger.logError(requestId, "POST 요청만 허용됩니다.", requestDate);
        }
        res.status(405).json({ error: "POST 요청만 허용됩니다." });
        return;
      }

      const { blogReviews, userImpression, toneMode } = req.body;
      if (
        !blogReviews ||
        !Array.isArray(blogReviews) ||
        blogReviews.length === 0
      ) {
        if (requestId) {
          await logger.logError(requestId, "blogReviews 데이터가 필요합니다.", requestDate);
        }
        res.status(400).json({ error: "blogReviews 데이터가 필요합니다." });
        return;
      }

      // User impression 검증 및 필터링
      let validatedUserImpression: string | undefined = undefined;
      let impressionValidationMessage = "";
      
      if (userImpression && typeof userImpression === 'string') {
        const validationResult = ImpressionValidator.validateImpression(userImpression);
        
        if (validationResult.isValid) {
          validatedUserImpression = validationResult.filteredImpression;
          impressionValidationMessage = ImpressionValidator.getValidationMessage(validationResult.reason || 'valid');
          clog("✅ 사용자 감상 검증 통과:", validatedUserImpression);
        } else {
          impressionValidationMessage = ImpressionValidator.getValidationMessage(validationResult.reason || 'invalid');
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
      const retryWithDelay = async (
        fn: () => Promise<any>,
        retries: number = 2,
        delay: number = 1000
      ): Promise<any> => {
        for (let i = 0; i <= retries; i++) {
          try {
            return await fn();
          } catch (error) {
            if (i === retries) throw error;
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
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // OpenAI 대화 히스토리 유지
        const openaiHistory: any[] = [
          { role: "system", content: systemPrompt },
        ];

        // 1단계: 리뷰 요약 (재시도 로직 적용)
        const summaryRes = await retryWithDelay(() =>
          openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              ...openaiHistory,
              { role: "user", content: digestPrompt(blogReviews, validatedUserImpression, toneMode) },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          })
        );
        const reviewSummary =
          summaryRes.choices?.[0]?.message?.content?.trim() || "";

        // 메모리 최적화: 대화 히스토리를 간소화
        openaiHistory.length = 1; // system prompt만 유지
        openaiHistory.push({ role: "assistant", content: reviewSummary });
        clog(`📝 OpenAI 요약 생성 완료: ${reviewSummary.slice(0, 100)}...`);

        // 2단계: 목차 생성 (이전 요약 참조)
        const indexPromptWithContext = `Create TOC based on summary:\n${indexPrompt(
          reviewSummary
        )}`;
        const indexRes = await retryWithDelay(() =>
          openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              ...openaiHistory,
              { role: "user", content: indexPromptWithContext },
            ],
            temperature: 0.7,
            max_tokens: 500,
          })
        );
        const indexContent = cleanGeneratedText(
          indexRes.choices?.[0]?.message?.content || ""
        );
        const blogIndexes = indexContent
          .split(/\n|\d+\.\s*/)
          .map((x: string) => x.trim())
          .filter(Boolean)
          .slice(0, 6);
        openaiHistory.push({ role: "user", content: indexPromptWithContext });
        openaiHistory.push({
          role: "assistant",
          content: indexRes.choices?.[0]?.message?.content || "",
        });
        clog(`📋 OpenAI 목차 생성 완료: ${blogIndexes.length}개`);

        // 3단계: 각 섹션 작성 (요약과 목차 모두 참조, 재시도 로직 적용)
        const sections = await Promise.all(
          blogIndexes.map(async (title: string) => {
            const sectionPromptWithContext = `Write "${title}" section:\n${sectionPrompt(
              title,
              reviewSummary
            )}\n\nTOC: ${blogIndexes.join(", ")}`;
            const sectionRes = await retryWithDelay(() =>
              openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                  ...openaiHistory,
                  { role: "user", content: sectionPromptWithContext },
                ],
                temperature: 0.7,
                max_tokens: 1800,
              })
            );
            const content =
              sectionRes.choices?.[0]?.message?.content?.trim() || "";
            const cleanedContent = cleanGeneratedText(content);
            return `**${title}**\n\n${cleanedContent}`;
          })
        );
        const blogBody = sections.join("\n\n");
        clog(`📄 OpenAI 섹션 생성 완료: ${sections.length}개`);

        // 4단계: 제목 생성 (전체 컨텍스트 참조)
        const titlePromptWithContext = `Create title:\n${titlePrompt(
          blogBody
        )}\n\nSummary: ${reviewSummary.slice(
          0,
          200
        )}...\nTOC: ${blogIndexes.join(", ")}`;
        const titleRes = await retryWithDelay(() =>
          openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              ...openaiHistory,
              { role: "user", content: titlePromptWithContext },
            ],
            temperature: 0.7,
            max_tokens: 100,
          })
        );
        let title = titleRes.choices?.[0]?.message?.content?.trim() || "";
        if (title.includes("\n")) {
          title = title.split("\n").find((l: string) => l.trim()) || title;
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
          const combinedPrompt = `System: ${systemPrompt}\n\nDigest: ${digestPrompt(blogReviews, validatedUserImpression, toneMode)}\n\nIndex: ${indexPrompt(reviewSummary)}\n\nSection: ${sectionPrompt('[섹션]', reviewSummary)}\n\nTitle: ${titlePrompt(blogBody)}`;
          await logger.updateBlogReview(requestId, {
            reviewCount: blogReviews.length,
            reviews: truncateArray(blogReviews, 10),
            prompt: truncateString(combinedPrompt, 2000),
            generatedReview: truncateString(blogReviewText, 3000),
            aiModel: 'openai-gpt4o',
            processingTime: Date.now() - startTime,
            requestDate
          });

          // Firestore에 성공 데이터 저장
          const firestoreLogger = FirestoreLogger.getInstance();
          await firestoreLogger.updateBlogReviewData(requestId, {
            referenceReviewCount: blogReviews.length,
            referenceReviews: truncateArray(blogReviews, 10),
            generationPrompt: truncateString(combinedPrompt, 2000),
            generatedReview: truncateString(blogReviewText, 3000),
            aiModel: 'openai-gpt4o',
            generationSuccess: true,
            crawlingSuccess: true,
            processingTimeSeconds: Math.round((Date.now() - startTime) / 1000)
          });
        }
        
        clog("✅ OpenAI 최종 블로그 리뷰 생성 완료");
      } catch (openAiError: any) {
        clog("⚠️ OpenAI API 실패:", openAiError.message);
        clog("2차: Gemini API로 블로그 리뷰 생성 시도");

        try {
          const { GoogleGenerativeAI } = await import("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(
            process.env.GEMINI_API_KEY as string
          );
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

          // 1단계: 리뷰 요약 (재시도 로직 적용)
          const reviewSummary = await retryWithDelay(() =>
            model
              .generateContent(
                `${systemPrompt}\n\n${digestPrompt(blogReviews, validatedUserImpression, toneMode)}`
              )
              .then((result) => result.response.text().trim())
          );

          clog(`📝 Gemini 요약 생성 완료: ${reviewSummary.slice(0, 100)}...`);

          // 2단계: 목차 생성 (재시도 로직 적용)
          const indexPromptWithContext = `${systemPrompt}\n\nCreate TOC:\n${indexPrompt(
            reviewSummary
          )}`;
          const indexContent = await retryWithDelay(() =>
            model
              .generateContent(indexPromptWithContext)
              .then((result) => result.response.text().trim())
          );
          const cleanedIndexContent = cleanGeneratedText(indexContent);
          const blogIndexes = cleanedIndexContent
            .split(/\n|\d+\.\s*/)
            .map((x: string) => x.trim())
            .filter(Boolean)
            .slice(0, 6);
          clog(`📋 Gemini 목차 생성 완료: ${blogIndexes.length}개`);

          // 3단계: 각 섹션 작성 (재시도 로직 적용)
          const sections = await Promise.all(
            blogIndexes.map(async (title: string) => {
              const sectionPromptWithContext = `${systemPrompt}\n\nWrite "${title}" section:\n${sectionPrompt(
                title,
                reviewSummary
              )}\n\nTOC: ${blogIndexes.join(", ")}`;
              const content = await retryWithDelay(() =>
                model
                  .generateContent(sectionPromptWithContext)
                  .then((result) => result.response.text().trim())
              );
              const cleanedContent = cleanGeneratedText(content);
              return `**${title}**\n\n${cleanedContent}`;
            })
          );
          const blogBody = sections.join("\n\n");
          clog(`📄 Gemini 섹션 생성 완료: ${sections.length}개`);

          // 4단계: 제목 생성 (재시도 로직 적용)
          const titlePromptWithContext = `${systemPrompt}\n\nCreate title:\n${titlePrompt(
            blogBody
          )}\n\nSummary: ${reviewSummary.slice(
            0,
            200
          )}...\nTOC: ${blogIndexes.join(", ")}`;
          let title = await retryWithDelay(() =>
            model
              .generateContent(titlePromptWithContext)
              .then((result) => result.response.text().trim())
          );

          if (title.includes("\n")) {
            title = title.split("\n").find((l: string) => l.trim()) || title;
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
        } catch (geminiError: any) {
          clog("⚠️ Gemini API 실패:", geminiError.message);
          clog("3차: Groq API 시도");

          try {
            blogReviewText = await tryGroqModels(blogReviews, validatedUserImpression, toneMode);
            
            // Groq 성공 로깅
            if (requestId) {
              const combinedPrompt = `System: ${systemPrompt}\n\nDigest: ${digestPrompt(blogReviews, validatedUserImpression, toneMode)}\n\nGroq Fallback Chain`;
              await logger.updateBlogReview(requestId, {
                reviewCount: blogReviews.length,
                reviews: truncateArray(blogReviews, 10),
                prompt: truncateString(combinedPrompt, 2000),
                generatedReview: truncateString(blogReviewText, 3000),
                aiModel: 'groq-fallback',
                processingTime: Date.now() - startTime,
                requestDate
              });

              // Firestore에 성공 데이터 저장
              const firestoreLogger = FirestoreLogger.getInstance();
              await firestoreLogger.updateBlogReviewData(requestId, {
                referenceReviewCount: blogReviews.length,
                referenceReviews: truncateArray(blogReviews, 10),
                generationPrompt: truncateString(combinedPrompt, 2000),
                generatedReview: truncateString(blogReviewText, 3000),
                aiModel: 'groq-fallback',
                generationSuccess: true,
                crawlingSuccess: true,
                processingTimeSeconds: Math.round((Date.now() - startTime) / 1000)
              });
            }
            
            clog("✅ Groq 최종 블로그 리뷰 생성 완료");
          } catch (groqError: any) {
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
      } catch (jsonError: any) {
        clog("❌ JSON 응답 생성 실패:", jsonError.message);
        res.status(500).json({
          error: "응답 생성 실패",
          detail: "JSON 형식 오류",
        });
      }
    });
  }
);

import { onRequest } from "firebase-functions/v2/https";
import cors = require("cors");
import { ReviewLogger, truncateString } from "./utils/logger";

const clog = (...args: any[]) =>
  console.log("[generateVisitorReviewText]", ...args);

const visitorPrompt = (reviews: string[], userImpression?: string) => {
  const basePrompt = `다음은 네이버 지도 방문자 리뷰들이다:\n${reviews.join(
    "\n"
  )}\n`;
  
  const userImpressionPart = userImpression 
    ? `\n그리고 사용자가 직접 작성한 감상은 다음과 같다:\n"${userImpression}"\n\n위 리뷰들과 사용자 감상을 종합적으로 참고하여 한글로 6~8문장 정도의 간결하고 자연스러운 방문자 후기를 작성해줘. 사용자의 감상이 기존 리뷰와 일치한다면 적극 반영하되, 너무 동떨어진 내용이라면 기존 리뷰를 우선시해줘. 다음 요소들을 포함해서 작성해줘:`
    : `\n이 리뷰들을 바탕으로 한글로 6~8문장 정도의 간결하고 자연스러운 방문자 후기를 작성해줘. 다음 요소들을 포함해서 작성해줘:`;
    
  return basePrompt + userImpressionPart + `
1. 방문 동기나 계기
2. 첫인상이나 외관에 대한 느낌
3. 서비스나 음식/제품의 품질
4. 가격 대비 만족도
5. 분위기나 환경
6. 직원들의 친절도나 서비스
7. 다른 사람들에게 추천 여부
8. 재방문 의사
적절한 emoji를 자연스럽게 포함하되 과하지 않게 사용하고, 간결하면서도 핵심적인 경험담을 담아 작성해줘. 

중요한 규칙:
- 설명이나 추가 텍스트 없이 리뷰 내용만 제공해줘
- "네,", "안녕하세요", "오늘은", "여러분" 등의 인사말로 시작하지 말고 바로 본문으로 시작해줘
- "소개합니다", "말씀드릴게요", "이야기해볼게요" 같은 대화형 표현 사용 금지
- 구체적인 방문 경험부터 바로 시작해줘
- 6~8문장으로 간결하게 핵심만 담아서 작성해줘`;
};

const corsMiddleware = cors({
  origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});

const tryGroqVisitorFallback = async (reviews: string[], userImpression?: string) => {
  const prompt = visitorPrompt(reviews, userImpression);
  const { default: fetch } = await import("node-fetch");

  const groqModels = [
    "gemma2-9b-it",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "compound-beta-mini",
  ];

  for (const model of groqModels) {
    try {
      clog(`📡 Groq 모델 시도: ${model}`);
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
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          }),
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

      let content = json.choices?.[0]?.message?.content?.trim();

      // 빈 응답 확인
      if (!content) {
        clog(`❌ Groq API 빈 응답`);
        throw new Error("Empty response from Groq API");
      }

      // 불필요한 접두사 및 인사말 제거
      content = content
        .replace(/^.*here are the generated reviews?:?\s*/i, "")
        .replace(/^.*generated review:?\s*/i, "")
        .replace(/^.*review:?\s*/i, "")
        .replace(/^.*다음은.*리뷰입니다?:?\s*/i, "")
        .replace(/^.*생성된.*리뷰:?\s*/i, "")
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
        .trim();

      if (content) {
        return content;
      }
    } catch (err) {
      clog(`❌ Groq 모델 실패: ${model}`, (err as any).message);
    }
  }

  throw new Error("모든 Groq 모델 실패");
};

export const generateVisitorReviewText = onRequest(
  {
    memory: "256MiB",
    timeoutSeconds: 120,
    maxInstances: 5,
    secrets: ["OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY"],
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      const startTime = Date.now();
      
      // 로깅 정보 추출
      const requestId = req.headers['x-request-id'] as string;
      const logger = ReviewLogger.getInstance();
      
      if (req.method !== "POST") {
        if (requestId) {
          await logger.logError(requestId, "POST 요청만 허용됩니다.");
        }
        res.status(405).json({ error: "POST 요청만 허용됩니다." });
        return;
      }

      const { visitorReviews, userImpression } = req.body;
      if (
        !visitorReviews ||
        !Array.isArray(visitorReviews) ||
        visitorReviews.length === 0
      ) {
        if (requestId) {
          await logger.logError(requestId, "visitorReviews 데이터가 필요합니다.");
        }
        res.status(400).json({ error: "visitorReviews 데이터가 필요합니다." });
        return;
      }

      const prompt = visitorPrompt(visitorReviews, userImpression);
      let visitorReviewText = "";

      try {
        // 시스템 안정화를 위한 의도적 지연 (1-3초 랜덤)
        const initialDelay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
        clog(`⏱️ 시스템 안정화 대기: ${initialDelay}ms`);
        await new Promise((resolve) => setTimeout(resolve, initialDelay));

        clog("1차: OpenAI API로 방문자 리뷰 생성 시도");
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const visitor = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 800,
        });

        const rawContent = visitor.choices?.[0]?.message?.content?.trim() || "";
        // OpenAI 결과에도 동일한 정리 로직 적용
        visitorReviewText = rawContent
          .replace(/^.*다음은.*리뷰입니다?:?\s*/i, "")
          .replace(/^.*생성된.*리뷰:?\s*/i, "")
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
          .trim();
        
        // OpenAI 성공 로깅
        if (requestId) {
          logger.updateVisitorReview(requestId, {
            prompt: truncateString(prompt, 1500),
            generatedReview: truncateString(visitorReviewText, 2000),
            aiModel: 'openai-gpt4o',
            processingTime: Date.now() - startTime
          });
        }
        
        clog("✅ OpenAI 방문자 리뷰 생성 완료");
      } catch (openAiError: any) {
        clog("⚠️ OpenAI API 실패:", openAiError.message);
        clog("2차: Gemini API로 방문자 리뷰 생성 시도");

        try {
          const { GoogleGenerativeAI } = await import("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(
            process.env.GEMINI_API_KEY as string
          );
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const rawContent = response.text().trim();
          // Gemini 결과에도 동일한 정리 로직 적용
          visitorReviewText = rawContent
            .replace(/^.*다음은.*리뷰입니다?:?\s*/i, "")
            .replace(/^.*생성된.*리뷰:?\s*/i, "")
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
            .trim();
          
          // Gemini 성공 로깅
          if (requestId) {
            logger.updateVisitorReview(requestId, {
              prompt: truncateString(prompt, 1500),
              generatedReview: truncateString(visitorReviewText, 2000),
              aiModel: 'gemini-1.5-flash',
              processingTime: Date.now() - startTime
            });
          }
          
          clog("✅ Gemini 방문자 리뷰 생성 완료");
        } catch (geminiError: any) {
          clog("⚠️ Gemini API 실패:", geminiError.message);
          clog("3차: Groq API 시도");

          try {
            visitorReviewText = await tryGroqVisitorFallback(visitorReviews, userImpression);
            
            // Groq 성공 로깅
            if (requestId) {
              logger.updateVisitorReview(requestId, {
                prompt: truncateString(prompt, 1500),
                generatedReview: truncateString(visitorReviewText, 2000),
                aiModel: 'groq-fallback',
                processingTime: Date.now() - startTime
              });
            }
            
            clog("✅ Groq 방문자 리뷰 생성 완료");
          } catch (groqError: any) {
            clog("🔥 최종 실패: 모든 LLM 실패");
            
            // 모든 LLM 실패 로깅
            if (requestId) {
              logger.updateVisitorReview(requestId, {
                generationError: `All LLMs failed - OpenAI: ${openAiError.message}, Gemini: ${geminiError.message}, Groq: ${groqError.message}`,
                processingTime: Date.now() - startTime
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
      if (!visitorReviewText || visitorReviewText.trim() === "") {
        clog("⚠️ 빈 방문자 리뷰 텍스트 감지");
        
        if (requestId) {
          logger.updateVisitorReview(requestId, {
            generationError: "생성된 리뷰 내용이 비어있습니다.",
            processingTime: Date.now() - startTime
          });
        }
        
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
      } catch (jsonError: any) {
        clog("❌ JSON 응답 생성 실패:", jsonError.message);
        
        if (requestId) {
          logger.updateVisitorReview(requestId, {
            generationError: `JSON 응답 생성 실패: ${jsonError.message}`,
            processingTime: Date.now() - startTime
          });
        }
        
        res.status(500).json({
          error: "응답 생성 실패",
          detail: "JSON 형식 오류",
        });
      }
    });
  }
);

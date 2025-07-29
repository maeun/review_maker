import { onRequest } from "firebase-functions/v2/https";
import cors = require("cors");

const clog = (...args: any[]) => console.log("[generateVisitorReviewText]", ...args);

const visitorPrompt = (reviews: string[]) =>
  `다음은 네이버 지도 방문자 리뷰들이다:\n${reviews.join(
    "\n"
  )}\n이 리뷰들을 바탕으로 한글로 3~4문장, 짧고 긍정적이며, 적절한 emoji를 포함한 방문자 리뷰를 생성해줘. 설명이나 추가 텍스트 없이 리뷰 내용만 제공해줘.`;

const corsMiddleware = cors({
  origin: [
    'https://review-maker-nvr.web.app',
    'http://localhost:3000'
  ],
});

export const generateVisitorReviewText = onRequest({
  memory: "256MiB",
  timeoutSeconds: 120,
  secrets: ["OPENAI_API_KEY", "GEMINI_API_KEY"],
}, (req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: "POST 요청만 허용됩니다." });
      return;
    }

    const { visitorReviews } = req.body;
    if (!visitorReviews || !Array.isArray(visitorReviews) || visitorReviews.length === 0) {
      res.status(400).json({ error: "visitorReviews 데이터가 필요합니다." });
      return;
    }

    const prompt = visitorPrompt(visitorReviews);
    let visitorReviewText = "";

    try {
      clog("1차: OpenAI API로 방문자 리뷰 생성 시도");
      const { OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const visitor = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      });
      visitorReviewText = visitor.choices?.[0]?.message?.content?.trim() || "";
      clog("✅ OpenAI 방문자 리뷰 생성 완료");

    } catch (openAiError: any) {
      clog("⚠️ OpenAI API 실패:", openAiError.message);
      clog("2차: Gemini API로 방문자 리뷰 생성 시도");

      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        visitorReviewText = response.text().trim();
        clog("✅ Gemini 방문자 리뷰 생성 완료");

      } catch (geminiError: any) {
        clog("🔥 최종 실패: OpenAI, Gemini API 모두 실패", geminiError.message);
        res.status(500).json({
          error: "모든 LLM에서 리뷰 생성에 실패했습니다.",
          openai_error: openAiError.message,
          gemini_error: geminiError.message,
        });
        return;
      }
    }

    res.status(200).json({
      visitorReview: visitorReviewText,
    });
  });
});

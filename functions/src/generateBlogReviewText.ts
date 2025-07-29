import { onRequest } from "firebase-functions/v2/https";
import cors = require("cors");

const clog = (...args: any[]) => console.log("[generateBlogReviewText]", ...args);

const systemPrompt =
  "You are an expert Korean blog writer. Write in Markdown, soliloquy style ending each sentence with '~다'. Never use '체험' or '경험'. Use informal but rich vocabulary. Add emojis. Don't use honorifics.";

const digestPrompt = (reviews: string[]) =>
  `다음은 블로그 리뷰 모음이다:\n\n${reviews.join(
    "\n\n"
  )}\n\n이 리뷰들을 모두 분석해서, 장소에 대한 통합적 인사이트를 정리해줘.`;

const indexPrompt = (summary: string) => `다음은 블로그 글 작성 조건이다:
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

const sectionPrompt = (index: string, summary: string) => `다음은 블로그 목차의 한 항목이다: ${index}
이 항목에 해당하는 내용을 아래 통합 요약을 바탕으로 길고 풍부하게 작성해줘. Markdown 형식으로, 혼잣말처럼 쓰되 '~다'로 끝나고 이모지를 넣어줘. 중복 없이 MECE하게 작성해.
통합 리뷰 요약:
${summary}`;

const titlePrompt = (body: string) =>
  `아래 블로그 글을 읽고 키워드와 이모지를 포함한 매력적인 제목을 만들어줘. 단 한 줄만 반환해줘:\n\n${body}`;

const corsMiddleware = cors({
  origin: [
    'https://review-maker-nvr.web.app',
    'http://localhost:3000'
  ],
});

export const generateBlogReviewText = onRequest({
  memory: "256MiB",
  timeoutSeconds: 300,
  secrets: ["OPENAI_API_KEY", "GEMINI_API_KEY"],
}, (req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: "POST 요청만 허용됩니다." });
      return;
    }

    const { blogReviews } = req.body;
    if (!blogReviews || !Array.isArray(blogReviews) || blogReviews.length === 0) {
      res.status(400).json({ error: "blogReviews 데이터가 필요합니다." });
      return;
    }

    let blogReviewText = "";

    try {
      clog("1차: OpenAI API로 블로그 리뷰 생성 시도");
      const { OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const summaryRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: digestPrompt(blogReviews) }],
        temperature: 0.7,
        max_tokens: 1000,
      });
      const reviewSummary = summaryRes.choices?.[0]?.message?.content?.trim() || "";

      const indexRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: indexPrompt(reviewSummary) }],
        temperature: 0.7,
        max_tokens: 500,
      });
      const blogIndexes = indexRes.choices?.[0]?.message?.content?.split(/\n|\d+\.\s*/).map((x) => x.trim()).filter(Boolean).slice(0, 6) || [];

      const sections = await Promise.all(
        blogIndexes.map(async (title) => {
          const sectionRes = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: sectionPrompt(title, reviewSummary) }],
            temperature: 0.7,
            max_tokens: 1800,
          });
          return sectionRes.choices?.[0]?.message?.content?.trim() || "";
        })
      );
      const blogBody = sections.join("\n\n");

      const titleRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: titlePrompt(blogBody) }],
        temperature: 0.7,
        max_tokens: 100,
      });
      let title = titleRes.choices?.[0]?.message?.content?.trim() || "";
      if (title.includes("\n")) {
        title = title.split("\n").find((l) => l.trim()) || title;
      }
      blogReviewText = `${title}\n\n${blogBody}`;
      clog("✅ OpenAI 최종 블로그 리뷰 생성 완료");

    } catch (openAiError: any) {
      clog("⚠️ OpenAI API 실패:", openAiError.message);
      clog("2차: Gemini API로 블로그 리뷰 생성 시도");

      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const generateGeminiContent = async (prompt: string) => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        };

        const reviewSummary = await generateGeminiContent(`${systemPrompt}\n\n${digestPrompt(blogReviews)}`);
        
        const indexContent = await generateGeminiContent(`${systemPrompt}\n\n${indexPrompt(reviewSummary)}`);
        const blogIndexes = indexContent.split(/\n|\d+\.\s*/).map((x) => x.trim()).filter(Boolean).slice(0, 6);

        const sections = await Promise.all(
            blogIndexes.map(title => generateGeminiContent(`${systemPrompt}\n\n${sectionPrompt(title, reviewSummary)}`))
        );
        const blogBody = sections.join("\n\n");

        let title = await generateGeminiContent(titlePrompt(blogBody));
        if (title.includes("\n")) {
            title = title.split("\n").find((l) => l.trim()) || title;
        }
        
        blogReviewText = `${title}\n\n${blogBody}`;
        clog("✅ Gemini 최종 블로그 리뷰 생성 완료");

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
      blogReview: blogReviewText,
    });
  });
});

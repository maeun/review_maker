import { OpenAI } from "openai";
import * as functions from "firebase-functions/v2/https";
import * as functionsV1 from "firebase-functions";

const clog = (...args: any[]) => console.log("[generate]", ...args);

const visitorPrompt = (reviews: string[]) =>
  `다음은 네이버 지도 방문자 리뷰들이다:\n${reviews.join(
    "\n"
  )}\n이 리뷰들을 바탕으로 한글로 3~4문장, 짧고 긍정적이며, 적절한 emoji를 포함한 방문자 리뷰를 생성해줘. 설명이나 추가 텍스트 없이 리뷰 내용만 제공해줘.`;

export const generate = functions.onRequest(
  {
    memory: "2GiB",
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async (req, res) => {
    const allowedOrigins = [
      "https://review-maker-nvr.web.app",
      "http://localhost:3000",
      "*",
    ];
    const origin = req.headers.origin;
    res.set(
      "Access-Control-Allow-Origin",
      origin && allowedOrigins.includes(origin) ? origin : "*"
    );
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).end();
      return;
    }

    const { visitorReviews, blogReviews = [] } = req.body;
    if (!visitorReviews || visitorReviews.length === 0) {
      res.status(400).json({ error: "방문자 리뷰 데이터 필요" });
      return;
    }

    const openai = new OpenAI({
      apiKey:
        process.env.OPENAI_API_KEY || functionsV1.config().openai?.key || "",
    });

    let visitorReviewText = "";
    let blogReviewText = "";
    let useGeminiForBlog = false;

    // === 방문자 리뷰 생성 ===
    try {
      const prompt = visitorPrompt(visitorReviews);
      clog("[방문자 리뷰 OpenAI 프롬프트]", prompt);
      const visitor = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      });
      visitorReviewText = visitor.choices?.[0]?.message?.content?.trim() || "";
      clog("[OpenAI 방문자 리뷰 생성 완료]", visitorReviewText);
    } catch (e) {
      clog("[OpenAI 방문자 리뷰 실패 → Gemini fallback 시도]");
      useGeminiForBlog = true;
      try {
        const geminiKey =
          process.env.GEMINI_API_KEY || functionsV1.config().gemini?.key;
        const genaiModule = await import("@google/genai");
        const ai = new genaiModule.GoogleGenAI({ apiKey: geminiKey });

        const prompt = visitorPrompt(visitorReviews);
        clog("[방문자 리뷰 Gemini 프롬프트]", prompt);
        const res = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ parts: [{ text: prompt }] }],
        });
        visitorReviewText = res.text?.trim() || "";
        clog("[Gemini 방문자 리뷰 생성 완료]", visitorReviewText);
      } catch (err) {
        clog("[Gemini 방문자 리뷰 실패]", String(err));
        visitorReviewText = "방문자 리뷰 생성에 실패했습니다.";
      }
    }

    if (!Array.isArray(blogReviews) || blogReviews.length === 0) {
      clog("[블로그 리뷰 없음]");
      res.status(200).json({ visitorReview: visitorReviewText, blogReview: "" });
    }

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

    try {
      if (useGeminiForBlog) {
        const geminiKey =
          process.env.GEMINI_API_KEY || functionsV1.config().gemini?.key;
        const genaiModule = await import("@google/genai");
        const ai = new genaiModule.GoogleGenAI({ apiKey: geminiKey });

        const summaryRes = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ parts: [{ text: digestPrompt(blogReviews) }] }],
        });
        const reviewSummary = summaryRes.text?.trim() || "";

        const indexRes = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ parts: [{ text: indexPrompt(reviewSummary) }] }],
        });
        const blogIndexes = indexRes.text
          ?.split(/\n|\d+\.\s*/)
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 6) || [];

        const sections = await Promise.all(
          blogIndexes.map(async (title) => {
            const sectionRes = await ai.models.generateContent({
              model: "gemini-1.5-flash",
              contents: [{ parts: [{ text: sectionPrompt(title, reviewSummary) }] }],
            });
            return sectionRes.text?.trim() || "";
          })
        );

        const blogBody = sections.join("\n\n");

        const titleRes = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ parts: [{ text: titlePrompt(blogBody) }] }],
        });

        let title = titleRes.text?.trim() || "";
        if (title.includes("\n")) {
          title = title.split("\n").find((l) => l.trim()) || title;
        }

        blogReviewText = `${title}\n\n${blogBody}`;
        clog("[Gemini 최종 블로그 리뷰]", blogReviewText);
      } else {
        const summaryRes = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: digestPrompt(blogReviews) },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });
        const reviewSummary = summaryRes.choices?.[0]?.message?.content?.trim() || "";

        const indexRes = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: indexPrompt(reviewSummary) },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        const blogIndexes = indexRes.choices?.[0]?.message?.content
          ?.split(/\n|\d+\.\s*/)
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 6) || [];

        const sections = await Promise.all(
          blogIndexes.map(async (title) => {
            const sectionRes = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: sectionPrompt(title, reviewSummary) },
              ],
              temperature: 0.7,
              max_tokens: 1800,
            });
            return sectionRes.choices?.[0]?.message?.content?.trim() || "";
          })
        );

        const blogBody = sections.join("\n\n");

        const titleRes = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: titlePrompt(blogBody) },
          ],
          temperature: 0.7,
          max_tokens: 100,
        });

        let title = titleRes.choices?.[0]?.message?.content?.trim() || "";
        if (title.includes("\n")) {
          title = title.split("\n").find((l) => l.trim()) || title;
        }

        blogReviewText = `${title}\n\n${blogBody}`;
        clog("[OpenAI 최종 블로그 리뷰]", blogReviewText);
      }

      // ✅ 최종 응답 전송 (방문자 + 블로그 리뷰)
      res.status(200).json({
        visitorReview: visitorReviewText,
        blogReview: blogReviewText,
      });
    } catch (err) {
      clog("[블로그 리뷰 생성 실패]", String(err));
      res.status(200).json({
        visitorReview: visitorReviewText,
        blogReview: "블로그 리뷰 생성에 실패했습니다.",
      });
    }
  }
);

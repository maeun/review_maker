import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const visitorPrompt = (reviews: string[]) => `다음은 네이버 지도 방문자 리뷰들이다:\n${reviews.join('\n')}\n이 리뷰들을 바탕으로 한글로 4~5문장, 적절한 emoji를 포함한 방문자 리뷰를 생성해줘. 설명이나 추가 텍스트 없이 리뷰 내용만 제공해줘.`;

const blogPrompt = (reviews: string[]) => `다음은 네이버 지도 블로그 리뷰들이다:\n${reviews.join('\n')}\n아래 조건을 모두 지켜서 블로그 리뷰를 작성해줘:\n- 자세한 분석, 긍정적, informal soliloquy, '~다'로 끝나는 문장, '체험'과 '경험' 금지, 키워드 5회 이상, diary style, emoji 포함, 제목 포함\n- 마크다운 형식(#, ## 등) 사용하지 말고 일반 텍스트로 작성\n- 최소 800자 이상의 상세한 리뷰로 작성\n- 설명이나 추가 텍스트 없이 리뷰 내용만 제공해줘`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { visitorReviews, blogReviews } = req.body;
  if (!visitorReviews || !blogReviews) return res.status(400).json({ error: '리뷰 데이터 필요' });

  try {
    const [visitor, blog] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: visitorPrompt(visitorReviews) }],
        temperature: 0.7,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: blogPrompt(blogReviews) }],
        temperature: 0.7,
        max_tokens: 2000, // 더 긴 블로그 리뷰를 위해 토큰 수 증가
      })
    ]);
    res.status(200).json({
      visitorReview: visitor.choices[0].message.content,
      blogReview: blog.choices[0].message.content
    });
  } catch (e) {
    res.status(500).json({ error: '리뷰 생성 실패', detail: String(e) });
  }
} 
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { crawlReviews } from './crawl';
import { generateReviews } from './generate';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/crawl', async (req, res) => {
  try {
    const { placeId } = req.body;
    if (!placeId) {
      res.status(400).json({ error: 'placeId required' });
      return;
    }
    const result = await crawlReviews(placeId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Crawl function error:', error);
    res.status(500).json({
      error: '리뷰 생성 불가',
      detail: error instanceof Error ? error.message : '크롤링에 실패했습니다.'
    });
  }
});

app.post('/generate', async (req, res) => {
  try {
    const { visitorReviews, blogReviews } = req.body;
    if (!visitorReviews || !blogReviews) {
      res.status(400).json({ error: '리뷰 데이터 필요' });
      return;
    }
    const result = await generateReviews(visitorReviews, blogReviews);
    res.status(200).json(result);
  } catch (error) {
    console.error('Generate function error:', error);
    res.status(500).json({
      error: '리뷰 생성 실패',
      detail: error instanceof Error ? error.message : '리뷰 생성에 실패했습니다.'
    });
  }
});

export const api = functions.region('us-central1').https.onRequest(app); 
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = exports.crawl = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Firebase Admin 초기화
admin.initializeApp();
// 크롤링 함수
exports.crawl = functions.https.onRequest(async (req, res) => {
    // CORS 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { placeId } = req.body;
        if (!placeId) {
            res.status(400).json({ error: 'placeId required' });
            return;
        }
        // 크롤링 로직은 별도 파일로 분리
        const { crawlReviews } = await Promise.resolve().then(() => require('./crawl'));
        const result = await crawlReviews(placeId);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Crawl function error:', error);
        res.status(500).json({
            error: '리뷰 생성 불가',
            detail: error instanceof Error ? error.message : '크롤링에 실패했습니다.'
        });
    }
});
// 리뷰 생성 함수
exports.generate = functions.https.onRequest(async (req, res) => {
    // CORS 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { visitorReviews, blogReviews } = req.body;
        if (!visitorReviews || !blogReviews) {
            res.status(400).json({ error: '리뷰 데이터 필요' });
            return;
        }
        // 리뷰 생성 로직은 별도 파일로 분리
        const { generateReviews } = await Promise.resolve().then(() => require('./generate'));
        const result = await generateReviews(visitorReviews, blogReviews);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Generate function error:', error);
        res.status(500).json({
            error: '리뷰 생성 실패',
            detail: error instanceof Error ? error.message : '리뷰 생성에 실패했습니다.'
        });
    }
});
//# sourceMappingURL=index.js.map
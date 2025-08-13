"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateArray = exports.truncateString = exports.detectUserEnvironment = exports.generateRequestId = exports.ReviewLogger = void 0;
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
// Firebase Admin 초기화
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
const clog = (...args) => console.log("[Logger]", ...args);
class ReviewLogger {
    constructor() {
        this.logs = new Map();
    }
    static getInstance() {
        if (!ReviewLogger.instance) {
            ReviewLogger.instance = new ReviewLogger();
        }
        return ReviewLogger.instance;
    }
    // 새로운 요청 로그 시작
    startRequest(requestId, data) {
        const log = {
            requestId,
            requestTime: firestore_1.Timestamp.now(),
            userEnvironment: data.userEnvironment,
            userAgent: data.userAgent,
            requestUrl: data.requestUrl,
            requestType: data.requestType,
            userImpression: data.userImpression,
            version: "1.0",
            success: false
        };
        this.logs.set(requestId, log);
        clog(`📝 요청 로그 시작: ${requestId}`);
    }
    // Place ID 및 크롤링 URL 업데이트
    updateRequestInfo(requestId, data) {
        const log = this.logs.get(requestId);
        if (!log)
            return;
        if (data.placeId)
            log.placeId = data.placeId;
        if (data.crawlingUrl)
            log.crawlingUrl = data.crawlingUrl;
        this.logs.set(requestId, log);
    }
    // 방문자 리뷰 처리 결과 업데이트
    updateVisitorReview(requestId, data) {
        const log = this.logs.get(requestId);
        if (!log)
            return;
        if (!log.visitor)
            log.visitor = {
                reviewCount: 0,
                reviews: [],
                prompt: '',
                generatedReview: '',
                aiModel: '',
                processingTime: 0
            };
        Object.assign(log.visitor, data);
        this.logs.set(requestId, log);
    }
    // 블로그 리뷰 처리 결과 업데이트
    updateBlogReview(requestId, data) {
        const log = this.logs.get(requestId);
        if (!log)
            return;
        if (!log.blog)
            log.blog = {
                reviewCount: 0,
                reviews: [],
                prompt: '',
                generatedReview: '',
                aiModel: '',
                processingTime: 0
            };
        Object.assign(log.blog, data);
        this.logs.set(requestId, log);
    }
    // 블로그 크롤링 정보 업데이트 (crawlBlogReviews용)
    updateBlogCrawling(requestId, data) {
        const log = this.logs.get(requestId);
        if (!log)
            return;
        if (!log.blog)
            log.blog = {
                reviewCount: 0,
                reviews: [],
                prompt: '',
                generatedReview: '',
                aiModel: '',
                processingTime: 0
            };
        if (data.crawledUrls) {
            // crawledUrls는 별도 필드로 저장하거나 reviews 앞에 URL 정보 추가
            log.crawlingUrl = data.crawledUrls.join(', '); // 간단히 URL들을 문자열로 저장
        }
        if (data.reviewCount !== undefined)
            log.blog.reviewCount = data.reviewCount;
        if (data.reviews)
            log.blog.reviews = data.reviews;
        if (data.processingTime)
            log.blog.processingTime = data.processingTime;
        if (data.crawlingError)
            log.blog.crawlingError = data.crawlingError;
        this.logs.set(requestId, log);
    }
    // 요청 완료 및 Firestore 저장
    async finishRequest(requestId, data) {
        const log = this.logs.get(requestId);
        if (!log)
            return;
        log.totalProcessingTime = data.totalProcessingTime;
        log.success = data.success;
        if (data.errorMessage)
            log.errorMessage = data.errorMessage;
        try {
            // Firestore에 저장
            await db.collection('review_requests').doc(requestId).set(log);
            clog(`✅ 요청 로그 저장 완료: ${requestId}`);
            // 메모리에서 제거
            this.logs.delete(requestId);
        }
        catch (error) {
            clog(`❌ 요청 로그 저장 실패: ${requestId}`, error);
        }
    }
    // 에러 발생 시 로그 저장
    async logError(requestId, error) {
        var _a;
        const log = this.logs.get(requestId);
        if (!log)
            return;
        const startTime = ((_a = log.requestTime) === null || _a === void 0 ? void 0 : _a.toMillis()) || Date.now();
        const totalTime = Date.now() - startTime;
        await this.finishRequest(requestId, {
            totalProcessingTime: totalTime,
            success: false,
            errorMessage: error
        });
    }
}
exports.ReviewLogger = ReviewLogger;
// 유틸리티 함수들
const generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
exports.generateRequestId = generateRequestId;
const detectUserEnvironment = (userAgent) => {
    if (!userAgent)
        return 'unknown';
    const mobileRegex = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent) ? 'mobile' : 'desktop';
};
exports.detectUserEnvironment = detectUserEnvironment;
const truncateString = (str, maxLength = 1000) => {
    if (str.length <= maxLength)
        return str;
    return str.substring(0, maxLength) + '...';
};
exports.truncateString = truncateString;
const truncateArray = (arr, maxItems = 50) => {
    if (arr.length <= maxItems)
        return arr;
    return arr.slice(0, maxItems);
};
exports.truncateArray = truncateArray;
//# sourceMappingURL=logger.js.map
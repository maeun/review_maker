"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateArray = exports.truncateString = exports.detectUserEnvironment = exports.generateRequestId = exports.ReviewLogger = void 0;
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const dateUtils_1 = require("./dateUtils");
// Firebase Admin 초기화
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
const clog = (...args) => console.log("[Logger]", ...args);
class ReviewLogger {
    constructor() { }
    static getInstance() {
        if (!ReviewLogger.instance) {
            ReviewLogger.instance = new ReviewLogger();
        }
        return ReviewLogger.instance;
    }
    /**
     * 일자별 구조로 로그 문서 경로 생성
     * 구조: daily_logs/{YYYYMMDD}/requests/{requestId}
     */
    getLogDoc(requestId, requestDate) {
        const dateStr = requestDate || (0, dateUtils_1.getCurrentDateString)();
        return db.collection('daily_logs').doc(dateStr).collection('requests').doc(requestId);
    }
    /**
     * 일자별 통계 문서 경로 생성
     * 구조: daily_logs/{YYYYMMDD}/stats/summary
     */
    getStatsDoc(requestDate) {
        const dateStr = requestDate || (0, dateUtils_1.getCurrentDateString)();
        return db.collection('daily_logs').doc(dateStr).collection('stats').doc('summary');
    }
    /**
     * 새로운 요청 로그 시작
     */
    async startRequest(requestId, data) {
        const requestTime = firestore_1.Timestamp.now();
        const requestDate = (0, dateUtils_1.getCurrentDateString)();
        const log = {
            requestId,
            requestTime,
            requestDate,
            userEnvironment: data.userEnvironment,
            requestUrl: data.requestUrl,
            requestType: data.requestType,
            version: "2.0",
            success: false,
            totalProcessingTime: 0
        };
        // undefined 값들을 안전하게 처리
        if (data.userAgent !== undefined) {
            log.userAgent = data.userAgent;
        }
        if (data.userImpression !== undefined && data.userImpression.trim() !== '') {
            log.userImpression = data.userImpression;
        }
        await this.getLogDoc(requestId, requestDate).set(log);
        clog(`📝 요청 로그 시작 (${requestDate}): ${requestId}`);
        // 일자별 통계 업데이트
        await this.updateDailyStats(requestDate, 'request_started');
    }
    /**
     * Place ID 및 크롤링 URL 업데이트
     */
    async updateRequestInfo(requestId, data) {
        const updateData = {};
        if (data.placeId)
            updateData.placeId = data.placeId;
        if (data.crawlingUrl)
            updateData.crawlingUrl = data.crawlingUrl;
        await this.getLogDoc(requestId, data.requestDate).set(updateData, { merge: true });
    }
    /**
     * 방문자 리뷰 처리 결과 업데이트
     */
    async updateVisitorReview(requestId, data) {
        const updateData = { visitor: data };
        await this.getLogDoc(requestId, data.requestDate).set(updateData, { merge: true });
        // 성공적인 방문자 리뷰 생성 시 통계 업데이트
        if (data.generatedReview && !data.generationError) {
            const dateStr = data.requestDate || (0, dateUtils_1.getCurrentDateString)();
            await this.updateDailyStats(dateStr, 'visitor_review_generated', data.aiModel);
        }
    }
    /**
     * 블로그 리뷰 처리 결과 업데이트
     */
    async updateBlogReview(requestId, data) {
        const updateData = { blog: data };
        await this.getLogDoc(requestId, data.requestDate).set(updateData, { merge: true });
        // 성공적인 블로그 리뷰 생성 시 통계 업데이트
        if (data.generatedReview && !data.generationError) {
            const dateStr = data.requestDate || (0, dateUtils_1.getCurrentDateString)();
            await this.updateDailyStats(dateStr, 'blog_review_generated', data.aiModel);
        }
    }
    /**
     * 블로그 크롤링 정보 업데이트 (crawlBlogReviews용)
     */
    async updateBlogCrawling(requestId, data) {
        const updateData = {};
        if (data.crawledUrls) {
            updateData['blog.crawlingUrl'] = data.crawledUrls.join(', ');
        }
        if (data.reviewCount !== undefined)
            updateData['blog.reviewCount'] = data.reviewCount;
        if (data.reviews)
            updateData['blog.reviews'] = data.reviews;
        if (data.processingTime)
            updateData['blog.processingTime'] = data.processingTime;
        if (data.crawlingError)
            updateData['blog.crawlingError'] = data.crawlingError;
        await this.getLogDoc(requestId, data.requestDate).set({ blog: updateData }, { merge: true });
    }
    /**
     * 요청 완료 처리
     */
    async finishRequest(requestId, data) {
        const finalData = {
            totalProcessingTime: data.totalProcessingTime,
            success: data.success,
        };
        if (data.errorMessage) {
            finalData.errorMessage = data.errorMessage;
        }
        const dateStr = data.requestDate || (0, dateUtils_1.getCurrentDateString)();
        await this.getLogDoc(requestId, dateStr).set(finalData, { merge: true });
        clog(`✅ 요청 로그 저장 완료 (${dateStr}): ${requestId}`);
        // 일자별 통계 업데이트
        await this.updateDailyStats(dateStr, data.success ? 'request_completed' : 'request_failed');
    }
    /**
     * 에러 발생 시 로그 저장
     */
    async logError(requestId, error, requestDate) {
        var _a;
        const dateStr = requestDate || (0, dateUtils_1.getCurrentDateString)();
        const logDoc = await this.getLogDoc(requestId, dateStr).get();
        const logData = logDoc.data();
        const startTime = ((_a = logData === null || logData === void 0 ? void 0 : logData.requestTime) === null || _a === void 0 ? void 0 : _a.toMillis()) || Date.now();
        const totalTime = Date.now() - startTime;
        await this.finishRequest(requestId, {
            totalProcessingTime: totalTime,
            success: false,
            errorMessage: error,
            requestDate: dateStr
        });
    }
    /**
     * 일자별 통계 업데이트
     */
    async updateDailyStats(dateStr, eventType, aiModel) {
        try {
            const statsRef = this.getStatsDoc(dateStr);
            await db.runTransaction(async (transaction) => {
                const statsDoc = await transaction.get(statsRef);
                let stats;
                if (statsDoc.exists) {
                    stats = statsDoc.data();
                }
                else {
                    // 새로운 일자별 통계 초기화
                    stats = {
                        date: dateStr,
                        totalRequests: 0,
                        successfulRequests: 0,
                        failedRequests: 0,
                        averageProcessingTime: 0,
                        visitorReviewsGenerated: 0,
                        blogReviewsGenerated: 0,
                        topPlaces: [],
                        userEnvironments: { mobile: 0, desktop: 0, unknown: 0 },
                        aiModelUsage: {},
                        lastUpdated: firestore_1.Timestamp.now()
                    };
                }
                // 이벤트 타입에 따른 통계 업데이트
                switch (eventType) {
                    case 'request_started':
                        stats.totalRequests += 1;
                        break;
                    case 'request_completed':
                        stats.successfulRequests += 1;
                        break;
                    case 'request_failed':
                        stats.failedRequests += 1;
                        break;
                    case 'visitor_review_generated':
                        stats.visitorReviewsGenerated += 1;
                        if (aiModel) {
                            stats.aiModelUsage[aiModel] = (stats.aiModelUsage[aiModel] || 0) + 1;
                        }
                        break;
                    case 'blog_review_generated':
                        stats.blogReviewsGenerated += 1;
                        if (aiModel) {
                            stats.aiModelUsage[aiModel] = (stats.aiModelUsage[aiModel] || 0) + 1;
                        }
                        break;
                }
                stats.lastUpdated = firestore_1.Timestamp.now();
                transaction.set(statsRef, stats);
            });
            clog(`📊 일자별 통계 업데이트 (${dateStr}): ${eventType}`);
        }
        catch (error) {
            clog(`❌ 일자별 통계 업데이트 실패 (${dateStr}):`, error);
        }
    }
    /**
     * 특정 날짜의 통계 조회
     */
    async getDailyStats(dateStr) {
        try {
            const statsDoc = await this.getStatsDoc(dateStr).get();
            if (statsDoc.exists) {
                return statsDoc.data();
            }
            return null;
        }
        catch (error) {
            clog(`❌ 일자별 통계 조회 실패 (${dateStr}):`, error);
            return null;
        }
    }
    /**
     * 날짜 범위의 요청 로그 조회
     */
    async getRequestsByDateRange(startDate, endDate, limit = 100) {
        try {
            const requests = [];
            // 날짜별로 순차 조회 (비효율적이지만 Firestore 구조상 필요)
            const dates = this.generateDateRange(startDate, endDate);
            for (const date of dates) {
                const snapshot = await db
                    .collection('daily_logs')
                    .doc(date)
                    .collection('requests')
                    .orderBy('requestTime', 'desc')
                    .limit(limit)
                    .get();
                snapshot.forEach(doc => {
                    requests.push(doc.data());
                });
                if (requests.length >= limit)
                    break;
            }
            return requests.slice(0, limit);
        }
        catch (error) {
            clog(`❌ 날짜 범위 요청 조회 실패:`, error);
            return [];
        }
    }
    /**
     * 날짜 범위 생성 헬퍼
     */
    generateDateRange(startDate, endDate) {
        const dates = [];
        const start = new Date(parseInt(startDate.substring(0, 4)), parseInt(startDate.substring(4, 6)) - 1, parseInt(startDate.substring(6, 8)));
        const end = new Date(parseInt(endDate.substring(0, 4)), parseInt(endDate.substring(4, 6)) - 1, parseInt(endDate.substring(6, 8)));
        const current = new Date(start);
        while (current <= end) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');
            dates.push(`${year}${month}${day}`);
            current.setDate(current.getDate() + 1);
        }
        return dates.reverse(); // 최신 날짜부터
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
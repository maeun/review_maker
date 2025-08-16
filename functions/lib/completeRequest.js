"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeRequest = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors = require("cors");
const logger_1 = require("./utils/logger");
const firestoreLogger_1 = require("./utils/firestoreLogger");
const clog = (...args) => console.log("[completeRequest]", ...args);
const corsMiddleware = cors({
    origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});
exports.completeRequest = (0, https_1.onRequest)({
    memory: "256MiB",
    timeoutSeconds: 60,
    maxInstances: 10,
}, (req, res) => {
    corsMiddleware(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "POST 요청만 허용됩니다." });
            return;
        }
        const { requestId, success, totalProcessingTime, errorMessage } = req.body;
        if (!requestId) {
            res.status(400).json({ error: "requestId가 필요합니다." });
            return;
        }
        const logger = logger_1.ReviewLogger.getInstance();
        const firestoreLogger = firestoreLogger_1.FirestoreLogger.getInstance();
        try {
            // 기존 메모리 로깅
            await logger.finishRequest(requestId, {
                totalProcessingTime: totalProcessingTime || 0,
                success: success || false,
                errorMessage
            });
            // Firestore 요청 완료 로깅
            await firestoreLogger.completeRequest(requestId, success || false, Math.round((totalProcessingTime || 0) / 1000) // 밀리초를 초로 변환
            );
            clog(`✅ 요청 완료 로그 저장 (메모리 + Firestore): ${requestId}`);
            res.status(200).json({ success: true, message: "로그 저장 완료" });
        }
        catch (error) {
            clog(`❌ 요청 완료 로그 저장 실패: ${requestId}`, error);
            res.status(500).json({ error: "로그 저장 실패", detail: error });
        }
    });
});
//# sourceMappingURL=completeRequest.js.map
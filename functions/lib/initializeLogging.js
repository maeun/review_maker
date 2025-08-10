"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeLogging = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors = require("cors");
const logger_1 = require("./utils/logger");
const clog = (...args) => console.log("[initializeLogging]", ...args);
const corsMiddleware = cors({
    origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});
exports.initializeLogging = (0, https_1.onRequest)({
    memory: "128MiB",
    timeoutSeconds: 30,
    maxInstances: 10,
}, (req, res) => {
    corsMiddleware(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "POST 요청만 허용됩니다." });
            return;
        }
        const { requestId, requestUrl, requestType, userImpression } = req.body;
        const userEnvironment = req.headers['x-user-environment'];
        const userAgent = req.headers['x-user-agent'];
        if (!requestId || !requestUrl || !requestType) {
            res.status(400).json({ error: "requestId, requestUrl, requestType이 필요합니다." });
            return;
        }
        const logger = logger_1.ReviewLogger.getInstance();
        try {
            logger.startRequest(requestId, {
                userEnvironment: userEnvironment || 'unknown',
                userAgent,
                requestUrl,
                requestType,
                userImpression: userImpression || ""
            });
            clog(`✅ 로깅 초기화 완료: ${requestId}`);
            res.status(200).json({ success: true, message: "로깅 초기화 완료" });
        }
        catch (error) {
            clog(`❌ 로깅 초기화 실패: ${requestId}`, error);
            res.status(500).json({ error: "로깅 초기화 실패", detail: error });
        }
    });
});
//# sourceMappingURL=initializeLogging.js.map
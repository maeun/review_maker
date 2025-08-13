import { onRequest } from "firebase-functions/v2/https";
import cors = require("cors");
import { ReviewLogger } from "./utils/logger";

const clog = (...args: any[]) => console.log("[completeRequest]", ...args);

const corsMiddleware = cors({
  origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});

export const completeRequest = onRequest(
  {
    memory: "256MiB",
    timeoutSeconds: 60,
    maxInstances: 10,
  },
  (req, res) => {
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

      const logger = ReviewLogger.getInstance();

      try {
        await logger.finishRequest(requestId, {
          totalProcessingTime: totalProcessingTime || 0,
          success: success || false,
          errorMessage
        });

        clog(`✅ 요청 완료 로그 저장: ${requestId}`);
        res.status(200).json({ success: true, message: "로그 저장 완료" });
      } catch (error) {
        clog(`❌ 요청 완료 로그 저장 실패: ${requestId}`, error);
        res.status(500).json({ error: "로그 저장 실패", detail: error });
      }
    });
  }
);
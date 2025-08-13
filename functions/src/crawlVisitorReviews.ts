import { onRequest } from "firebase-functions/v2/https";
import cors = require("cors");
import { ReviewLogger, truncateArray } from "./utils/logger";

const clog = (...args: any[]) => console.log("[crawlVisitorReviews]", ...args);

const corsMiddleware = cors({
  origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});

function extractPlaceId(url: string): string | null {
  // 데스크탑 환경: /place/숫자 패턴
  const placeMatch = url.match(/place\/(\d+)/);
  if (placeMatch) {
    return placeMatch[1];
  }

  // 모바일 환경: pinId 파라미터
  const pinIdMatch = url.match(/[?&]pinId=(\d+)/);
  if (pinIdMatch) {
    return pinIdMatch[1];
  }

  return null;
}

// 모바일 환경에서 더 안정적인 URL 리다이렉트 처리
async function resolveShortUrl(inputUrl: string): Promise<string> {
  if (!inputUrl.includes("naver.me")) {
    return inputUrl;
  }

  clog(`🔗 단축 URL 감지: ${inputUrl}`);

  let finalUrl = inputUrl;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      clog(`🔄 리다이렉트 시도 ${attempts}/${maxAttempts}: ${finalUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(finalUrl, {
        method: "HEAD",
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const location = response.headers.get("location");
      if (location) {
        finalUrl = location.startsWith("http")
          ? location
          : `https://map.naver.com${location}`;
        clog(`🔀 리다이렉트 발견: ${finalUrl}`);

        // placeId 또는 pinId가 포함된 URL인지 확인
        if (finalUrl.includes("/place/") || finalUrl.includes("pinId=")) {
          return finalUrl;
        }
      } else {
        // HEAD 요청이 실패하면 GET으로 시도
        clog(`🔄 HEAD 실패, GET 요청으로 재시도`);
        const getController = new AbortController();
        const getTimeoutId = setTimeout(() => getController.abort(), 15000);

        const getResponse = await fetch(finalUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
          },
          signal: getController.signal,
        });

        clearTimeout(getTimeoutId);
        const resolvedUrl = getResponse.url;
        clog(`🔀 GET 요청으로 최종 URL 확인: ${resolvedUrl}`);
        return resolvedUrl;
      }
    } catch (error: any) {
      clog(`❌ 리다이렉트 시도 ${attempts} 실패:`, error.message);
      if (attempts === maxAttempts) {
        // 마지막 시도로 직접 GET 요청
        try {
          const fallbackController = new AbortController();
          const fallbackTimeoutId = setTimeout(
            () => fallbackController.abort(),
            20000
          );

          const fallbackResponse = await fetch(inputUrl, {
            signal: fallbackController.signal,
          });

          clearTimeout(fallbackTimeoutId);
          const fallbackUrl = fallbackResponse.url;
          clog(`🔀 Fallback GET 요청으로 최종 URL: ${fallbackUrl}`);
          return fallbackUrl;
        } catch (fallbackError: any) {
          clog(`❌ Fallback도 실패:`, fallbackError.message);
          throw new Error(`단축 URL 해석 실패: ${fallbackError.message}`);
        }
      }
    }
  }

  return finalUrl;
}

export const crawlVisitorReviews = onRequest(
  {
    memory: "4GiB",
    timeoutSeconds: 180,
    maxInstances: 5,
  },
  (req, res) => {
    corsMiddleware(req, res, async () => {
      const startTime = Date.now();
      let inputUrl = req.query.url as string;
      
      // 로깅 정보 추출
      const requestId = req.headers['x-request-id'] as string;
      const userEnvironment = req.headers['x-user-environment'] as string;
      const userAgent = req.headers['x-user-agent'] as string;
      const requestType = req.headers['x-request-type'] as string;
      
      const logger = ReviewLogger.getInstance();
      
      if (!inputUrl) {
        if (requestId) {
          await logger.logError(requestId, "url 파라미터가 필요합니다.");
        }
        res.status(400).json({ error: "url 파라미터가 필요합니다." });
        return;
      }
      
      // 로깅 시작 (아직 시작되지 않은 경우)
      if (requestId && userEnvironment) {
        const parsedRequestType = requestType ? JSON.parse(requestType) : { visitor: true, blog: false };
        logger.startRequest(requestId, {
          userEnvironment: userEnvironment as 'mobile' | 'desktop' | 'unknown',
          userAgent,
          requestUrl: inputUrl,
          requestType: parsedRequestType
        });
      }

      let browser: any;

      try {
        // 시스템 안정화를 위한 의도적 지연 (1-3초 랜덤)
        const initialDelay = Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms
        clog(`⏱️ 시스템 안정화 대기: ${initialDelay}ms`);
        await new Promise((resolve) => setTimeout(resolve, initialDelay));

        // 단축 URL 해석
        inputUrl = await resolveShortUrl(inputUrl);

        const placeId = extractPlaceId(inputUrl);
        if (!placeId) {
          res
            .status(400)
            .json({ error: "placeId를 url에서 추출할 수 없습니다." });
          return;
        }

        const targetUrl = `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,2,dh&placePath=/review`;
        const chromium = require("chrome-aws-lambda");

        clog(`🧭 Crawling 시작: placeId=${placeId}`);
        clog(`🎯 대상 URL: ${targetUrl}`);

        // Chrome 실행 재시도 로직 (spawn EFAULT 오류 방지)
        let browserLaunchAttempts = 0;
        const maxBrowserAttempts = 3;

        while (browserLaunchAttempts < maxBrowserAttempts) {
          try {
            browserLaunchAttempts++;
            clog(
              `🚀 Chrome 실행 시도 ${browserLaunchAttempts}/${maxBrowserAttempts}`
            );

            browser = await chromium.puppeteer.launch({
              args: [
                ...chromium.args,
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
                "--no-zygote",
                "--disable-extensions",
                "--disable-plugins",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
<<<<<<< HEAD
                "--disable-features=TranslateUI,VizDisplayCompositor",
                "--disable-ipc-flooding-protection",
                "--memory-pressure-off",
                "--max_old_space_size=4096",
                "--disable-web-security",
                "--disable-features=site-per-process",
                "--disable-hang-monitor",
                "--disable-client-side-phishing-detection",
                "--disable-prompt-on-repost",
                "--disable-default-apps"
=======
                "--disable-features=TranslateUI",
                "--disable-ipc-flooding-protection",
                "--memory-pressure-off",
                "--max_old_space_size=4096",
>>>>>>> b77f91ac51b395cead68dcb8ea894be86c01e03c
              ],
              defaultViewport: chromium.defaultViewport,
              executablePath: await chromium.executablePath,
              headless: chromium.headless,
<<<<<<< HEAD
              timeout: 60000, // 60초로 늘림
              protocolTimeout: 60000, // 프로토콜 타임아웃 추가
              ignoreDefaultArgs: ["--disable-extensions"],
              ignoreHTTPSErrors: true,
=======
              timeout: 45000,
              ignoreDefaultArgs: ["--disable-extensions"],
>>>>>>> b77f91ac51b395cead68dcb8ea894be86c01e03c
            });

            clog(`✅ Chrome 실행 성공 (시도 ${browserLaunchAttempts})`);
            break;
          } catch (launchError: any) {
            clog(
              `❌ Chrome 실행 실패 (시도 ${browserLaunchAttempts}):`,
              launchError.message
            );

            if (browser) {
              try {
                await browser.close();
              } catch (closeError) {
                clog(`⚠️ 브라우저 종료 실패:`, closeError);
              }
              browser = null;
            }

            if (browserLaunchAttempts === maxBrowserAttempts) {
              throw new Error(
                `Chrome 실행 실패 (${maxBrowserAttempts}번 시도): ${launchError.message}`
              );
            }

<<<<<<< HEAD
            // 재시도 전 잠시 대기 (지수 백오프)
            const delayMs = Math.min(5000 * Math.pow(2, browserLaunchAttempts - 1), 15000);
            clog(`⏱️ 재시도 전 대기: ${delayMs}ms`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
=======
            // 재시도 전 잠시 대기
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 * browserLaunchAttempts)
            );
>>>>>>> b77f91ac51b395cead68dcb8ea894be86c01e03c
          }
        }

        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
        await page.setExtraHTTPHeaders({
          "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        });

        await page.setRequestInterception(true);
        page.on("request", (req: any) => {
          if (
            ["image", "stylesheet", "font", "media"].includes(
              req.resourceType()
            )
          ) {
            req.abort();
          } else {
            req.continue();
          }
        });

        await page.goto(targetUrl, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        await page.waitForSelector("#entryIframe", { timeout: 30000 });
        const iframe = await page.$("#entryIframe");
        const frame = await iframe!.contentFrame();
        if (!frame) throw new Error("iframe을 찾을 수 없습니다.");

        let visitorReviews: string[] = [];
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            await frame.waitForSelector("a[role='tab']", { timeout: 15000 });
            const tabButtons = await frame.$$("a[role='tab']");
            let reviewTabClicked = false;
            for (const btn of tabButtons) {
              const text = await btn.evaluate((el: Element) => el.textContent);
              if (text && (text.includes("리뷰") || text.includes("방문자"))) {
                await btn.click();
                reviewTabClicked = true;
                clog("✅ 리뷰 탭 클릭 성공");
                break;
              }
            }
            if (!reviewTabClicked)
              throw new Error("리뷰 탭을 찾을 수 없습니다.");

            await frame.waitForTimeout(3000);
            clog("📜 스크롤 시작");
            for (let i = 0; i < 3; i++) {
              await frame.evaluate(() => window.scrollBy(0, 800));
              await frame.waitForTimeout(2000);
              clog(`📜 스크롤 ${i + 1}/3 완료`);
            }
            clog("📜 스크롤 완료");

            visitorReviews = await frame.evaluate(() => {
              const selectors = [
                ".pui__vn15t2",
                "[data-testid='review-item']",
                ".review_item",
                ".visitor-review",
                ".review-content",
                ".Lia3P",
                ".YeINN",
              ];
              for (const selector of selectors) {
                const nodes = document.querySelectorAll(selector);
                if (nodes.length > 0) {
                  return Array.from(nodes)
                    .map((el) => el.textContent?.trim() || "")
                    .filter(Boolean);
                }
              }
              return [];
            });

            clog(
              `✅ [시도 ${attempt}] 방문자 리뷰 ${visitorReviews.length}개 추출됨`
            );
            if (visitorReviews.length > 0) break;
          } catch (e) {
            clog(`[시도 ${attempt}] 리뷰 수집 실패:`, e);
            await frame.waitForTimeout(2000);
          }
        }

        if (visitorReviews.length === 0) {
          throw new Error("방문자 리뷰를 가져올 수 없습니다.");
        }

        // 성공 시 로깅 업데이트
        if (requestId) {
          const processingTime = Date.now() - startTime;
          logger.updateRequestInfo(requestId, {
            placeId,
            crawlingUrl: targetUrl
          });
          
          logger.updateVisitorReview(requestId, {
            reviewCount: visitorReviews.length,
            reviews: truncateArray(visitorReviews, 30),
            processingTime
          });
        }

        res.status(200).json({
          visitorReviews,
          visitorReviewCount: visitorReviews.length,
          placeId,
        });
      } catch (err: any) {
        clog("🔥 처리 실패:", err);
        
        // 실패 시 로깅 업데이트
        if (requestId) {
          logger.updateVisitorReview(requestId, {
            crawlingError: err.message,
            processingTime: Date.now() - startTime
          });
        }
        
        res.status(500).json({
          error: "방문자 리뷰 수집에 실패했습니다.",
          detail: err.message,
        });
      } finally {
        if (browser) {
          await browser.close();
          clog("🧹 브라우저 종료됨");
        }
      }
    });
  }
);

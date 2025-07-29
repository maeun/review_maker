import { onRequest } from "firebase-functions/v2/https";
import cors = require("cors");

const clog = (...args: any[]) => console.log("[crawlBlogReviews]", ...args);

const corsMiddleware = cors({
  origin: [
    'https://review-maker-nvr.web.app',
    'http://localhost:3000'
  ],
});

const extractPlaceId = (url: string): string | null => {
  const match = url.match(/place\/(\d+)/);
  return match ? match[1] : null;
};

export const crawlBlogReviews = onRequest({
  memory: "2GiB",
  timeoutSeconds: 540,
  maxInstances: 5
}, (req, res) => {
  corsMiddleware(req, res, async () => {
    const inputUrl = req.query.url as string;
    if (!inputUrl) {
      res.status(400).json({ error: "url 파라미터가 필요합니다." });
      return;
    }

    let browser;

    try {
      const placeId = extractPlaceId(inputUrl);
      if (!placeId) {
        throw new Error("URL에서 placeId를 추출할 수 없습니다. URL 형식을 확인해주세요: " + inputUrl);
      }
      clog(`🆔 추출된 placeId: ${placeId}`);

      const chromiumModule = await import("chrome-aws-lambda");
      const chromium = chromiumModule.default;

      clog(`🧭 Blog Crawling 시작`);

      browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        timeout: 30000,
      });

      const page = await browser.newPage();
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      await page.setExtraHTTPHeaders({ 'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' });
      await page.setRequestInterception(true);
      page.on('request', (req) => {
          if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
              req.abort();
          }
          else {
              req.continue();
          }
      });

      const targetUrl = `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,2,dh&placePath=/review`;
      clog(`🔄 리뷰 페이지로 이동: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 60000 });

      await page.waitForSelector("#entryIframe", { timeout: 30000 });
      const iframe = await page.$("#entryIframe");
      const frame = await iframe!.contentFrame();
      if (!frame) throw new Error("iframe을 찾을 수 없습니다.");

      let blogLinks: string[] = [];
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          clog(`[시도 ${attempt}] 블로그 리뷰 탭 클릭 및 링크 추출 시작`);

          if (attempt === 1) {
            clog('⚙️ Iframe 초기화 시작 (방문자 리뷰 탭 클릭)');
            const visitorTabXPath = "//a[@role='tab' and (contains(., '리뷰') or contains(., '방문자'))]";
            await frame.waitForXPath(visitorTabXPath, { timeout: 15000 });
            const [visitorTabElement] = await frame.$x(visitorTabXPath);
            if (visitorTabElement) {
              await (visitorTabElement as any).click();
              clog('👍 Iframe 초기화 완료');
              await frame.waitForTimeout(2000);
            } else {
               clog('⚠️ Iframe 초기화 실패 (방문자 리뷰 탭을 찾을 수 없음)');
            }
          }
          
          const blogTabXPath = "//a[@role='tab' and contains(., '블로그')]";
          await frame.waitForXPath(blogTabXPath, { timeout: 10000 });
          const [blogTabElement] = await frame.$x(blogTabXPath);

          if (blogTabElement) {
            await (blogTabElement as any).click();
            clog('🖱️ 블로그 리뷰 탭 클릭 성공');
          } else {
            throw new Error("블로그 리뷰 탭을 찾을 수 없습니다.");
          }
          
          await frame.waitForTimeout(3000);

          await frame.waitForSelector(".EblIP", { timeout: 10000 });
          const extractedLinks = await frame.evaluate(() => {
            const elements = Array.from(document.getElementsByClassName("EblIP"));
            const urls: string[] = [];
            for (const el of elements) {
              const aTag = el.querySelector("a");
              const href = aTag?.href || "";
              if (aTag && aTag instanceof HTMLAnchorElement && href && !href.includes("cafe.naver.com")) {
                urls.push(href);
              }
            }
            return urls;
          });

          if (extractedLinks.length > 0) {
            blogLinks = extractedLinks;
            clog(`✅ [시도 ${attempt}] 블로그 링크 ${blogLinks.length}개 추출 성공`);
            break;
          } else {
            throw new Error("블로그 링크 컨테이너는 찾았지만, 링크가 비어있습니다.");
          }
        } catch (e: any) {
          clog(`❌ [시도 ${attempt}] 실패: ${e.message}`);
          if (attempt === 5) {
            const iframeContent = await frame.evaluate(() => document.body.innerHTML);
            clog("❗ Iframe HTML at time of failure:", iframeContent);
            throw new Error(`5번의 시도 후에도 블로그 리뷰 링크를 가져올 수 없습니다: ${e.message}`);
          }
          await page.waitForTimeout(2000 + attempt * 1000);
        }
      }

      if (blogLinks.length === 0) {
          throw new Error("최종적으로 블로그 리뷰 링크를 찾을 수 없습니다.");
      }
      clog(`🔗 블로그 리뷰 링크 ${blogLinks.length}개 수집됨`);

      const blogReviews: string[] = [];
      for (const url of blogLinks.slice(0, 10)) {
        try {
          const blogPage = await browser.newPage();
          await blogPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
          await blogPage.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
          
          const iframeElement = await blogPage.$("iframe");
          if (iframeElement) {
            const src = await iframeElement.evaluate((el: Element) => el.getAttribute("src"));
            if (src && src.startsWith("/")) {
              const realUrl = "https://blog.naver.com" + src;
              await blogPage.goto(realUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
            }
          }
          
          await blogPage.waitForSelector("div.se-main-container, div#postViewArea", { timeout: 20000 });
          
          for (let i = 0; i < 5; i++) {
            await blogPage.evaluate(() => window.scrollBy(0, window.innerHeight));
            await blogPage.waitForTimeout(500);
          }

          const text = await blogPage.evaluate(() => {
            const se = document.querySelector("div.se-main-container");
            if (se) return (se as HTMLElement).innerText.replace(/\n/g, " ").trim();
            const legacy = document.querySelector("div#postViewArea");
            if (legacy) return (legacy as HTMLElement).innerText.replace(/\n/g, " ").trim();
            return "";
          });

          if(text) {
            blogReviews.push(text);
            clog(`📝 [블로그 본문 추출 완료] ${url.slice(0,40)}...`);
          }
          await blogPage.close();
        } catch (e: any) {
          clog(`❌ [블로그 본문 크롤링 실패] ${url}`, e.message);
        }
      }
      
      if (blogReviews.length === 0) {
          throw new Error("블로그 리뷰 내용을 가져올 수 없습니다.");
      }
      clog(`✅ 블로그 리뷰 ${blogReviews.length}개 추출됨`);

      res.status(200).json({
        blogReviews,
        blogReviewCount: blogReviews.length,
      });

    } catch (err: any) {
      clog("🔥 처리 실패:", err);
      res.status(500).json({
        error: "블로그 리뷰 수집에 실패했습니다.",
        detail: err.message,
      });
    } finally {
      if (browser) {
        await browser.close();
        clog('🧹 Browser closed');
      }
    }
  });
});

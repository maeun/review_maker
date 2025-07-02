import type { NextApiRequest, NextApiResponse } from "next";
import chromium from "chrome-aws-lambda";
import { extractPlaceId } from "../../utils/extractPlaceId";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  let { placeId } = req.body;
  if (!placeId) return res.status(400).json({ error: "placeId required" });

  // placeId가 URL 형태로 들어온 경우 숫자만 추출
  if (placeId && typeof placeId === "string" && !/^\d+$/.test(placeId)) {
    const extracted = extractPlaceId(placeId);
    if (!extracted)
      return res.status(400).json({ error: "유효한 placeId를 추출할 수 없습니다." });
    placeId = extracted;
  }

  let browser;
  try {
    browser = await chromium.puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      timeout: 60000,
    });
    const page = await browser.newPage();

    // User-Agent 설정
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(`https://map.naver.com/p/entry/place/${placeId}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // 페이지 로딩 대기
    await page.waitForTimeout(3000);

    // entryIframe 진입
    const entryFrameElement = await page.waitForSelector("#entryIframe", {
      timeout: 10000,
    });
    if (!entryFrameElement)
      throw new Error("entryIframe element를 찾을 수 없습니다.");
    const entryFrame = await entryFrameElement.contentFrame();
    if (!entryFrame) throw new Error("entryIframe을 찾을 수 없습니다.");

    // 방문자 리뷰 크롤링
    let visitorReviews: string[] = [];
    try {
      // 리뷰 탭 찾기 및 클릭 (iframe 내부)
      await entryFrame.waitForSelector(".veBoZ", { timeout: 10000 });
      const tabButtons = await entryFrame.$$(".veBoZ");
      for (const btn of tabButtons) {
        const text = await btn.evaluate((el) => el.textContent);
        if (text && text.includes("리뷰")) {
          await btn.click();
          break;
        }
      }
      // 탭 전환 대기
      await entryFrame.waitForTimeout(2000);
      // 방문자 리뷰 추출 (iframe 내부)
      visitorReviews = await entryFrame.evaluate(() => {
        const nodes = document.querySelectorAll(".pui__vn15t2");
        return Array.from(nodes)
          .map((el) => el.textContent?.trim() || "")
          .filter(Boolean);
      });
      console.log(`방문자 리뷰 ${visitorReviews.length}개 추출됨`);
      console.log("방문자 리뷰 내용:", visitorReviews);
    } catch (e) {
      console.log("방문자 리뷰 크롤링 실패:", e);
      throw new Error(
        "방문자 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 리뷰를 확인해주세요."
      );
    }

    // 블로그 리뷰 크롤링
    let blogReviews: string[] = [];
    try {
      // 블로그 리뷰 탭 클릭 (iframe 내부, XPATH 사용)
      const blogTabBtnHandles = await entryFrame.$x(
        "/html/body/div[3]/div/div/div/div[6]/div[2]/div/a[2]"
      );
      if (blogTabBtnHandles.length > 0) {
        // Puppeteer의 click은 ElementHandle<Element>에서만 동작하므로 as ElementHandle<Element>로 캐스팅
        await (blogTabBtnHandles[0] as any).click();
      } else {
        throw new Error("블로그 리뷰 탭을 찾을 수 없습니다.");
      }
      // 블로그 리뷰 카드 로딩 대기 (EblIP)
      await entryFrame.waitForSelector(".EblIP", { timeout: 10000 });
      // 블로그 리뷰 카드에서 a 태그 href 추출
      const blogLinks = await entryFrame.evaluate(() => {
        const elements = Array.from(document.querySelectorAll(".EblIP a"));
        return elements
          .map((el) => (el as HTMLAnchorElement).href)
          .filter(Boolean);
      });
      if (blogLinks.length === 0) {
        const debugHtml = await entryFrame.evaluate(
          () => document.body.innerHTML
        );
        console.log(
          "블로그 리뷰 카드가 감지되지 않음. body.innerHTML 일부:",
          debugHtml.slice(0, 2000)
        );
      }
      // 각 블로그 리뷰 링크에서 본문 텍스트 추출
      for (const url of blogLinks.slice(0, 10)) {
        try {
          const blogPage = await browser.newPage();
          await blogPage.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 20000,
          });
          // 블로그 본문 iframe이 있으면 src로 재접속
          const iframeElement = await blogPage.$("iframe");
          if (iframeElement) {
            const src = await iframeElement.evaluate((el) =>
              el.getAttribute("src")
            );
            if (src && src.startsWith("/")) {
              const realUrl = "https://blog.naver.com" + src;
              await blogPage.goto(realUrl, {
                waitUntil: "domcontentloaded",
                timeout: 20000,
              });
            }
          }
          // 본문 텍스트 추출
          const text = await blogPage.evaluate(() => {
            const se = document.querySelector("div.se-main-container");
            if (se) return se.textContent?.replace(/\n/g, "").trim() || "";
            const legacy = document.querySelector("div#postViewArea");
            if (legacy)
              return legacy.textContent?.replace(/\n/g, "").trim() || "";
            return "네이버 블로그는 맞지만, 확인불가";
          });
          if (text && text.length > 10) blogReviews.push(text);
          await blogPage.close();
        } catch (err) {
          // 개별 블로그 실패는 무시
        }
      }
      console.log(`블로그 리뷰 ${blogReviews.length}개 추출됨`);
      console.log("블로그 리뷰 내용:", blogReviews);
    } catch (e) {
      console.log("블로그 리뷰 크롤링 실패:", e);
      throw new Error(
        "블로그 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 블로그 리뷰를 확인해주세요."
      );
    }

    // 최소한의 리뷰가 있는지 확인
    if (visitorReviews.length === 0) {
      throw new Error("방문자 리뷰가 없습니다. 다른 장소를 시도해주세요.");
    }

    if (blogReviews.length === 0) {
      throw new Error("블로그 리뷰가 없습니다. 다른 장소를 시도해주세요.");
    }

    res.status(200).json({
      visitorReviews,
      blogReviews,
      visitorReviewCount: visitorReviews.length,
      blogReviewCount: blogReviews.length,
    });
  } catch (e) {
    console.error("크롤링 오류:", e);
    res.status(500).json({
      error: "리뷰 생성 불가",
      detail:
        e instanceof Error
          ? e.message
          : "크롤링에 실패했습니다. 다른 장소를 시도해주세요.",
    });
  } finally {
    if (browser) await browser.close();
  }
}

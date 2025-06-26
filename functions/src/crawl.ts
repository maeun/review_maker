import { extractPlaceId } from "./extractPlaceId";
import { Request, Response } from "express";
import type { ElementHandle } from "puppeteer-core";

export const crawlHandler = async (req: Request, res: Response) => {
  let { placeId } = req.body;
  if (!placeId) return res.status(400).json({ error: "placeId required" });

  // placeId가 URL 형태로 들어온 경우 숫자만 추출
  if (placeId && typeof placeId === "string" && !/^\d+$/.test(placeId)) {
    const extracted = extractPlaceId(placeId);
    if (!extracted)
      return res.status(400).json({ error: "유효한 placeId를 추출할 수 없습니다." });
    placeId = extracted;
  }

  let puppeteerLib: any;
  let launchOptions: any; // 타입 오류 우회
  let browser: any;
  try {
    if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV === "development") {
      puppeteerLib = require("puppeteer");
      launchOptions = {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      };
    } else {
      const chromium = require("chrome-aws-lambda");
      puppeteerLib = require("puppeteer-core");
      const executablePath = await chromium.executablePath || process.env.GOOGLE_CHROME_BIN;
      if (!executablePath) {
        res.status(500).json({ error: "Chrome 실행 파일을 찾을 수 없습니다. chrome-aws-lambda가 바이너리를 제공하지 않습니다." });
        return;
      }
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
    }
    browser = await puppeteerLib.launch(launchOptions);
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.goto(`https://map.naver.com/p/entry/place/${placeId}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    const entryFrameElement = await page.waitForSelector("#entryIframe", {
      timeout: 10000,
    });
    if (!entryFrameElement) {
      res.status(500).json({ error: "entryIframe element를 찾을 수 없습니다." });
      return;
    }
    const entryFrame = await entryFrameElement.contentFrame();
    if (!entryFrame) {
      res.status(500).json({ error: "entryIframe을 찾을 수 없습니다." });
      return;
    }

    // 방문자 리뷰 크롤링
    let visitorReviews: string[] = [];
    try {
      await entryFrame.waitForSelector(".veBoZ", { timeout: 10000 });
      const tabButtons = await entryFrame.$$(".veBoZ");
      for (const btn of tabButtons) {
        const text = await btn.evaluate((el: any) => el.textContent);
        if (text && text.includes("리뷰")) {
          await btn.click();
          break;
        }
      }
      await entryFrame.waitForTimeout(2000);
      visitorReviews = await entryFrame.evaluate(() => {
        const nodes = document.querySelectorAll(".pui__vn15t2");
        return Array.from(nodes)
          .map((el) => el.textContent?.trim() || "")
          .filter(Boolean);
      });
    } catch (e) {
      res.status(500).json({
        error: "방문자 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 리뷰를 확인해주세요.",
      });
      return;
    }

    // 블로그 리뷰 크롤링
    let blogReviews: string[] = [];
    try {
      const blogTabBtnHandles = await entryFrame.$x(
        "/html/body/div[3]/div/div/div/div[6]/div[2]/div/a[2]"
      );
      if (blogTabBtnHandles.length > 0) {
        // ElementHandle 변환 오류 우회
        await (blogTabBtnHandles[0] as unknown as ElementHandle<Element>).click();
      } else {
        res.status(500).json({ error: "블로그 리뷰 탭을 찾을 수 없습니다." });
        return;
      }
      await entryFrame.waitForSelector(".EblIP", { timeout: 10000 });
      const blogLinks = await entryFrame.evaluate(() => {
        const elements = Array.from(document.querySelectorAll(".EblIP a"));
        return elements
          .map((el) => (el as HTMLAnchorElement).href)
          .filter(Boolean);
      });
      for (const url of blogLinks.slice(0, 10)) {
        try {
          const blogPage = await browser.newPage();
          await blogPage.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 20000,
          });
          const iframeElement = await blogPage.$("iframe");
          if (iframeElement) {
            const src = await iframeElement.evaluate((el: any) =>
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
    } catch (e) {
      res.status(500).json({
        error: "블로그 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 블로그 리뷰를 확인해주세요.",
      });
      return;
    }

    if (visitorReviews.length === 0) {
      res.status(500).json({ error: "방문자 리뷰가 없습니다. 다른 장소를 시도해주세요." });
      return;
    }
    if (blogReviews.length === 0) {
      res.status(500).json({ error: "블로그 리뷰가 없습니다. 다른 장소를 시도해주세요." });
      return;
    }

    res.status(200).json({
      visitorReviews,
      blogReviews,
      visitorReviewCount: visitorReviews.length,
      blogReviewCount: blogReviews.length,
    });
    return;
  } catch (e) {
    res.status(500).json({
      error: "리뷰 생성 불가",
      detail:
        e instanceof Error
          ? e.message
          : "크롤링에 실패했습니다. 다른 장소를 시도해주세요.",
    });
    return;
  } finally {
    if (browser) await browser.close();
  }
};

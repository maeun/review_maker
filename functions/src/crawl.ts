import * as functions from "firebase-functions/v2/https";
import chromium from "chrome-aws-lambda";
import { generateReviews } from "./generate";

// placeId 추출 함수
function extractPlaceId(url: string): string | null {
  const match = url.match(/place\/(\d+)/);
  return match ? match[1] : null;
}

export const crawl = functions.onRequest({ 
  memory: "2GiB", 
  timeoutSeconds: 540,
  maxInstances: 1
}, async (req, res) => {
  // CORS 헤더 추가
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 프리플라이트 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const inputUrl = req.query.url as string;
  if (!inputUrl) {
    res.status(400).json({ error: "url 파라미터가 필요합니다." });
    return;
  }
  
  const placeId = extractPlaceId(inputUrl);
  if (!placeId) {
    res.status(400).json({ error: "placeId를 url에서 추출할 수 없습니다." });
    return;
  }
  
  const targetUrl = `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,2,dh&placePath=/review`;
  let browser;
  
  try {
    console.log(` Starting crawl for placeId: ${placeId}`);
    console.log(` Target URL: ${targetUrl}`);
    
    browser = await chromium.puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      timeout: 30000,  // 30초로 단축
    });
    
    console.log(' Browser launched successfully');
    
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({
      'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });
    await page.setViewport({ width: 1280, height: 800 });
    
    // 리소스 차단 설정
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    console.log(' Navigating to target URL...');
    await page.goto(targetUrl, { 
      waitUntil: "domcontentloaded", 
      timeout: 30000 
    });
    
    console.log(' Page loaded, waiting for iframe...');
    
    // 네이버 맵은 iframe 구조이므로, iframe 진입
    await page.waitForSelector("#entryIframe", { timeout: 30000 });
    const iframe = await page.$("#entryIframe");
    const frame = await iframe!.contentFrame();
    
    if (!frame) {
      throw new Error("iframe을 찾을 수 없습니다.");
    }
    
    console.log(' Iframe found, waiting for reviews...');
    
    // 리뷰가 로드될 때까지 대기
    try {
      await frame.waitForSelector(".pui__vn15t2", { timeout: 60000 });
      console.log(' Reviews found');
    } catch (e) {
      console.log(' No reviews found, returning empty result');
      res.status(200).json({ 
        placeId, 
        reviews: "", 
        finalReview: "리뷰가 없습니다.",
        error: "리뷰를 찾을 수 없습니다."
      });
      if (browser) await browser.close();
      return;
    }

    // 방문자 리뷰 텍스트 추출
    const reviews = await frame.evaluate(() => {
      const reviewElements = Array.from(document.querySelectorAll(".pui__vn15t2"));
      return reviewElements.map(el => el.textContent?.trim() || "").join(" ");
    });
    
    console.log(` Extracted ${reviews.length} characters of reviews`);

    // OpenAI 기반 리뷰 생성
    console.log(' Generating AI review...');
    const { visitorReview } = await generateReviews([reviews], []);
    const finalReview = visitorReview || "리뷰 생성 실패";
    
    console.log(' Crawl completed successfully');
    res.status(200).json({ placeId, reviews, finalReview });
    
  } catch (err) {
    console.error(' Crawl failed:', err);
    console.error('Error details:', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      placeId,
      targetUrl
    });
    
    res.status(500).json({ 
      error: "크롤링에 실패했습니다.", 
      detail: err instanceof Error ? err.message : String(err),
      placeId,
      targetUrl
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log(' Browser closed');
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
  }
});

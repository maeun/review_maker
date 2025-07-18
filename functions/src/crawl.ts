import * as functions from "firebase-functions/v2/https";
import chromium from "chrome-aws-lambda";

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
  const allowedOrigins = [
    'https://review-maker-nvr.web.app',
    'http://localhost:3000'
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', 'https://review-maker-nvr.web.app');
  }
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
    console.log(`Starting crawl for placeId: ${placeId}`);
    console.log(`Target URL: ${targetUrl}`);
    
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
      timeout: 30000,
    });
    
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
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
    
    console.log('Navigating to target URL...');
    await page.goto(targetUrl, { 
      waitUntil: "domcontentloaded", 
      timeout: 30000 
    });
    
    console.log('Page loaded, waiting for iframe...');
    
    // 네이버 맵은 iframe 구조이므로, iframe 진입
    await page.waitForSelector("#entryIframe", { timeout: 30000 });
    const iframe = await page.$("#entryIframe");
    const frame = await iframe!.contentFrame();
    
    if (!frame) {
      throw new Error("iframe을 찾을 수 없습니다.");
    }
    
    console.log('Iframe found, waiting for reviews...');
    
    // entryIframe 내부에 또 다른 iframe이 있는지 확인 (이전 복원 버전에서는 사용하지 않으므로 제거)
    // let reviewFrame = frame;
    // const innerIframeElement = await frame.$('iframe');
    // if (innerIframeElement) {
    //   const innerFrame = await innerIframeElement.contentFrame();
    //   if (innerFrame) reviewFrame = innerFrame;
    // }

    // 방문자 리뷰 크롤링 (재시도 로직 포함)
    let visitorReviews: string[] = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        // 리뷰 탭 찾기 및 클릭 (iframe 내부) - 더 유연하게
        await frame.waitForSelector("a[role='tab']", { timeout: 15000 });
        const tabButtons = await frame.$$("a[role='tab']");
        let reviewTabClicked = false;
        for (const btn of tabButtons) {
          const text = await btn.evaluate((el) => el.textContent);
          console.log(`[시도 ${attempt}] 탭 텍스트:`, text);
          if (text && (text.includes("리뷰") || text.includes("방문자"))) {
            await btn.click();
            reviewTabClicked = true;
            console.log(`[시도 ${attempt}] 리뷰 탭 클릭됨`);
            break;
          }
        }
        if (!reviewTabClicked) throw new Error("리뷰 탭을 찾을 수 없습니다.");
        // 탭 전환 대기
        await frame.waitForTimeout(3000);
        // 스크롤을 통해 더 많은 리뷰 로드
        for (let i = 0; i < 3; i++) {
          await frame.evaluate(() => {
            window.scrollBy(0, 800);
          });
          await frame.waitForTimeout(2000);
        }
        // 방문자 리뷰 추출 (iframe 내부) - 여러 셀렉터 시도
        visitorReviews = await frame.evaluate(() => {
          // 여러 가능한 셀렉터 시도
          const selectors = [
            ".pui__vn15t2",
            "[data-testid='review-item']",
            ".review_item",
            ".visitor-review",
            ".review-content"
          ];
          let reviews: string[] = [];
          for (const selector of selectors) {
            const nodes = document.querySelectorAll(selector);
            if (nodes.length > 0) {
              reviews = Array.from(nodes)
                .map((el) => el.textContent?.trim() || "")
                .filter(Boolean);
              console.log(`셀렉터 ${selector}로 ${reviews.length}개 리뷰 찾음`);
              break;
            }
          }
          return reviews;
        });
        console.log(`[시도 ${attempt}] 방문자 리뷰 ${visitorReviews.length}개 추출됨`);
        console.log(`[시도 ${attempt}] 방문자 리뷰 내용:`, visitorReviews);
        if (visitorReviews.length > 0) break; // 성공 시 즉시 종료
      } catch (e) {
        console.log(`[시도 ${attempt}] 방문자 리뷰 크롤링 실패:`, e);
        await frame.waitForTimeout(2000); // 다음 시도 전 대기
      }
    }
    if (visitorReviews.length === 0) {
      const debugHtml = await frame.evaluate(() => document.body.innerHTML);
      console.log("방문자 리뷰가 없음. body.innerHTML 일부:", debugHtml.slice(0, 3000));
      throw new Error("방문자 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 리뷰를 확인해주세요.");
    }

    // 블로그 리뷰 크롤링 - 일시적으로 비활성화
    let blogReviews: string[] = [];
    /*
    try {
      // 블로그 리뷰 탭 클릭 (iframe 내부, CSS 셀렉터 사용)
      const blogTabElement = await frame.$('a.YsfhA[role="tab"]');
      if (blogTabElement) {
        await blogTabElement.click();
        // 탭 클릭 후 충분히 대기
        await frame.waitForTimeout(4000);
        // 스크롤을 여러 번 내려서 더 많은 리뷰가 로드되도록 함
        for (let i = 0; i < 5; i++) {
          await frame.evaluate(() => {
            window.scrollBy(0, 1000);
          });
          await frame.waitForTimeout(1500); // 스크롤 후 대기
        }
      } else {
        throw new Error("블로그 리뷰 탭을 찾을 수 없습니다.");
      }
      // 블로그 리뷰 카드 로딩 대기 (EblIP)
      await frame.waitForSelector(".EblIP", { timeout: 30000 });
      // 블로그 리뷰 카드에서 a 태그 href 추출
      const blogLinks = await frame.evaluate(() => {
        const elements = Array.from(document.querySelectorAll(".EblIP a"));
        return elements
          .map((el) => (el as HTMLAnchorElement).href)
          .filter(Boolean);
      });
      if (blogLinks.length === 0) {
        const debugHtml = await frame.evaluate(() => document.body.innerHTML);
        console.log("블로그 리뷰 카드가 감지되지 않음. body.innerHTML 일부:", debugHtml.slice(0, 2000));
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
    } catch (e) {
      console.log("블로그 리뷰 크롤링 실패:", e);
      throw new Error("블로그 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 블로그 리뷰를 확인해주세요.");
    }
    */
    console.log("블로그 리뷰 크롤링은 일시적으로 비활성화됨");

    // 최소한의 리뷰가 있는지 확인 - 방문자 리뷰만 체크
    if (visitorReviews.length === 0) {
      throw new Error("방문자 리뷰가 없습니다. 다른 장소를 시도해주세요.");
    }

    // 블로그 리뷰가 없어도 방문자 리뷰가 있으면 성공
    console.log('Crawl completed successfully');

    // 크롤링 후 자동으로 generate 함수 호출
    let generatedReview = null;
    try {
      const fetch = (await import('node-fetch')).default;
      const generateUrl = 'https://us-central1-review-maker-nvr.cloudfunctions.net/generate';
      const genRes = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorReviews, blogReviews: [] })
      });
      if (genRes.ok) {
        generatedReview = await genRes.json();
        console.log('[generate 호출 결과]', generatedReview);
      } else {
        console.error('[generate 호출 실패]', await genRes.text());
      }
    } catch (e) {
      console.error('[generate 호출 중 예외]', e);
    }

    res.status(200).json({
      visitorReviews,
      blogReviews,
      visitorReviewCount: visitorReviews.length,
      blogReviewCount: blogReviews.length,
      generatedReview,
    });
    
  } catch (err) {
    console.error('Crawl failed:', err);
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
        console.log('Browser closed');
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
  }
});

import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { placeId } = req.body;
  if (!placeId) return res.status(400).json({ error: 'placeId required' });

  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: 'new', 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    const page = await browser.newPage();
    
    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(`https://map.naver.com/p/entry/place/${placeId}`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // 페이지 로딩 대기
    await page.waitForTimeout(3000);

    // 방문자 리뷰 크롤링
    let visitorReviews: string[] = [];
    try {
      // 리뷰 탭 찾기 및 클릭
      await page.waitForSelector('.veBoZ', { timeout: 10000 });
      const tabButtons = await page.$$('.veBoZ');
      
      for (const btn of tabButtons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.includes('리뷰')) {
          await btn.click();
          break;
        }
      }
      
      // 탭 전환 대기
      await page.waitForTimeout(2000);
      
      // 방문자 리뷰 추출
      visitorReviews = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.pui__vn15t2');
        return Array.from(nodes).map(el => el.textContent?.trim() || '').filter(Boolean);
      });
      
      console.log(`방문자 리뷰 ${visitorReviews.length}개 추출됨`);
    } catch (e) {
      console.log('방문자 리뷰 크롤링 실패:', e);
      throw new Error('방문자 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 리뷰를 확인해주세요.');
    }

    // 블로그 리뷰 크롤링
    let blogReviews: string[] = [];
    try {
      // 블로그 리뷰 탭 찾기 및 클릭
      await page.waitForSelector('.veBoZ', { timeout: 10000 });
      const blogTabButtons = await page.$$('.veBoZ');
      
      for (const btn of blogTabButtons) {
        const text = await btn.evaluate(el => el.textContent);
        if (text && text.includes('블로그 리뷰')) {
          await btn.click();
          break;
        }
      }
      
      // 탭 전환 대기
      await page.waitForTimeout(2000);
      
      // 블로그 리뷰 추출
      blogReviews = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.MKLdN');
        return Array.from(nodes).map(el => el.textContent?.trim() || '').filter(Boolean);
      });
      
      console.log(`블로그 리뷰 ${blogReviews.length}개 추출됨`);
    } catch (e) {
      console.log('블로그 리뷰 크롤링 실패:', e);
      throw new Error('블로그 리뷰를 가져올 수 없습니다. 네이버 지도에서 해당 장소의 블로그 리뷰를 확인해주세요.');
    }

    // 최소한의 리뷰가 있는지 확인
    if (visitorReviews.length === 0) {
      throw new Error('방문자 리뷰가 없습니다. 다른 장소를 시도해주세요.');
    }
    
    if (blogReviews.length === 0) {
      throw new Error('블로그 리뷰가 없습니다. 다른 장소를 시도해주세요.');
    }

    res.status(200).json({ 
      visitorReviews, 
      blogReviews,
      visitorReviewCount: visitorReviews.length,
      blogReviewCount: blogReviews.length
    });
  } catch (e) {
    console.error('크롤링 오류:', e);
    res.status(500).json({ 
      error: '리뷰 생성 불가', 
      detail: e instanceof Error ? e.message : '크롤링에 실패했습니다. 다른 장소를 시도해주세요.'
    });
  } finally {
    if (browser) await browser.close();
  }
} 
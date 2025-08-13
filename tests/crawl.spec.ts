import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('crawl visitor reviews', async ({ page }) => {
  await page.goto(`file://${path.resolve(process.cwd(), 'naver_place_review.html')}`);

  const reviews = await page.evaluate(() => {
    const reviewElements = document.querySelectorAll('li.place_apply_pui.EjjAW');
    const reviewsData: { author: string; reviewText: string; votedKeywords: string[] }[] = [];

    reviewElements.forEach(element => {
      const author = (element.querySelector('.pui__NMi-Dp') as HTMLElement)?.innerText.trim();
      const reviewText = (element.querySelector('.pui__vn15t2 a') as HTMLElement)?.innerText.trim();
      const votedKeywords: string[] = [];
      element.querySelectorAll('.pui__jhpEyP').forEach(keywordElement => {
        votedKeywords.push((keywordElement as HTMLElement).innerText.trim());
      });

      if (author && reviewText) {
        reviewsData.push({
          author,
          reviewText,
          votedKeywords,
        });
      }
    });

    return reviewsData;
  });

  const outputFilePath = path.resolve(process.cwd(), 'functions', 'visitor_reviews.json');
  fs.writeFileSync(outputFilePath, JSON.stringify(reviews, null, 2));

  console.log(`Successfully extracted and saved ${reviews.length} visitor reviews to ${outputFilePath}`);
});

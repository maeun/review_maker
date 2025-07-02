import { test, expect } from '@playwright/test';

test('basic page load test', async ({ page }) => {
  // 페이지 로딩
  await page.goto('http://localhost:3000');
  
  // 페이지가 로드되었는지 확인
  await expect(page).toHaveTitle(/Review|리뷰/);
  
  // 기본 UI 요소들이 존재하는지 확인
  await expect(page.locator('body')).toBeVisible();
  
  // 입력 필드가 있는지 확인 (placeholder 텍스트로 찾기)
  const inputField = page.locator('input[placeholder*="URL"], input[placeholder*="url"]');
  await expect(inputField).toBeVisible();
  
  // 버튼이 있는지 확인
  const button = page.locator('button');
  await expect(button).toBeVisible();
});

test('page should be accessible', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // 페이지가 접근 가능한지 확인
  await expect(page).toBeVisible();
  
  // 포커스 가능한 요소들이 있는지 확인
  const focusableElements = page.locator('input, button, a, [tabindex]');
  await expect(focusableElements).toHaveCount(1);
}); 
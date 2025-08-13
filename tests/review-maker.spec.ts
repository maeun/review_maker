import { test, expect } from '@playwright/test';

test.describe('Review Maker Application', () => {
  test.beforeEach(async ({ page }) => {
    // 개발 서버가 실행 중이라고 가정하고 로컬호스트로 접속
    await page.goto('http://localhost:3000');
  });

  test('should display the main page with title and input field', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/Review Maker|리뷰 메이커/);
    
    // 메인 헤딩 확인
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // URL 입력 필드 확인
    const urlInput = page.getByPlaceholder(/네이버 지도 URL|URL/);
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toBeEmpty();
    
    // 제출 버튼 확인
    const submitButton = page.getByRole('button', { name: /생성|제출|Submit/ });
    await expect(submitButton).toBeVisible();
  });

  test('should validate empty URL input', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /생성|제출|Submit/ });
    
    // 빈 URL로 제출 시도
    await submitButton.click();
    
    // 경고 메시지가 나타나는지 확인 (토스트 메시지)
    // 실제 구현에 따라 다를 수 있음
    await expect(page.locator('body')).toContainText(/URL을 입력해주세요|Please enter URL/);
  });

  test('should validate invalid URL format', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/네이버 지도 URL|URL/);
    const submitButton = page.getByRole('button', { name: /생성|제출|Submit/ });
    
    // 잘못된 URL 입력
    await urlInput.fill('https://example.com');
    await submitButton.click();
    
    // 에러 메시지 확인
    await expect(page.locator('body')).toContainText(/유효하지 않은 URL|Invalid URL/);
  });

  test('should accept valid Naver Map URL format', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/네이버 지도 URL|URL/);
    
    // 유효한 네이버 지도 URL 형식
    const validUrl = 'https://map.naver.com/p/entry/place/1234567890';
    await urlInput.fill(validUrl);
    
    // 입력값이 올바르게 설정되었는지 확인
    await expect(urlInput).toHaveValue(validUrl);
  });

  test('should show loading state when submitting valid URL', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/네이버 지도 URL|URL/);
    const submitButton = page.getByRole('button', { name: /생성|제출|Submit/ });
    
    // 유효한 URL 입력
    await urlInput.fill('https://map.naver.com/p/entry/place/1234567890');
    
    // 제출 버튼 클릭
    await submitButton.click();
    
    // 로딩 상태 확인 (스피너나 로딩 텍스트)
    await expect(page.locator('[data-testid="loading"], .loading, [role="progressbar"]')).toBeVisible();
  });

  test('should have responsive design elements', async ({ page }) => {
    // 데스크톱 뷰포트에서 확인
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('main, [role="main"]')).toBeVisible();
    
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/네이버 지도 URL|URL/);
    const submitButton = page.getByRole('button', { name: /생성|제출|Submit/ });
    
    // Tab 키로 포커스 이동
    await page.keyboard.press('Tab');
    await expect(urlInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(submitButton).toBeFocused();
  });
});

test.describe('Review Maker - Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // 네트워크 오류를 시뮬레이션하기 위해 오프라인 모드로 설정
    await page.context().setOffline(true);
    
    await page.goto('http://localhost:3000');
    
    const urlInput = page.getByPlaceholder(/네이버 지도 URL|URL/);
    const submitButton = page.getByRole('button', { name: /생성|제출|Submit/ });
    
    await urlInput.fill('https://map.naver.com/p/entry/place/1234567890');
    await submitButton.click();
    
    // 에러 메시지가 표시되는지 확인
    await expect(page.locator('body')).toContainText(/오류|에러|Error/);
    
    // 온라인 모드로 복원
    await page.context().setOffline(false);
  });
}); 
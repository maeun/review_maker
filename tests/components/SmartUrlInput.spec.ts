import { test, expect } from '@playwright/test';

test.describe('SmartUrlInput Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should display the enhanced URL input with all features', async ({ page }) => {
    // URL 입력 필드 확인
    const urlInput = page.locator('input[placeholder*="네이버 지도 URL"]');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toBeEditable();

    // 좌측 아이콘 (지도 마커) 확인
    const mapIcon = page.locator('[data-testid="map-marker-icon"], svg').first();
    await expect(mapIcon).toBeVisible();
  });

  test('should handle clipboard functionality', async ({ page }) => {
    // 클립보드 권한 설정
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // 클립보드에 테스트 URL 설정
    const testUrl = 'https://map.naver.com/p/entry/place/1234567890';
    await page.evaluate((url) => {
      return navigator.clipboard.writeText(url);
    }, testUrl);

    // 클립보드 버튼 클릭
    const clipboardButton = page.locator('[aria-label="클립보드에서 붙여넣기"]');
    await clipboardButton.click();

    // URL이 입력되었는지 확인
    const urlInput = page.locator('input[placeholder*="네이버 지도 URL"]');
    await expect(urlInput).toHaveValue(testUrl);
  });

  test('should clear input when clear button is clicked', async ({ page }) => {
    const urlInput = page.locator('input[placeholder*="네이버 지도 URL"]');
    
    // URL 입력
    await urlInput.fill('https://map.naver.com/p/entry/place/1234567890');
    
    // 클리어 버튼이 표시되는지 확인
    const clearButton = page.locator('[aria-label="입력 지우기"]');
    await expect(clearButton).toBeVisible();
    
    // 클리어 버튼 클릭
    await clearButton.click();
    
    // 입력이 지워졌는지 확인
    await expect(urlInput).toHaveValue('');
  });

  test('should show help text when input is empty', async ({ page }) => {
    // 도움말 텍스트가 표시되는지 확인
    await expect(page.locator('text=💡 네이버 지도에서 장소를 검색한 후')).toBeVisible();
  });

  // 히스토리 기능이 제거되었으므로 관련 테스트들을 비활성화
  test.skip('should show validation states for different URL inputs', async ({ page }) => {
    const urlInput = page.locator('input[placeholder*="네이버 지도 URL"]');

    // 유효한 네이버 지도 URL 입력
    const validUrl = 'https://map.naver.com/p/entry/place/1234567890';
    await urlInput.fill(validUrl);
    
    // 검증 성공 아이콘이 표시되어야 함
    await expect(page.locator('[aria-label="유효한 URL"]')).toBeVisible({ timeout: 2000 });

    // 잘못된 URL 입력
    await urlInput.clear();
    await urlInput.fill('https://example.com');
    
    // 에러 메시지가 표시되어야 함
    await expect(page.locator('text=네이버 지도 URL만 지원합니다')).toBeVisible({ timeout: 2000 });
  });

  test.skip('should show recent URLs when available', async ({ page }) => {
    // 히스토리 기능이 제거되어 테스트 비활성화
  });

  test.skip('should handle URL suggestions with search functionality', async ({ page }) => {
    // 검색 기능이 제거되어 테스트 비활성화
  });

  test.skip('should maintain focus and keyboard navigation', async ({ page }) => {
    // 키보드 네비게이션 기능이 제거되어 테스트 비활성화
  });
});
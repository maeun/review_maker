/**
 * URL 관련 유틸리티 함수들
 */

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  placeId?: string;
  type?: 'desktop' | 'mobile' | 'shortlink';
}

/**
 * 네이버 지도 URL에서 PlaceID 추출
 */
export function extractPlaceId(url: string): string | null {
  try {
    // 데스크탑 환경: /place/숫자 패턴
    const placeMatch = url.match(/place\/(\d+)/);
    if (placeMatch) {
      return placeMatch[1];
    }

    // 모바일 환경: pinId 파라미터
    const pinIdMatch = url.match(/[?&]pinId=(\d+)/);
    if (pinIdMatch) {
      return pinIdMatch[1];
    }

    return null;
  } catch (error) {
    console.error('Error extracting place ID:', error);
    return null;
  }
}

/**
 * 네이버 지도 URL 유효성 검증
 */
export function validateNaverMapUrl(url: string): UrlValidationResult {
  if (!url.trim()) {
    return { isValid: false, error: 'URL을 입력해주세요' };
  }

  try {
    const urlObj = new URL(url);
    
    // 네이버 도메인 검증
    if (!urlObj.hostname.includes('naver.com') && !urlObj.hostname.includes('naver.me')) {
      return {
        isValid: false,
        error: '네이버 지도 URL만 지원합니다 (map.naver.com 또는 naver.me)'
      };
    }

    // 단축 URL 처리
    if (urlObj.hostname.includes('naver.me')) {
      return {
        isValid: true,
        type: 'shortlink'
      };
    }

    // PlaceID 추출 시도
    const placeId = extractPlaceId(url);
    
    if (!placeId) {
      return {
        isValid: false,
        error: '장소 정보를 찾을 수 없습니다. 장소 상세 페이지 URL을 사용해주세요'
      };
    }

    // URL 형태에 따른 타입 결정
    const type = url.includes('pinId=') ? 'mobile' : 'desktop';

    return {
      isValid: true,
      placeId,
      type
    };

  } catch (error) {
    return {
      isValid: false,
      error: 'URL 형식이 올바르지 않습니다'
    };
  }
}

/**
 * URL에서 장소명 추출 (가능한 경우)
 */
export function extractPlaceName(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // URL 파라미터에서 장소명 찾기
    const params = new URLSearchParams(urlObj.search);
    const placeName = params.get('placeName') || params.get('query');
    
    if (placeName) {
      return decodeURIComponent(placeName);
    }

    // URL 경로에서 장소명 추출 시도
    const pathSegments = urlObj.pathname.split('/');
    for (const segment of pathSegments) {
      // 한글이 포함된 세그먼트 찾기
      if (/[가-힣]/.test(decodeURIComponent(segment))) {
        return decodeURIComponent(segment);
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * URL 정규화 (표준 형태로 변환)
 */
export function normalizeNaverMapUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // 불필요한 파라미터 제거
    const paramsToKeep = ['place', 'placePath', 'pinId', 'c'];
    const newParams = new URLSearchParams();
    
    paramsToKeep.forEach(param => {
      const value = urlObj.searchParams.get(param);
      if (value) {
        newParams.set(param, value);
      }
    });

    urlObj.search = newParams.toString();
    return urlObj.toString();
  } catch (error) {
    return url;
  }
}

/**
 * URL을 사용자 친화적인 형태로 표시
 */
export function formatUrlForDisplay(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;
    
    if (path.length > maxLength - domain.length - 3) {
      const truncatedPath = path.substring(0, maxLength - domain.length - 6) + '...';
      return `${domain}${truncatedPath}`;
    }
    
    return `${domain}${path}...`;
  } catch (error) {
    // URL 파싱에 실패한 경우 단순 자르기
    return url.substring(0, maxLength - 3) + '...';
  }
}

/**
 * 최근 사용한 URL의 점수 계산 (정렬용)
 */
export function calculateUrlScore(
  url: string,
  usageCount: number,
  lastUsed: number,
  searchTerm: string = ''
): number {
  const now = Date.now();
  const daysSinceUsed = (now - lastUsed) / (1000 * 60 * 60 * 24);
  
  // 기본 점수: 사용 횟수와 최근성 고려
  let score = usageCount * 0.5 - daysSinceUsed * 0.1;
  
  // 검색어와의 관련성 보너스
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes(searchLower)) {
      score += 2;
    }
    
    // 장소명에서 검색어 매칭 시 추가 보너스
    const placeName = extractPlaceName(url);
    if (placeName && placeName.toLowerCase().includes(searchLower)) {
      score += 5;
    }
  }
  
  return Math.max(0, score);
}

/**
 * URL 리스트를 점수 기준으로 정렬
 */
export function sortUrlsByRelevance(
  urls: Array<{ url: string; usageCount: number; timestamp: number }>,
  searchTerm: string = ''
): Array<{ url: string; usageCount: number; timestamp: number; score: number }> {
  return urls
    .map(item => ({
      ...item,
      score: calculateUrlScore(item.url, item.usageCount, item.timestamp, searchTerm)
    }))
    .sort((a, b) => b.score - a.score);
}
/**
 * User Impression 검증 및 필터링 유틸리티
 * 리뷰 작성과 관련 없거나 부정적인 내용을 감지하고 필터링합니다.
 */

export interface ImpressionValidationResult {
  isValid: boolean;
  filteredImpression: string;
  reason?: string;
}

export class ImpressionValidator {
  private static readonly NEGATIVE_KEYWORDS = [
    // 욕설 및 비방
    '씨발', '시발', '좆', '개새끼', '병신', '미친', '또라이', '바보', '멍청이',
    '쓰레기', '최악', '망했다', '죽', '킬', '대가리', '븅신', '꺼져',
    
    // 차별적 표현
    '장애', '병신', '정신병', '미개', '후진국',
    
    // 성적/혐오 표현
    '성적', '야한', '섹스', '야동', '포르노', '변태',
    
    // 정치적/종교적 논란
    '정치', '대통령', '정부', '공산당', '종교', '기독교', '불교', '이슬람',
    
    // 극단적 부정 표현
    '절대 가지마', '가지 말라', '사기', '돈 아까워', '완전 별로', '진짜 최악'
  ];

  private static readonly IRRELEVANT_KEYWORDS = [
    // 완전히 관련 없는 주제들
    '주식', '코인', '비트코인', '투자', '부동산', '대출', '보험',
    '정치', '선거', '정당', '국정감사',
    '연예인', '아이돌', '드라마', '영화', '게임', 'LOL', '오버워치',
    '축구', '야구', '농구', '스포츠', '올림픽',
    '학교', '수업', '시험', '숙제', '교수', '선생님',
    '일기', '오늘 하루', '친구', '가족', '애인', '결혼',
    '병원', '의사', '약', '치료', '수술',
    '여행', '휴가', '출장', '비행기', '공항'
  ];

  private static readonly MINIMAL_LENGTH = 3;
  private static readonly MAX_LENGTH = 500;

  /**
   * User impression을 검증하고 필터링합니다.
   */
  public static validateImpression(impression: string): ImpressionValidationResult {
    if (!impression || typeof impression !== 'string') {
      return {
        isValid: false,
        filteredImpression: '',
        reason: 'empty_input'
      };
    }

    const trimmedImpression = impression.trim();

    // 길이 검증
    if (trimmedImpression.length < this.MINIMAL_LENGTH) {
      return {
        isValid: false,
        filteredImpression: '',
        reason: 'too_short'
      };
    }

    if (trimmedImpression.length > this.MAX_LENGTH) {
      return {
        isValid: false,
        filteredImpression: trimmedImpression.substring(0, this.MAX_LENGTH),
        reason: 'too_long'
      };
    }

    // 부정적 키워드 검사
    const containsNegativeKeywords = this.NEGATIVE_KEYWORDS.some(keyword => 
      trimmedImpression.toLowerCase().includes(keyword.toLowerCase())
    );

    if (containsNegativeKeywords) {
      return {
        isValid: false,
        filteredImpression: '',
        reason: 'negative_content'
      };
    }

    // 관련 없는 내용 검사
    const containsIrrelevantKeywords = this.IRRELEVANT_KEYWORDS.some(keyword => 
      trimmedImpression.toLowerCase().includes(keyword.toLowerCase())
    );

    if (containsIrrelevantKeywords) {
      return {
        isValid: false,
        filteredImpression: '',
        reason: 'irrelevant_content'
      };
    }

    // 의미 있는 내용 검증 (단순 반복 문자열 체크)
    if (this.isRepetitiveContent(trimmedImpression)) {
      return {
        isValid: false,
        filteredImpression: '',
        reason: 'repetitive_content'
      };
    }

    // 스팸성 내용 검증
    if (this.isSpamContent(trimmedImpression)) {
      return {
        isValid: false,
        filteredImpression: '',
        reason: 'spam_content'
      };
    }

    // 모든 검증 통과
    return {
      isValid: true,
      filteredImpression: trimmedImpression,
      reason: 'valid'
    };
  }

  /**
   * 반복적인 문자열인지 검사합니다.
   */
  private static isRepetitiveContent(text: string): boolean {
    // 같은 문자가 5번 이상 연속으로 반복되는 경우
    if (/(.)\1{4,}/.test(text)) {
      return true;
    }

    // 같은 단어가 3번 이상 반복되는 경우
    const words = text.split(/\s+/);
    if (words.length >= 3) {
      for (let i = 0; i <= words.length - 3; i++) {
        if (words[i] === words[i + 1] && words[i] === words[i + 2]) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 스팸성 내용인지 검사합니다.
   */
  private static isSpamContent(text: string): boolean {
    // URL이 포함된 경우
    if (/https?:\/\/[^\s]+/.test(text)) {
      return true;
    }

    // 전화번호 패턴이 포함된 경우
    if (/\b\d{2,3}-\d{3,4}-\d{4}\b/.test(text)) {
      return true;
    }

    // 이메일 주소가 포함된 경우
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
      return true;
    }

    // 홍보성 키워드들
    const promotionalKeywords = [
      '할인', '이벤트', '프로모션', '쿠폰', '무료', '공짜', '경품',
      '추천해드려요', '연락주세요', '문의하세요', '카톡', '카카오톡'
    ];

    const containsPromotional = promotionalKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    return containsPromotional;
  }

  /**
   * 검증 실패 사유에 대한 사용자 친화적 메시지를 반환합니다.
   */
  public static getValidationMessage(reason: string): string {
    switch (reason) {
      case 'empty_input':
        return '감상을 입력해주세요.';
      case 'too_short':
        return '감상이 너무 짧습니다. 조금 더 자세히 작성해주세요.';
      case 'too_long':
        return '감상이 너무 깁니다. 500자 이하로 작성해주세요.';
      case 'negative_content':
        return '부적절한 표현이 포함되어 있어 감상을 반영하지 않고 리뷰를 생성합니다.';
      case 'irrelevant_content':
        return '리뷰와 관련 없는 내용이 포함되어 있어 감상을 반영하지 않고 리뷰를 생성합니다.';
      case 'repetitive_content':
        return '의미 있는 감상을 작성해주세요.';
      case 'spam_content':
        return '홍보성 내용은 포함할 수 없습니다.';
      case 'valid':
        return '감상이 리뷰에 반영됩니다.';
      default:
        return '감상을 확인해주세요.';
    }
  }
}
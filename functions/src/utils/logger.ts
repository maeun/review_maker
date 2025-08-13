import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export interface ReviewRequestLog {
  // 기본 요청 정보
  requestId: string;
  requestTime: Timestamp;
  userEnvironment: 'mobile' | 'desktop' | 'unknown';
  userAgent?: string;
  requestUrl: string;
  placeId?: string;
  crawlingUrl?: string;
  
  // 요청 사항
  requestType: {
    visitor: boolean;
    blog: boolean;
  };
  userImpression?: string;
  
  // 방문자 리뷰 관련
  visitor?: {
    reviewCount: number;
    reviews: string[];
    prompt: string;
    generatedReview: string;
    aiModel: string; // 'openai-gpt4o' | 'gemini-1.5-flash' | 'groq-llama3' etc.
    crawlingError?: string;
    generationError?: string;
    processingTime: number; // milliseconds
  };
  
  // 블로그 리뷰 관련
  blog?: {
    reviewCount: number;
    reviews: string[];
    prompt: string;
    generatedReview: string;
    aiModel: string;
    crawlingError?: string;
    generationError?: string;
    processingTime: number; // milliseconds
  };
  
  // 전체 처리 시간
  totalProcessingTime: number; // milliseconds
  
  // 메타데이터
  version: string;
  success: boolean;
  errorMessage?: string;
}

const clog = (...args: any[]) => console.log("[Logger]", ...args);

export class ReviewLogger {
  private static instance: ReviewLogger;
  
  private constructor() {}
  
  static getInstance(): ReviewLogger {
    if (!ReviewLogger.instance) {
      ReviewLogger.instance = new ReviewLogger();
    }
    return ReviewLogger.instance;
  }

  private getLogDoc(requestId: string) {
    return db.collection('review_requests').doc(requestId);
  }
  
  // 새로운 요청 로그 시작
  async startRequest(requestId: string, data: {
    userEnvironment: 'mobile' | 'desktop' | 'unknown';
    userAgent?: string;
    requestUrl: string;
    requestType: { visitor: boolean; blog: boolean };
    userImpression?: string;
  }): Promise<void> {
    const log: Partial<ReviewRequestLog> = {
      requestId,
      requestTime: Timestamp.now(),
      userEnvironment: data.userEnvironment,
      requestUrl: data.requestUrl,
      requestType: data.requestType,
      version: "1.0",
      success: false,
      totalProcessingTime: 0
    };

    // undefined 값들을 안전하게 처리
    if (data.userAgent !== undefined) {
      log.userAgent = data.userAgent;
    }
    if (data.userImpression !== undefined && data.userImpression.trim() !== '') {
      log.userImpression = data.userImpression;
    }
    
    await this.getLogDoc(requestId).set(log);
    clog(`📝 요청 로그 시작 (Firestore 저장): ${requestId}`);
  }
  
  // Place ID 및 크롤링 URL 업데이트
  async updateRequestInfo(requestId: string, data: {
    placeId?: string;
    crawlingUrl?: string;
  }): Promise<void> {
    await this.getLogDoc(requestId).set(data, { merge: true });
  }
  
  // 방문자 리뷰 처리 결과 업데이트
  async updateVisitorReview(requestId: string, data: {
    reviewCount?: number;
    reviews?: string[];
    prompt?: string;
    generatedReview?: string;
    aiModel?: string;
    crawlingError?: string;
    generationError?: string;
    processingTime?: number;
  }): Promise<void> {
    const updateData = { visitor: data };
    await this.getLogDoc(requestId).set(updateData, { merge: true });
  }
  
  // 블로그 리뷰 처리 결과 업데이트
  async updateBlogReview(requestId: string, data: {
    reviewCount?: number;
    reviews?: string[];
    prompt?: string;
    generatedReview?: string;
    aiModel?: string;
    crawlingError?: string;
    generationError?: string;
    processingTime?: number;
  }): Promise<void> {
    const updateData = { blog: data };
    await this.getLogDoc(requestId).set(updateData, { merge: true });
  }

  // 블로그 크롤링 정보 업데이트 (crawlBlogReviews용)
  async updateBlogCrawling(requestId: string, data: {
    crawledUrls?: string[];
    reviewCount?: number;
    reviews?: string[];
    processingTime?: number;
    crawlingError?: string;
  }): Promise<void> {
    const updateData: any = {};
    if (data.crawledUrls) {
      updateData['blog.crawlingUrl'] = data.crawledUrls.join(', ');
    }
    if (data.reviewCount !== undefined) updateData['blog.reviewCount'] = data.reviewCount;
    if (data.reviews) updateData['blog.reviews'] = data.reviews;
    if (data.processingTime) updateData['blog.processingTime'] = data.processingTime;
    if (data.crawlingError) updateData['blog.crawlingError'] = data.crawlingError;

    await this.getLogDoc(requestId).set({ blog: updateData }, { merge: true });
  }
  
  // 요청 완료 및 Firestore 저장
  async finishRequest(requestId: string, data: {
    totalProcessingTime: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    const finalData: Partial<ReviewRequestLog> = {
      totalProcessingTime: data.totalProcessingTime,
      success: data.success,
    };
    if (data.errorMessage) {
      finalData.errorMessage = data.errorMessage;
    }
    
    await this.getLogDoc(requestId).set(finalData, { merge: true });
    clog(`✅ 요청 로그 저장 완료: ${requestId}`);
  }
  
  // 에러 발생 시 로그 저장
  async logError(requestId: string, error: string): Promise<void> {
    const logDoc = await this.getLogDoc(requestId).get();
    const logData = logDoc.data() as ReviewRequestLog | undefined;
    
    const startTime = logData?.requestTime?.toMillis() || Date.now();
    const totalTime = Date.now() - startTime;
    
    await this.finishRequest(requestId, {
      totalProcessingTime: totalTime,
      success: false,
      errorMessage: error
    });
  }
}

// 유틸리티 함수들
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const detectUserEnvironment = (userAgent?: string): 'mobile' | 'desktop' | 'unknown' => {
  if (!userAgent) return 'unknown';
  
  const mobileRegex = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent) ? 'mobile' : 'desktop';
};

export const truncateString = (str: string, maxLength: number = 1000): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

export const truncateArray = (arr: string[], maxItems: number = 50): string[] => {
  if (arr.length <= maxItems) return arr;
  return arr.slice(0, maxItems);
};

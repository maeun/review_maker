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
  private logs: Map<string, Partial<ReviewRequestLog>> = new Map();
  
  private constructor() {}
  
  static getInstance(): ReviewLogger {
    if (!ReviewLogger.instance) {
      ReviewLogger.instance = new ReviewLogger();
    }
    return ReviewLogger.instance;
  }
  
  // 새로운 요청 로그 시작
  startRequest(requestId: string, data: {
    userEnvironment: 'mobile' | 'desktop' | 'unknown';
    userAgent?: string;
    requestUrl: string;
    requestType: { visitor: boolean; blog: boolean };
    userImpression?: string;
  }): void {
    const log: Partial<ReviewRequestLog> = {
      requestId,
      requestTime: Timestamp.now(),
      userEnvironment: data.userEnvironment,
      userAgent: data.userAgent,
      requestUrl: data.requestUrl,
      requestType: data.requestType,
      userImpression: data.userImpression,
      version: "1.0",
      success: false
    };
    
    this.logs.set(requestId, log);
    clog(`📝 요청 로그 시작: ${requestId}`);
  }
  
  // Place ID 및 크롤링 URL 업데이트
  updateRequestInfo(requestId: string, data: {
    placeId?: string;
    crawlingUrl?: string;
  }): void {
    const log = this.logs.get(requestId);
    if (!log) return;
    
    if (data.placeId) log.placeId = data.placeId;
    if (data.crawlingUrl) log.crawlingUrl = data.crawlingUrl;
    
    this.logs.set(requestId, log);
  }
  
  // 방문자 리뷰 처리 결과 업데이트
  updateVisitorReview(requestId: string, data: {
    reviewCount?: number;
    reviews?: string[];
    prompt?: string;
    generatedReview?: string;
    aiModel?: string;
    crawlingError?: string;
    generationError?: string;
    processingTime?: number;
  }): void {
    const log = this.logs.get(requestId);
    if (!log) return;
    
    if (!log.visitor) log.visitor = {
      reviewCount: 0,
      reviews: [],
      prompt: '',
      generatedReview: '',
      aiModel: '',
      processingTime: 0
    };
    
    Object.assign(log.visitor, data);
    this.logs.set(requestId, log);
  }
  
  // 블로그 리뷰 처리 결과 업데이트
  updateBlogReview(requestId: string, data: {
    reviewCount?: number;
    reviews?: string[];
    prompt?: string;
    generatedReview?: string;
    aiModel?: string;
    crawlingError?: string;
    generationError?: string;
    processingTime?: number;
  }): void {
    const log = this.logs.get(requestId);
    if (!log) return;
    
    if (!log.blog) log.blog = {
      reviewCount: 0,
      reviews: [],
      prompt: '',
      generatedReview: '',
      aiModel: '',
      processingTime: 0
    };
    
    Object.assign(log.blog, data);
    this.logs.set(requestId, log);
  }

  // 블로그 크롤링 정보 업데이트 (crawlBlogReviews용)
  updateBlogCrawling(requestId: string, data: {
    crawledUrls?: string[];
    reviewCount?: number;
    reviews?: string[];
    processingTime?: number;
    crawlingError?: string;
  }): void {
    const log = this.logs.get(requestId);
    if (!log) return;
    
    if (!log.blog) log.blog = {
      reviewCount: 0,
      reviews: [],
      prompt: '',
      generatedReview: '',
      aiModel: '',
      processingTime: 0
    };
    
    if (data.crawledUrls) {
      // crawledUrls는 별도 필드로 저장하거나 reviews 앞에 URL 정보 추가
      log.crawlingUrl = data.crawledUrls.join(', '); // 간단히 URL들을 문자열로 저장
    }
    if (data.reviewCount !== undefined) log.blog.reviewCount = data.reviewCount;
    if (data.reviews) log.blog.reviews = data.reviews;
    if (data.processingTime) log.blog.processingTime = data.processingTime;
    if (data.crawlingError) log.blog.crawlingError = data.crawlingError;
    
    this.logs.set(requestId, log);
  }
  
  // 요청 완료 및 Firestore 저장
  async finishRequest(requestId: string, data: {
    totalProcessingTime: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    const log = this.logs.get(requestId);
    if (!log) return;
    
    log.totalProcessingTime = data.totalProcessingTime;
    log.success = data.success;
    if (data.errorMessage) log.errorMessage = data.errorMessage;
    
    try {
      // Firestore에 저장
      await db.collection('review_requests').doc(requestId).set(log as ReviewRequestLog);
      clog(`✅ 요청 로그 저장 완료: ${requestId}`);
      
      // 메모리에서 제거
      this.logs.delete(requestId);
    } catch (error) {
      clog(`❌ 요청 로그 저장 실패: ${requestId}`, error);
    }
  }
  
  // 에러 발생 시 로그 저장
  async logError(requestId: string, error: string): Promise<void> {
    const log = this.logs.get(requestId);
    if (!log) return;
    
    const startTime = log.requestTime?.toMillis() || Date.now();
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
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Firebase Admin 초기화 (이미 초기화되었을 수 있으므로 안전하게 처리)
try {
  initializeApp();
} catch (error) {
  // 이미 초기화된 경우 무시
}

const db = getFirestore();

// 톤앤매너 enum
export enum ToneModeEnum {
  GENTLE = 1,    // 젠틀모드
  CASUAL = 2,    // 일상모드
  ENERGETIC = 3  // 발랄모드
}

// 요청 기본 정보
export interface RequestInfo {
  requestTime: Timestamp;
  environment: 'desktop' | 'mobile' | 'unknown';
  requestUrl: string;
  placeId?: string;
  crawlingUrl?: string;
  visitorReviewRequested: 0 | 1;  // 방문자 후기 요청 여부
  blogReviewRequested: 0 | 1;     // 블로그 후기 요청 여부
  reviewToneMode: ToneModeEnum;    // 리뷰 톤앤매너
  userImpression: string;          // 장소에 대한 감상
}

// 방문자 리뷰 관련 정보
export interface VisitorReviewData {
  referenceReviewCount: number;     // 참고된 방문자 review의 수
  referenceReviews: string[];       // 참고된 방문자 review 목록
  generationPrompt: string;         // 방문자 review 생성을 위한 prompt
  generatedReview: string;          // 생성된 방문자 review
  processingTimeSeconds: number;    // 크롤링부터 생성까지 걸린 시간(초)
  aiModel?: string;                 // 사용된 AI 모델
  crawlingSuccess: boolean;         // 크롤링 성공 여부
  generationSuccess: boolean;       // 생성 성공 여부
  errorMessage?: string;            // 에러 메시지 (있는 경우)
}

// 블로그 리뷰 관련 정보
export interface BlogReviewData {
  referenceReviewCount: number;     // 참고된 블로그 review의 수
  referenceReviews: string[];       // 참고된 블로그 review 목록
  generationPrompt: string;         // 블로그 review 생성을 위한 prompt
  generatedReview: string;          // 생성된 블로그 review
  processingTimeSeconds: number;    // 크롤링부터 생성까지 걸린 시간(초)
  aiModel?: string;                 // 사용된 AI 모델
  crawlingSuccess: boolean;         // 크롤링 성공 여부
  generationSuccess: boolean;       // 생성 성공 여부
  errorMessage?: string;            // 에러 메시지 (있는 경우)
}

// 전체 요청 문서 구조
export interface RequestDocument {
  requestInfo: RequestInfo;
  visitorReview?: VisitorReviewData;
  blogReview?: BlogReviewData;
  totalProcessingTimeSeconds?: number;  // 전체 처리 시간
  completedAt?: Timestamp;              // 완료 시간
  success: boolean;                     // 전체 성공 여부
}

// Firestore 컬렉션 구조: requests/{YYYY-MM-DD}/daily/{requestId}
export class FirestoreLogger {
  private static instance: FirestoreLogger;
  private db = db;

  private constructor() {}

  public static getInstance(): FirestoreLogger {
    if (!FirestoreLogger.instance) {
      FirestoreLogger.instance = new FirestoreLogger();
    }
    return FirestoreLogger.instance;
  }

  /**
   * 톤앤매너 문자열을 enum으로 변환
   */
  private getToneModeEnum(toneMode: string): ToneModeEnum {
    switch (toneMode) {
      case 'gentle':
        return ToneModeEnum.GENTLE;
      case 'casual':
        return ToneModeEnum.CASUAL;
      case 'energetic':
        return ToneModeEnum.ENERGETIC;
      default:
        return ToneModeEnum.CASUAL; // 기본값
    }
  }

  /**
   * 날짜 문자열 생성 (YYYY-MM-DD)
   */
  private getDateString(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 요청 초기화 및 저장
   */
  async initializeRequest(
    requestId: string,
    requestUrl: string,
    userEnvironment: string,
    userImpression: string,
    reviewTypes: { visitor: boolean; blog: boolean },
    toneMode: string = 'casual'
  ): Promise<void> {
    try {
      const dateString = this.getDateString();
      const docRef = this.db
        .collection('requests')
        .doc(dateString)
        .collection('daily')
        .doc(requestId);

      const requestInfo: RequestInfo = {
        requestTime: Timestamp.now(),
        environment: this.normalizeEnvironment(userEnvironment),
        requestUrl,
        visitorReviewRequested: reviewTypes.visitor ? 1 : 0,
        blogReviewRequested: reviewTypes.blog ? 1 : 0,
        reviewToneMode: this.getToneModeEnum(toneMode),
        userImpression: userImpression || ''
      };

      const requestDoc: RequestDocument = {
        requestInfo,
        success: false
      };

      await docRef.set(requestDoc);
      console.log(`[FirestoreLogger] 요청 초기화 완료: ${requestId}`);
    } catch (error) {
      console.error(`[FirestoreLogger] 요청 초기화 실패:`, error);
      throw error;
    }
  }

  /**
   * 환경 정보 정규화
   */
  private normalizeEnvironment(environment: string): 'desktop' | 'mobile' | 'unknown' {
    const env = environment.toLowerCase();
    if (env.includes('mobile')) return 'mobile';
    if (env.includes('desktop')) return 'desktop';
    return 'unknown';
  }

  /**
   * PlaceID 및 크롤링 URL 업데이트
   */
  async updateCrawlingInfo(
    requestId: string,
    placeId: string,
    crawlingUrl: string
  ): Promise<void> {
    try {
      const dateString = this.getDateString();
      const docRef = this.db
        .collection('requests')
        .doc(dateString)
        .collection('daily')
        .doc(requestId);

      await docRef.update({
        'requestInfo.placeId': placeId,
        'requestInfo.crawlingUrl': crawlingUrl
      });

      console.log(`[FirestoreLogger] 크롤링 정보 업데이트 완료: ${requestId}`);
    } catch (error) {
      console.error(`[FirestoreLogger] 크롤링 정보 업데이트 실패:`, error);
    }
  }

  /**
   * 방문자 리뷰 데이터 업데이트
   */
  async updateVisitorReviewData(
    requestId: string,
    data: Partial<VisitorReviewData>
  ): Promise<void> {
    try {
      const dateString = this.getDateString();
      const docRef = this.db
        .collection('requests')
        .doc(dateString)
        .collection('daily')
        .doc(requestId);

      // 기존 데이터와 병합
      const doc = await docRef.get();
      const existingData = doc.data();
      const currentVisitorData = existingData?.visitorReview || {};

      const updatedVisitorData: Partial<VisitorReviewData> = {
        ...currentVisitorData,
        ...data
      };

      await docRef.update({
        visitorReview: updatedVisitorData
      });

      console.log(`[FirestoreLogger] 방문자 리뷰 데이터 업데이트: ${requestId}`);
    } catch (error) {
      console.error(`[FirestoreLogger] 방문자 리뷰 업데이트 실패:`, error);
    }
  }

  /**
   * 블로그 리뷰 데이터 업데이트
   */
  async updateBlogReviewData(
    requestId: string,
    data: Partial<BlogReviewData>
  ): Promise<void> {
    try {
      const dateString = this.getDateString();
      const docRef = this.db
        .collection('requests')
        .doc(dateString)
        .collection('daily')
        .doc(requestId);

      // 기존 데이터와 병합
      const doc = await docRef.get();
      const existingData = doc.data();
      const currentBlogData = existingData?.blogReview || {};

      const updatedBlogData: Partial<BlogReviewData> = {
        ...currentBlogData,
        ...data
      };

      await docRef.update({
        blogReview: updatedBlogData
      });

      console.log(`[FirestoreLogger] 블로그 리뷰 데이터 업데이트: ${requestId}`);
    } catch (error) {
      console.error(`[FirestoreLogger] 블로그 리뷰 업데이트 실패:`, error);
    }
  }

  /**
   * 요청 완료 처리
   */
  async completeRequest(
    requestId: string,
    success: boolean,
    totalProcessingTimeSeconds: number
  ): Promise<void> {
    try {
      const dateString = this.getDateString();
      const docRef = this.db
        .collection('requests')
        .doc(dateString)
        .collection('daily')
        .doc(requestId);

      await docRef.update({
        success,
        totalProcessingTimeSeconds,
        completedAt: Timestamp.now()
      });

      console.log(`[FirestoreLogger] 요청 완료 처리: ${requestId}, 성공: ${success}`);
    } catch (error) {
      console.error(`[FirestoreLogger] 요청 완료 처리 실패:`, error);
    }
  }

  /**
   * 에러 로깅
   */
  async logError(
    requestId: string,
    errorType: 'visitor' | 'blog' | 'general',
    errorMessage: string
  ): Promise<void> {
    try {
      const dateString = this.getDateString();
      const docRef = this.db
        .collection('requests')
        .doc(dateString)
        .collection('daily')
        .doc(requestId);

      const updateData: any = {};

      if (errorType === 'visitor') {
        updateData['visitorReview.errorMessage'] = errorMessage;
        updateData['visitorReview.generationSuccess'] = false;
      } else if (errorType === 'blog') {
        updateData['blogReview.errorMessage'] = errorMessage;
        updateData['blogReview.generationSuccess'] = false;
      }

      // 일반 에러의 경우 별도 필드에 저장
      if (errorType === 'general') {
        updateData['generalError'] = errorMessage;
      }

      await docRef.update(updateData);

      console.log(`[FirestoreLogger] ${errorType} 에러 로깅 완료: ${requestId}`);
    } catch (error) {
      console.error(`[FirestoreLogger] 에러 로깅 실패:`, error);
    }
  }

  /**
   * 특정 날짜의 요청 통계 조회
   */
  async getDailyStats(dateString: string) {
    try {
      const snapshot = await this.db
        .collection('requests')
        .doc(dateString)
        .collection('daily')
        .get();

      const stats = {
        totalRequests: snapshot.size,
        successfulRequests: 0,
        failedRequests: 0,
        visitorReviewRequests: 0,
        blogReviewRequests: 0,
        toneModeCounts: {
          gentle: 0,
          casual: 0,
          energetic: 0
        }
      };

      snapshot.forEach(doc => {
        const data = doc.data() as RequestDocument;
        
        if (data.success) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
        }

        if (data.requestInfo.visitorReviewRequested === 1) {
          stats.visitorReviewRequests++;
        }

        if (data.requestInfo.blogReviewRequested === 1) {
          stats.blogReviewRequests++;
        }

        // 톤앤매너 통계
        switch (data.requestInfo.reviewToneMode) {
          case ToneModeEnum.GENTLE:
            stats.toneModeCounts.gentle++;
            break;
          case ToneModeEnum.CASUAL:
            stats.toneModeCounts.casual++;
            break;
          case ToneModeEnum.ENERGETIC:
            stats.toneModeCounts.energetic++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error(`[FirestoreLogger] 일일 통계 조회 실패:`, error);
      throw error;
    }
  }
}
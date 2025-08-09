# 네이버 리뷰 생성기 - 개발자 가이드

## 📋 프로젝트 개요

**네이버 리뷰 생성기**는 네이버 지도 URL을 입력받아 해당 장소의 방문자 리뷰와 블로그 리뷰를 AI로 자동 생성하는 웹 서비스입니다.

### 🎯 핵심 기능
- 네이버 지도 URL 입력 및 유효성 검증
- 방문자 리뷰와 블로그 리뷰 동시 크롤링
- 다중 AI Provider를 활용한 안정적인 리뷰 생성
- 실시간 진행 상황 표시 및 결과 복사 기능

## 🏗️ 아키텍처 구조

```
review_maker/
├── pages/                    # Next.js 페이지 (Frontend)
├── components/               # React 컴포넌트
├── functions/               # Firebase Functions (Backend)
│   └── src/                 # TypeScript 소스 코드
├── utils/                   # 공통 유틸리티
├── tests/                   # Playwright E2E 테스트
└── out/                     # 빌드된 정적 파일
```

### 기술 스택
- **Frontend**: Next.js 14 + React 18 + Chakra UI
- **Backend**: Firebase Functions + Node.js 20
- **AI Services**: OpenAI GPT-4 → Gemini → Groq (Fallback Chain)
- **Web Scraping**: Puppeteer + Chrome AWS Lambda
- **Testing**: Playwright

## 🚀 로컬 개발 환경 설정

### 1. 의존성 설치
```bash
# 루트 디렉토리에서
npm install

# Firebase Functions 디렉토리에서
cd functions
npm install
```

### 2. 환경 변수 설정
```bash
# .env.local 파일 생성
OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
```

### 3. 개발 서버 실행
```bash
# Frontend 개발 서버 (개발 모드 - API Routes 사용 가능)
npm run dev

# Firebase Functions 로컬 서버
cd functions
npm run serve

# 프로덕션 설정으로 개발 서버 실행 (Static Export 모드)
npm run dev:prod
```

### 4. 테스트 실행
```bash
# E2E 테스트
npm run test

# 컴포넌트 테스트 (헤드리스 모드)
npm run test:components

# 테스트 UI 모드
npm run test:ui

# 테스트 리포트 확인
npx playwright show-report
```

### 5. 데모 페이지 접속
```
http://localhost:3000/demo
```
새로운 SmartUrlInput 컴포넌트의 모든 기능을 확인할 수 있습니다.

## 📦 주요 컴포넌트 및 함수

### Frontend 컴포넌트

#### `pages/index.tsx`
메인 페이지 컴포넌트 - URL 입력, 상태 관리, API 호출 담당
```typescript
// 주요 상태값들
const [url, setUrl] = useState("");
const [visitorReview, setVisitorReview] = useState("");
const [blogReview, setBlogReview] = useState("");
const [isLoading, setIsLoading] = useState(false);
```

#### `components/ReviewResult.tsx`
생성된 리뷰 결과 표시 - 복사 기능 및 타입별 스타일링
```typescript
interface ReviewResultProps {
  visitorReview: string;
  blogReview: string;
  isLoading: boolean;
  // ...
}
```

#### `components/LoadingAnimation.tsx`
단계별 로딩 애니메이션 - 진행률 표시 및 상태 시각화

### Backend Functions

#### `crawlVisitorReviews.ts`
방문자 리뷰 크롤링 함수
- PlaceID 추출 및 단축 URL 처리
- 브라우저 재시도 로직
- 다중 셀렉터를 통한 안정적인 요소 추출

#### `crawlBlogReviews.ts`
블로그 리뷰 크롤링 함수
- 블로그 링크 수집
- 개별 블로그 페이지 내용 추출
- iframe 처리 및 네이버 블로그 최적화

#### `generateVisitorReviewText.ts`
방문자 리뷰 생성 함수
- 4-5문장, 이모지 포함 자연스러운 리뷰
- 다중 AI Provider Fallback 구현

#### `generateBlogReviewText.ts`
블로그 리뷰 생성 함수
- 800자 이상 상세한 블로그 형태 리뷰
- 구조화된 컨텍스트 연속성 보장

## 🔧 개발 가이드라인

### 코딩 컨벤션
- TypeScript 엄격 모드 사용
- ESLint + Prettier 설정 준수
- 함수형 컴포넌트 및 React Hooks 활용
- 명시적 타입 정의 권장

### 에러 처리 패턴
```typescript
// 재시도 로직 예제
const retryWithDelay = async (
  fn: () => Promise<any>,
  retries: number = 2,
  delay: number = 1000
): Promise<any> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // 지수 백오프
    }
  }
};
```

### 로깅 패턴
```typescript
const clog = (...args: any[]) => console.log("[FunctionName]", ...args);
```

## 🔍 디버깅 및 모니터링

### 로그 확인
```bash
# Firebase Functions 로그
firebase functions:log

# 특정 함수 로그
firebase functions:log --only functions:crawlVisitorReviews
```

### 일반적인 문제 해결

#### 1. 크롤링 실패
- **원인**: 네이버 지도 DOM 구조 변경
- **해결**: `functions/src/crawl*.ts` 파일의 셀렉터 업데이트

#### 2. AI 생성 실패
- **원인**: API 키 만료 또는 할당량 초과
- **해결**: 환경 변수 확인 및 Fallback 체인 동작 확인

#### 3. 타임아웃 에러
- **원인**: Firebase Functions 제한시간 초과
- **해결**: `functions/src/*.ts`의 `timeoutSeconds` 조정

## 🚀 배포 가이드

### Firebase 배포
```bash
# 전체 프로젝트 배포
npm run build && firebase deploy

# Functions만 배포
firebase deploy --only functions

# Hosting만 배포
firebase deploy --only hosting
```

### 환경별 배포 설정
```bash
# 개발 환경
firebase use development && firebase deploy

# 프로덕션 환경  
firebase use production && firebase deploy
```

## 📊 성능 최적화 가이드

### 1. 크롤링 성능
- 불필요한 리소스 차단 (이미지, CSS, 폰트)
- 병렬 처리 활용
- 브라우저 재사용 패턴 적용

### 2. AI 생성 성능
- 컨텍스트 길이 최적화
- 대화 히스토리 관리
- 적절한 온도값 설정

### 3. Frontend 성능
- Next.js Static Export 활용
- 컴포넌트 지연 로딩
- 이미지 최적화

## 🛡️ 보안 고려사항

### API 키 관리
```bash
# Firebase Secrets 설정
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set GROQ_API_KEY
```

### CORS 설정
```typescript
const corsMiddleware = cors({
  origin: ["https://review-maker-nvr.web.app", "http://localhost:3000"],
});
```

### 입력 검증
- URL 형식 검증
- PlaceID 추출 검증
- SQL Injection 방지

## 📈 향후 개선 계획

### Phase 1: 기본 안정성
- [ ] Rate Limiting 구현
- [ ] 결과 캐싱 시스템 (Redis/Firestore)
- [ ] 상세 로깅 및 모니터링
- [ ] 단위 테스트 추가

### Phase 2: 사용자 경험 개선  
- [ ] 결과 히스토리 저장
- [ ] 리뷰 스타일 옵션 제공
- [ ] 소셜 공유 기능
- [ ] 모바일 앱 개발

### Phase 3: 고급 기능
- [ ] 다국어 지원
- [ ] 사용자 계정 시스템
- [ ] 프리미엄 기능 (더 긴 리뷰, 추가 스타일)
- [ ] API 서비스 제공

### Phase 4: 엔터프라이즈
- [ ] 대용량 배치 처리
- [ ] 사용량 기반 요금제
- [ ] 화이트라벨 솔루션
- [ ] 관리자 대시보드

## 🔧 유지보수 체크리스트

### 정기 점검 (주간)
- [ ] Firebase Functions 로그 확인
- [ ] API 할당량 사용량 모니터링
- [ ] 크롤링 성공률 확인
- [ ] 사용자 피드백 검토

### 정기 업데이트 (월간)
- [ ] 의존성 패키지 업데이트
- [ ] 보안 패치 적용
- [ ] 네이버 지도 DOM 변경사항 확인
- [ ] AI 모델 성능 평가

### 긴급 대응 시나리오
1. **서비스 전체 중단**: Firebase Status 확인 → Fallback 서버 활성화
2. **크롤링 실패 급증**: DOM 셀렉터 업데이트 → 긴급 배포
3. **AI 서비스 장애**: Fallback 체인 점검 → 대체 Provider 활성화

## 📚 추가 리소스

### 공식 문서
- [Firebase Functions](https://firebase.google.com/docs/functions)
- [Next.js Documentation](https://nextjs.org/docs)
- [Playwright Testing](https://playwright.dev/docs/intro)

### 커뮤니티
- Firebase 한국 사용자 그룹
- Next.js Korea Community
- 웹 크롤링 개발자 그룹

### 도구
- [Firebase Console](https://console.firebase.google.com)
- [Google Cloud Console](https://console.cloud.google.com)
- [Playwright Test Runner](https://playwright.dev/docs/test-runners)

---

> 💡 **팁**: 이 문서는 프로젝트와 함께 업데이트되어야 합니다. 새로운 기능 추가나 아키텍처 변경 시 반드시 문서를 함께 수정해주세요.
# 네이버 장소 리뷰 생성기

네이버 지도 장소 URL을 입력하면, 해당 장소의 방문자 리뷰와 블로그 리뷰를 AI로 자동 생성해주는 웹 서비스입니다.

## 🚀 주요 기능

### ✨ 사용자 친화적인 UI/UX
- **단계별 로딩 애니메이션**: 크롤링 → AI 생성 → 완료 단계별 진행 상황 표시
- **실시간 진행률**: 진행률 바와 퍼센트로 현재 상태 확인
- **애니메이션 효과**: 부드러운 슬라이드인, 펄스, 회전 애니메이션
- **스켈레톤 로딩**: 결과 로딩 중 실제 결과와 유사한 형태 표시

### 📊 리뷰 정보 표시
- **참고한 리뷰 수**: 방문자 리뷰 X개, 블로그 리뷰 Y개 참고 표시
- **복사 기능**: 생성된 리뷰를 클립보드에 복사 가능
- **리뷰 타입 구분**: 방문자 리뷰와 블로그 리뷰를 명확히 구분

### 🎯 리뷰 생성 품질
- **방문자 리뷰**: 4-5문장, 이모지 포함, 자연스러운 한글 리뷰
- **블로그 리뷰**: 800자 이상의 상세한 분석, 일반 텍스트 형식
- **마크다운 제거**: 깔끔한 일반 텍스트로 표시

### 🔍 입력 검증
- **실시간 URL 검증**: 네이버 지도 URL 유효성 즉시 확인
- **도움말 제공**: 올바른 URL 입력 방법 안내
- **명확한 에러 메시지**: 크롤링 실패 시 구체적인 안내

## 🛠 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Library**: Chakra UI
- **Web Scraping**: Puppeteer
- **AI Generation**: OpenAI GPT-4
- **Styling**: Emotion, Framer Motion

## 📦 설치 및 실행

### 1. 저장소 클론
```bash
git clone [repository-url]
cd review
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 OpenAI API 키를 설정하세요:
```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 브라우저에서 확인
```
http://localhost:3000
```

## 🎨 주요 컴포넌트

### `pages/index.tsx`
- 메인 페이지 컴포넌트
- URL 입력 및 검증
- 단계별 로딩 상태 관리
- 에러 처리 및 사용자 피드백

### `components/LoadingAnimation.tsx`
- 리뷰 생성 중 표시되는 애니메이션
- 단계별 진행 상황 시각화
- 진행률 바 및 상태 표시

### `components/ReviewResult.tsx`
- 생성된 리뷰 결과 표시
- 복사 기능 제공
- 리뷰 타입별 스타일링

### `components/SkeletonLoader.tsx`
- 로딩 중 스켈레톤 UI
- 실제 결과와 유사한 형태 표시

### `pages/api/crawl.ts`
- 네이버 지도 크롤링 API
- 방문자 리뷰 및 블로그 리뷰 추출
- DOM 구조 기반 셀렉터 사용

### `pages/api/generate.ts`
- OpenAI API를 통한 리뷰 생성
- 방문자 리뷰 및 블로그 리뷰 프롬프트 최적화

## 🔧 크롤링 구조

### 네이버 지도 DOM 구조
- **리뷰 탭**: `.veBoZ` 클래스 중 "리뷰" 텍스트
- **방문자 리뷰**: `.pui__vn15t2` 클래스에서 추출
- **블로그 리뷰 탭**: `.veBoZ` 클래스 중 "블로그 리뷰" 텍스트
- **블로그 리뷰**: `.MKLdN` 클래스에서 추출

## 🚨 주의사항

- **네이버 정책 준수**: 과도한 크롤링 요청을 피하세요
- **API 키 보안**: OpenAI API 키는 외부에 노출되지 않도록 주의하세요
- **크롤링 한계**: 네이버 지도 DOM 구조 변경 시 크롤링이 실패할 수 있습니다

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요. 
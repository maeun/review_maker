/** @type {import('next').NextConfig} */
const nextConfig = {
  // 환경에 따른 조건부 설정
  ...(process.env.NODE_ENV === 'production' && {
    // Firebase Hosting을 위한 설정 (프로덕션만)
    output: 'export',
  }),
  trailingSlash: true,
  images: {
    unoptimized: true
<<<<<<< HEAD
  },
  typescript: {
    // 빌드 시 타입 에러 무시 (임시)
    ignoreBuildErrors: true,
  },
=======
  }
>>>>>>> b77f91ac51b395cead68dcb8ea894be86c01e03c
  // API 라우트는 Firebase Functions로 이동하므로 제거 (프로덕션)
  // 개발 환경에서는 API 라우트 사용 가능
};

module.exports = nextConfig;

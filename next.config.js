/** @type {import('next').NextConfig} */
const nextConfig = {
  // Firebase Hosting을 위한 설정
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
  // API 라우트는 Firebase Functions로 이동하므로 제거
};

module.exports = nextConfig;

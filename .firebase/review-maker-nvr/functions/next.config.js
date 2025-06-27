"use strict";

// next.config.js
var nextConfig = {
  // Firebase Hosting을 위한 설정
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // API 라우트는 Firebase Functions로 이동하므로 제거
  experimental: {
    appDir: false
  }
};
module.exports = nextConfig;

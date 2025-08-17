/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  // 환경에 따른 조건부 설정
  ...(process.env.NODE_ENV === "production" && {
    // Firebase Hosting을 위한 설정 (프로덕션만)
    output: "export",
  }),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    // 빌드 시 타입 에러 무시 (임시)
    ignoreBuildErrors: true,
  },
  // 성능 최적화 설정
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // 압축 최적화
  compress: true,
  // 실험적 기능들
  experimental: {
    optimizePackageImports: ["@chakra-ui/react", "react-icons"],
  },
  // 웹팩 최적화
  webpack: (config, { dev, isServer }) => {
    // 프로덕션에서 번들 분석 최적화
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          default: false,
          vendors: false,
          // 벤더 라이브러리 분리
          vendor: {
            name: "vendor",
            chunks: "all",
            test: /node_modules/,
            priority: 20,
          },
          // Chakra UI 별도 분리
          chakra: {
            name: "chakra",
            chunks: "all",
            test: /node_modules\/@chakra-ui/,
            priority: 30,
          },
          // React 관련 라이브러리 분리
          react: {
            name: "react",
            chunks: "all",
            test: /node_modules\/(react|react-dom)/,
            priority: 40,
          },
          // 공통 컴포넌트
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);

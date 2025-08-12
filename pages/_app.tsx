import type { AppProps } from "next/app";
import Head from "next/head";
import { Provider } from "../components/ui/provider";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* SEO Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="네이버 플레이스 리뷰를 분석하여 방문자 리뷰와 블로그 리뷰를 자동으로 생성해주는 AI 도구입니다."
        />
        <meta
          name="keywords"
          content="네이버 리뷰, 블로그 리뷰, AI 리뷰 생성, 방문자 리뷰, 리뷰 메이커"
        />
        <meta name="author" content="Review Maker" />

        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Review Maker - AI 리뷰 생성 도구" />
        <meta
          property="og:description"
          content="네이버 플레이스 리뷰를 분석하여 방문자 리뷰와 블로그 리뷰를 자동으로 생성해주는 AI 도구입니다."
        />
        <meta property="og:image" content="/review_maker_og_img.png" />
        <meta property="og:url" content="https://review-maker-nvr.web.app" />
        <meta property="og:site_name" content="Review Maker" />
        <meta property="og:locale" content="ko_KR" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Review Maker - AI 리뷰 생성 도구" />
        <meta
          name="twitter:description"
          content="네이버 플레이스 리뷰를 분석하여 방문자 리뷰와 블로그 리뷰를 자동으로 생성해주는 AI 도구입니다."
        />
        <meta name="twitter:image" content="/review_maker_og_img.png" />

        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://review-maker-nvr.web.app" />
      </Head>
      <Provider>
        <Component {...pageProps} />
      </Provider>
    </>
  );
}

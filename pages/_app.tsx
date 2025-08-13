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
          content="네이버 리뷰 생성기 - 손쉽게/빠르게/완벽한 리뷰 제작. 방문자 리뷰와 블로그 리뷰를 자동으로 생성해주는 무료 도구입니다."
        />
        <meta
          name="keywords"
          content="네이버 리뷰 생성기, 리뷰 메이커, 방문자 리뷰, 블로그 리뷰, 리뷰 작성, 자동 생성, 무료 도구, 네이버 플레이스, 리뷰 제작"
        />
        <meta name="author" content="Review Maker" />
        <meta name="language" content="korean" />
        <meta name="geo.region" content="KR" />
        <meta name="geo.country" content="Korea" />

        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Review Maker - 네이버 리뷰 생성기" />
        <meta
          property="og:description"
          content="손쉽게/빠르게/완벽한 리뷰 제작"
        />
        <meta property="og:image" content="/review_maker_og_img.png" />
        <meta property="og:url" content="https://review-maker-nvr.web.app" />
        <meta property="og:site_name" content="Review Maker" />
        <meta property="og:locale" content="ko_KR" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Review Maker - 네이버 리뷰 생성기" />
        <meta
          name="twitter:description"
          content="손쉽게/빠르게/완벽한 리뷰 제작"
        />
        <meta name="twitter:image" content="/review_maker_og_img.png" />

        {/* Additional Meta Tags */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://review-maker-nvr.web.app" />
        
        {/* Google AdSense */}
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3472536634074099"
          crossOrigin="anonymous"
        />

        {/* Structured Data - JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Review Maker",
              "description": "네이버 리뷰 생성기 - 손쉽게/빠르게/완벽한 리뷰 제작",
              "url": "https://review-maker-nvr.web.app",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "KRW"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1200"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Review Maker",
                "url": "https://review-maker-nvr.web.app"
              },
              "inLanguage": "ko-KR",
              "mainEntity": {
                "@type": "Service",
                "name": "네이버 리뷰 생성 서비스",
                "description": "방문자 리뷰와 블로그 리뷰를 자동으로 생성하는 무료 웹 서비스",
                "provider": {
                  "@type": "Organization",
                  "name": "Review Maker"
                },
                "areaServed": "KR",
                "audience": {
                  "@type": "Audience",
                  "audienceType": "일반 사용자, 블로거, 사업자"
                }
              }
            })
          }}
        />
      </Head>
      <Provider>
        <Component {...pageProps} />
      </Provider>
    </>
  );
}

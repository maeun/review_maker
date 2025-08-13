import React from "react";

// 간단한 마크다운 파서 - 볼드 텍스트만 처리
export const parseMarkdownToHtml = (text: string): string => {
  return (
    text
      // **텍스트** -> <strong>텍스트</strong>
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // 줄바꿈 처리
      .replace(/\n/g, "<br />")
  );
};

// 마크다운을 일반 텍스트로 변환 (복사용)
export const parseMarkdownToPlainText = (text: string): string => {
  return (
    text
      // **텍스트** -> 텍스트 (마크다운 제거)
      .replace(/\*\*(.*?)\*\*/g, "$1")
  );
};

// React 컴포넌트에서 사용할 수 있도록 JSX 요소로 변환
export const parseMarkdownToJSX = (text: string): JSX.Element[] => {
  // 불필요한 영어/한국어 문구들 제거 (백엔드에서 놓친 것들 추가 정리)
  const cleanedText = text
    .replace(/^\*?Here are the \d+ section titles?:?\*?\s*/i, "")
    .replace(/^\*?Below are the section titles?:?\*?\s*/i, "")
    .replace(/^\*?Following are the section titles?:?\*?\s*/i, "")
    .replace(/^\*?The \d+ section titles? are:?\*?\s*/i, "")
    .replace(/^\*?다음은 \d+개의? 섹션 제목입니다?:?\*?\s*/i, "")
    .replace(/^\*?섹션 제목들?:?\*?\s*/i, "")
    .replace(/^\*?목차:?\*?\s*/i, "")
    .replace(/^\*?Table of Contents:?\*?\s*/i, "")
    .replace(/^\*?TOC:?\*?\s*/i, "")
    // 빈 줄 정리
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // **text** 형태의 볼드 텍스트 매칭
  const parts = cleanedText.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    // **text** 형태의 볼드 텍스트 (섹션 제목)
    if (part.match(/^\*\*[^*]+\*\*$/)) {
      const boldText = part.replace(/^\*\*([^*]+)\*\*$/, "$1");
      return (
        <strong
          key={index}
          style={{
            fontWeight: "bold",
            display: "block",
            marginTop: index > 0 ? "1.5rem" : "0",
            marginBottom: "0.5rem",
            fontSize: "1.1em",
            color: "#2D3748",
          }}
        >
          {boldText}
        </strong>
      );
    } else {
      // 일반 텍스트 (줄바꿈 처리)
      const lines = part.split("\n");
      return (
        <span key={index}>
          {lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    }
  });
};

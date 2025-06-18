export const visitorPrompt = (reviews: string[]) => `다음은 네이버 지도 방문자 리뷰들이다:\n${reviews.join('\n')}\n이 리뷰들을 바탕으로 한글로 4~5문장, 적절한 emoji를 포함한 방문자 리뷰를 생성해줘.`;

export const blogPrompt = (reviews: string[]) => `다음은 네이버 지도 블로그 리뷰들이다:\n${reviews.join('\n')}\n아래 조건을 모두 지켜서 블로그 리뷰를 작성해줘:\n- 자세한 분석, 긍정적, markdown, informal soliloquy, '~다'로 끝나는 문장, '체험'과 '경험' 금지, 키워드 5회 이상, diary style, emoji 포함, 제목 포함`; 
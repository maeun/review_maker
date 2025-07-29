import { useState } from 'react';
import { keyframes } from '@emotion/react';
import { 
  Container, 
  Heading, 
  Input, 
  Button, 
  VStack, 
  Box, 
  Text, 
  useToast, 
  Spinner,
  Progress,
  HStack,
  Icon,
  Flex,
  Badge
} from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon, InfoIcon } from '@chakra-ui/icons';
import LoadingAnimation from '../components/LoadingAnimation';
import SkeletonLoader from '../components/SkeletonLoader';
import ReviewResult from '../components/ReviewResult';

const pulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export default function Home() {
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  
  const [visitorReview, setVisitorReview] = useState('');
  const [visitorReviewCount, setVisitorReviewCount] = useState(0);
  const [isVisitorLoading, setIsVisitorLoading] = useState(false);

  const [blogReview, setBlogReview] = useState('');
  const [blogReviewCount, setBlogReviewCount] = useState(0);
  const [isBlogLoading, setIsBlogLoading] = useState(false);

  const [placeId, setPlaceId] = useState<string | null>(null);
  const toast = useToast();

  const validateNaverUrl = (url: string) => {
    if (!url.trim()) return true;
    return url.includes('map.naver.com') || url.includes('naver.me');
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setIsValidUrl(validateNaverUrl(newUrl));
  };

  const handleSubmit = async () => {
    if (!url.trim() || !isValidUrl) {
      toast({
        title: '유효하지 않은 URL',
        description: '네이버 지도 또는 naver.me URL을 입력해주세요.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Reset states
    setVisitorReview('');
    setVisitorReviewCount(0);
    setBlogReview('');
    setBlogReviewCount(0);
    setPlaceId(null);
    setIsVisitorLoading(true);
    setIsBlogLoading(true);

    const baseUrl = "https://us-central1-review-maker-nvr.cloudfunctions.net";

    try {
      // 1. 방문자 리뷰 크롤링 (placeId 추출 및 DB 저장 담당)
      const crawlVisitorRes = await fetch(`${baseUrl}/crawlVisitorReviews?url=${encodeURIComponent(url)}`);
      if (!crawlVisitorRes.ok) {
        const errData = await crawlVisitorRes.json();
        throw new Error(`방문자 리뷰 수집 실패: ${errData.detail || '서버 오류'}`);
      }
      const visitorCrawlData = await crawlVisitorRes.json();
      setVisitorReviewCount(visitorCrawlData.visitorReviewCount);
      setPlaceId(visitorCrawlData.placeId);
      
      // 2-1. 방문자 리뷰 생성 (백그라운드에서 실행)
      const generateVisitor = async () => {
        try {
          const res = await fetch(`${baseUrl}/generateVisitorReviewText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorReviews: visitorCrawlData.visitorReviews }),
          });
          if (!res.ok) throw new Error('방문자 리뷰 생성 실패');
          const data = await res.json();
          setVisitorReview(data.visitorReview);
        } catch (err) {
          console.error(err);
          setVisitorReview('오류: 방문자 리뷰 생성 중 문제가 발생했습니다.');
        } finally {
          setIsVisitorLoading(false);
        }
      };

      // 2-2. 블로그 리뷰 처리 (순차적 실행)
      const processBlog = async () => {
        try {
          const crawlRes = await fetch(`${baseUrl}/crawlBlogReviews?url=${encodeURIComponent(url)}`);
          if (!crawlRes.ok) {
            const errData = await crawlRes.json();
            throw new Error(`블로그 리뷰 수집 실패: ${errData.detail || '서버 오류'}`);
          }
          const crawlData = await crawlRes.json();
          setBlogReviewCount(crawlData.blogReviewCount);

          const genRes = await fetch(`${baseUrl}/generateBlogReviewText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blogReviews: crawlData.blogReviews }),
          });
          if (!genRes.ok) throw new Error('블로그 리뷰 생성 실패');
          const genData = await genRes.json();
          setBlogReview(genData.blogReview);
        } catch (err: any) {
          console.error(err);
          setBlogReview(`오류: ${err.message || '블로그 리뷰 처리 중 문제가 발생했습니다.'}`);
        } finally {
          setIsBlogLoading(false);
        }
      };
      
      // 두 프로세스를 동시에 실행
      generateVisitor();
      processBlog();

    } catch (err: any) {
      console.error("전체 프로세스 오류:", err);
      toast({
        title: '오류 발생',
        description: err.message || '리뷰 생성 중 문제가 발생했습니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      // 로딩 상태를 모두 해제하여 사용자가 다시 시도할 수 있도록 함
      setIsVisitorLoading(false);
      setIsBlogLoading(false);
    }
  };

  return (
    <Container maxW="lg" py={10}>
      <VStack spacing={6}>
        <Heading 
          size="xl" 
          bgGradient="linear(to-r, teal.400, blue.500)"
          bgClip="text"
          textAlign="center"
        >
          네이버 장소 리뷰 생성기
        </Heading>
        
        <Text color="gray.600" textAlign="center">
          네이버 지도 URL을 입력하면 AI가 해당 장소의 리뷰를 자동으로 생성해드립니다
        </Text>

        <Box w="100%" p={6} borderWidth={1} borderRadius="lg" boxShadow="sm">
          <VStack spacing={4}>
            <Input
              placeholder="네이버 지도 URL을 입력하세요 (예: https://map.naver.com/p/entry/place/1234567890)"
              value={url}
              onChange={handleUrlChange}
              size="lg"
              disabled={isVisitorLoading || isBlogLoading}
              isInvalid={!isValidUrl && url.trim() !== ''}
              errorBorderColor="red.300"
            />
            {!isValidUrl && url.trim() !== '' && (
              <Text fontSize="sm" color="red.500" textAlign="center">
                네이버 지도 URL(map.naver.com, naver.me)을 입력해주세요.
              </Text>
            )}
            <Text fontSize="xs" color="gray.500" textAlign="center">
              💡 네이버 지도에서 장소를 검색한 후, 주소창의 URL을 복사해서 붙여넣어주세요
            </Text>
            <Button
              colorScheme="teal"
              onClick={handleSubmit}
              isLoading={isVisitorLoading || isBlogLoading}
              loadingText="리뷰 생성 중..."
              size="lg"
              w="100%"
              disabled={!url.trim() || !isValidUrl || isVisitorLoading || isBlogLoading}
            >
              리뷰 생성하기
            </Button>
          </VStack>
        </Box>

        {(isVisitorLoading || isBlogLoading || visitorReview || blogReview) && (
          <ReviewResult
            visitorReview={visitorReview}
            isVisitorLoading={isVisitorLoading}
            visitorReviewCount={visitorReviewCount}
            blogReview={blogReview}
            isBlogLoading={isBlogLoading}
            blogReviewCount={blogReviewCount}
          />
        )}
      </VStack>
    </Container>
  );
}

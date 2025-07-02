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

// 애니메이션 정의
const pulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

type LoadingStep = 'idle' | 'crawling' | 'generating' | 'complete';

export default function Home() {
  const [url, setUrl] = useState('');
  const [visitorReview, setVisitorReview] = useState('');
  const [blogReview, setBlogReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [progress, setProgress] = useState(0);
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [visitorReviewCount, setVisitorReviewCount] = useState(0);
  const [blogReviewCount, setBlogReviewCount] = useState(0);
  const toast = useToast();

  const extractPlaceId = (url: string) => {
    const match = url.match(/place\/(\d+)/);
    return match ? match[1] : null;
  };

  const validateUrl = (url: string) => {
    if (!url.trim()) {
      setIsValidUrl(true);
      return;
    }
    const placeId = extractPlaceId(url);
    setIsValidUrl(!!placeId);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    validateUrl(newUrl);
  };

  const handleSubmit = async () => {
    if (!url.trim()) {
      toast({
        title: 'URL을 입력해주세요',
        description: '네이버 지도 URL을 입력해주세요.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!isValidUrl) {
      toast({
        title: '유효하지 않은 URL',
        description: '올바른 네이버 지도 URL을 입력해주세요.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setVisitorReview('');
    setBlogReview('');
    setLoading(true);
    setLoadingStep('crawling');
    setProgress(0);
    
    const placeId = extractPlaceId(url);
    if (!placeId) {
      toast({ 
        title: '유효하지 않은 URL', 
        description: '네이버 지도 URL을 올바르게 입력해주세요.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      setLoading(false);
      setLoadingStep('idle');
      return;
    }

    try {
      // 크롤링 단계 - Cloud Run API URL 사용
      const naverReviewUrl = `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,2,dh&placePath=/review`;
      console.log('크롤링 요청 URL:', `https://crawl-pf7yv34lvq-uc.a.run.app/?url=${encodeURIComponent(naverReviewUrl)}`);
      setProgress(20);
      const crawlRes = await fetch(`https://crawl-pf7yv34lvq-uc.a.run.app/?url=${encodeURIComponent(naverReviewUrl)}`);
      
      if (!crawlRes.ok) {
        const errorData = await crawlRes.json();
        throw new Error(errorData.detail || '크롤링에 실패했습니다.');
      }
      
      setProgress(50);
      setLoadingStep('generating');
      
      const { visitorReviews, blogReviews, visitorReviewCount, blogReviewCount } = await crawlRes.json();
      setVisitorReviewCount(visitorReviewCount);
      setBlogReviewCount(blogReviewCount);
      
      // 리뷰 생성 단계 - Express API URL 사용
      const genRes = await fetch('https://us-central1-review-maker-nvr.cloudfunctions.net/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorReviews, blogReviews }),
      });
      
      if (!genRes.ok) {
        const errorData = await genRes.json();
        throw new Error(errorData.detail || '리뷰 생성에 실패했습니다.');
      }
      
      setProgress(80);
      
      const { visitorReview, blogReview } = await genRes.json();
      setVisitorReview(visitorReview);
      setBlogReview(blogReview);
      
      setProgress(100);
      setLoadingStep('complete');
      
      toast({
        title: '리뷰 생성 완료!',
        description: `방문자 리뷰 ${visitorReviewCount}개, 블로그 리뷰 ${blogReviewCount}개를 참고하여 생성했습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (e) {
      console.error('API 호출 오류:', e);
      
      // 크롤링 API에서 반환된 에러 메시지 확인
      if (e instanceof Error && e.message.includes('크롤링')) {
        toast({ 
          title: '리뷰 생성 불가', 
          description: '네이버 지도에서 해당 장소의 리뷰를 가져올 수 없습니다. 다른 장소를 시도해주세요.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({ 
          title: '리뷰 생성 실패', 
          description: '잠시 후 다시 시도해주세요.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
      setLoadingStep('idle');
    } finally {
      setLoading(false);
      // 3초 후 진행률 초기화
      setTimeout(() => {
        setProgress(0);
        setLoadingStep('idle');
      }, 3000);
    }
  };

  const getStepInfo = (step: LoadingStep) => {
    switch (step) {
      case 'crawling':
        return {
          icon: TimeIcon,
          title: '리뷰 데이터 수집 중...',
          description: '네이버 지도에서 실제 리뷰들을 가져오고 있습니다.',
          color: 'blue'
        };
      case 'generating':
        return {
          icon: InfoIcon,
          title: 'AI 리뷰 생성 중...',
          description: '수집된 리뷰를 바탕으로 새로운 리뷰를 생성하고 있습니다.',
          color: 'purple'
        };
      case 'complete':
        return {
          icon: CheckCircleIcon,
          title: '리뷰 생성 완료!',
          description: '새로운 리뷰가 성공적으로 생성되었습니다.',
          color: 'green'
        };
      default:
        return null;
    }
  };

  const stepInfo = getStepInfo(loadingStep);

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
              disabled={loading}
              isInvalid={!isValidUrl && url.trim() !== ''}
              errorBorderColor="red.300"
            />
            {!isValidUrl && url.trim() !== '' && (
              <Text fontSize="sm" color="red.500" textAlign="center">
                올바른 네이버 지도 URL을 입력해주세요
              </Text>
            )}
            <Text fontSize="xs" color="gray.500" textAlign="center">
              💡 네이버 지도에서 장소를 검색한 후, 주소창의 URL을 복사해서 붙여넣어주세요
            </Text>
            <Button 
              colorScheme="teal" 
              onClick={handleSubmit} 
              isLoading={loading}
              loadingText="처리 중..."
              size="lg"
              w="100%"
              disabled={!url.trim() || !isValidUrl || loading}
            >
              리뷰 생성하기
            </Button>
          </VStack>
        </Box>

        {/* 로딩 상태 표시 */}
        {loading && stepInfo && (
          <LoadingAnimation step={loadingStep} progress={progress} />
        )}

        {/* 완료 상태 표시 */}
        {!loading && loadingStep === 'complete' && (
          <Box 
            w="100%" 
            p={4} 
            borderWidth={1} 
            borderRadius="lg" 
            borderColor="green.200"
            bg="green.50"
            animation={`${slideIn} 0.5s ease-out`}
          >
            <VStack spacing={2}>
              <HStack spacing={2} justify="center">
                <CheckCircleIcon color="green.500" />
                <Text color="green.700" fontWeight="medium">
                  리뷰 생성이 완료되었습니다!
                </Text>
              </HStack>
              <HStack spacing={4} fontSize="sm" color="gray.600">
                <Text>방문자 리뷰 {visitorReviewCount}개 참고</Text>
                <Text>•</Text>
                <Text>블로그 리뷰 {blogReviewCount}개 참고</Text>
              </HStack>
            </VStack>
          </Box>
        )}

        {/* 스켈레톤 로딩 */}
        {loading && (loadingStep === 'crawling' || loadingStep === 'generating') && (
          <SkeletonLoader />
        )}

        {/* 결과 표시 */}
        {(visitorReview || blogReview) && !loading && (
          <ReviewResult 
            visitorReview={visitorReview} 
            blogReview={blogReview}
            visitorReviewCount={visitorReviewCount}
            blogReviewCount={blogReviewCount}
          />
        )}
      </VStack>
    </Container>
  );
} 
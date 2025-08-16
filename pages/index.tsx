import { useState } from "react";
import Head from "next/head";
import {
  Container,
  Heading,
  Button,
  VStack,
  Box,
  Text,
  useToast,
  HStack,
  Icon,
  Flex,
  Badge,
  useColorModeValue,
  Textarea,
  FormControl,
  FormLabel,
  Link
} from "@chakra-ui/react";
import { FaRobot, FaStar, FaMapMarkerAlt, FaLightbulb } from "react-icons/fa";
import ReviewResult from "../components/ReviewResult";
import SmartUrlInput from "../components/SmartUrlInput";
import ReviewTypeSelector, { ReviewTypeOptions } from "../components/ReviewTypeSelector";
import { ToneMode } from "../components/ToneModeSelector";
import AdBanner from "../components/AdBanner";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [reviewTypes, setReviewTypes] = useState<ReviewTypeOptions>({
    visitor: true,
    blog: true
  });
  const [toneMode, setToneMode] = useState<ToneMode>('casual'); // 기본값: 일상모드
  const [userImpression, setUserImpression] = useState("");

  const [visitorReview, setVisitorReview] = useState("");
  const [visitorReviewCount, setVisitorReviewCount] = useState(0);
  const [isVisitorLoading, setIsVisitorLoading] = useState(false);

  const [blogReview, setBlogReview] = useState("");
  const [blogReviewCount, setBlogReviewCount] = useState(0);
  const [isBlogLoading, setIsBlogLoading] = useState(false);

  const [placeId, setPlaceId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [impressionFeedback, setImpressionFeedback] = useState("");
  const toast = useToast();

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsValidUrl(isValid);
  };

  const handleSubmit = async () => {
    if (!url.trim() || !isValidUrl) {
      toast({
        title: "유효하지 않은 URL",
        description: "네이버 지도 또는 naver.me URL을 입력해주세요.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // 선택된 타입 확인
    if (!reviewTypes.visitor && !reviewTypes.blog) {
      toast({
        title: "리뷰 타입 선택",
        description: "작성할 리뷰 타입을 하나 이상 선택해주세요.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // 사용자 감상 유효성 검사
    if (!userImpression.trim()) {
      toast({
        title: "감상 입력 필요",
        description: "해당 장소에 대한 간단한 감상을 작성해주세요.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Reset states
    setVisitorReview("");
    setVisitorReviewCount(0);
    setBlogReview("");
    setBlogReviewCount(0);
    setPlaceId(null);
    setImpressionFeedback("");
    
    // 새로운 요청 ID 생성
    const newRequestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setRequestId(newRequestId);
    
    // 사용자 환경 감지
    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const userEnvironment = isMobile ? 'mobile' : 'desktop';
    
    // 선택된 타입에 따라 로딩 상태 설정
    setIsVisitorLoading(reviewTypes.visitor);
    setIsBlogLoading(reviewTypes.blog);

    const baseUrl = "https://us-central1-review-maker-nvr.cloudfunctions.net";
    const requestStartTime = Date.now();

    try {
      // 로깅 초기화 API 호출
      try {
        await fetch(`${baseUrl}/initializeLogging`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'X-Request-ID': newRequestId,
            'X-User-Environment': userEnvironment,
            'X-User-Agent': userAgent
          },
          body: JSON.stringify({
            requestId: newRequestId,
            requestUrl: url,
            requestType: reviewTypes,
            userImpression: userImpression,
            toneMode: toneMode
          }),
        });
      } catch (logInitError) {
        console.warn("로깅 초기화 실패:", logInitError);
      }

      let visitorCrawlData = null;
      
      // 방문자 리뷰가 선택된 경우에만 크롤링
      if (reviewTypes.visitor) {
        const crawlVisitorRes = await fetch(
          `${baseUrl}/crawlVisitorReviews?url=${encodeURIComponent(url)}`,
          {
            method: 'GET',
            headers: {
              'X-Request-ID': newRequestId,
              'X-User-Environment': userEnvironment,
              'X-User-Agent': userAgent,
              'X-Request-Type': JSON.stringify(reviewTypes)
            }
          }
        );
        if (!crawlVisitorRes.ok) {
          const errData = await crawlVisitorRes.json();
          throw new Error(
            `방문자 후기 수집 실패: ${errData.detail || "서버 오류"}`
          );
        }
        visitorCrawlData = await crawlVisitorRes.json();
        setVisitorReviewCount(visitorCrawlData.visitorReviewCount);
        setPlaceId(visitorCrawlData.placeId);
      }

      // 방문자 리뷰 생성 함수
      const generateVisitor = async () => {
        if (!reviewTypes.visitor || !visitorCrawlData) {
          setIsVisitorLoading(false);
          return;
        }
        
        try {
          const res = await fetch(`${baseUrl}/generateVisitorReviewText`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              'X-Request-ID': newRequestId,
              'X-User-Environment': userEnvironment
            },
            body: JSON.stringify({
              visitorReviews: visitorCrawlData.visitorReviews,
              userImpression: userImpression,
              toneMode: toneMode
            }),
          });
          if (!res.ok) throw new Error("방문자 리뷰 작성 실패");
          const data = await res.json();
          setVisitorReview(data.visitorReview);
          
          // impression validation 피드백 처리
          if (data.impressionValidation && !impressionFeedback) {
            setImpressionFeedback(data.impressionValidation);
          }
        } catch (err) {
          console.error(err);
          setVisitorReview("오류: 방문자 리뷰 작성 중 문제가 발생했습니다.");
        } finally {
          setIsVisitorLoading(false);
        }
      };

      // 블로그 리뷰 처리 함수
      const processBlog = async () => {
        if (!reviewTypes.blog) {
          setIsBlogLoading(false);
          return;
        }
        
        try {
          const crawlRes = await fetch(
            `${baseUrl}/crawlBlogReviews?url=${encodeURIComponent(url)}`,
            {
              method: 'GET',
              headers: {
                'X-Request-ID': newRequestId,
                'X-User-Environment': userEnvironment,
                'X-Request-Type': JSON.stringify(reviewTypes)
              }
            }
          );
          if (!crawlRes.ok) {
            const errData = await crawlRes.json();
            throw new Error(
              `블로그 후기 수집 실패: ${errData.detail || "서버 오류"}`
            );
          }
          const crawlData = await crawlRes.json();
          setBlogReviewCount(crawlData.blogReviewCount);

          const genRes = await fetch(`${baseUrl}/generateBlogReviewText`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              'X-Request-ID': newRequestId,
              'X-User-Environment': userEnvironment
            },
            body: JSON.stringify({ 
              blogReviews: crawlData.blogReviews,
              userImpression: userImpression,
              toneMode: toneMode
            }),
          });
          if (!genRes.ok) throw new Error("블로그 리뷰 작성 실패");
          const genData = await genRes.json();
          setBlogReview(genData.blogReview);
          
          // impression validation 피드백 처리 (방문자 리뷰가 없는 경우)
          if (genData.impressionValidation && !impressionFeedback) {
            setImpressionFeedback(genData.impressionValidation);
          }
        } catch (err: any) {
          console.error(err);
          setBlogReview(
            `오류: ${err.message || "블로그 리뷰 처리 중 문제가 발생했습니다."}`
          );
        } finally {
          setIsBlogLoading(false);
        }
      };

      // 선택된 프로세스들을 병렬 실행
      await Promise.all([
        generateVisitor(),
        processBlog()
      ]);
      
      // 성공 시 로깅 완료
      try {
        await fetch(`${baseUrl}/completeRequest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: newRequestId,
            success: true,
            totalProcessingTime: Date.now() - requestStartTime
          }),
        });
      } catch (logError) {
        console.warn("로깅 완료 실패:", logError);
      }
      
    } catch (err: any) {
      console.error("전체 프로세스 오류:", err);
      toast({
        title: "오류 발생",
        description: err.message || "리뷰 작성 중 문제가 발생했습니다.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      // 로딩 상태를 모두 해제하여 사용자가 다시 시도할 수 있도록 함
      setIsVisitorLoading(false);
      setIsBlogLoading(false);
    }
  };

  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, teal.50, purple.50)",
    "linear(to-br, gray.900, blue.900, purple.900)"
  );
  const cardBg = useColorModeValue("white", "gray.800");
  const featureBg = useColorModeValue("gray.50", "gray.700");

  return (
    <>
      <Head>
        <title>Review Maker - 손쉽게/빠르게/완벽한 리뷰 제작</title>
        <meta name="description" content="네이버 플레이스 리뷰를 분석하여 방문자 리뷰와 블로그 리뷰를 자동으로 생성합니다. 무료 서비스로 지금 바로 시작하세요." />
      </Head>
      <Box minH="100vh" bgGradient={bgGradient}>
      <Container maxW="6xl" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <VStack spacing={{ base: 6, md: 8 }}>
          {/* 헤더 섹션 */}
          <VStack spacing={4} textAlign="center" w="100%">
            <HStack 
              spacing={{ base: 2, md: 3 }} 
              justify="center" 
              flexWrap="wrap"
            >
              <Icon as={FaRobot} boxSize={{ base: 6, md: 8 }} color="teal.500" />
              <Heading
                size={{ base: "xl", md: "2xl" }}
                bgGradient="linear(to-r, teal.400, blue.500, purple.500)"
                bgClip="text"
                fontWeight="bold"
              >
                리뷰 메이커
              </Heading>
            </HStack>
            
            <Text 
              fontSize={{ base: "md", md: "lg" }} 
              color="gray.600" 
              maxW="2xl"
              lineHeight="1.6"
              px={{ base: 2, md: 0 }}
              whiteSpace="pre-line"
            >
              {'네이버 지도 URL을 입력하면 실제 방문자 후기와 블로그 리뷰를 분석해서\n새로운 리뷰를 작성해드립니다'}
            </Text>

            {/* 특징 카드들 */}
            <HStack 
              spacing={{ base: 2, md: 4 }} 
              mt={4} 
              flexWrap="wrap" 
              justify="center"
              maxW="100%"
            >
              <Flex 
                align="center" 
                bg={featureBg} 
                px={{ base: 3, md: 4 }} 
                py={2} 
                borderRadius="full"
                minW="0"
              >
                <Icon as={FaStar} color="yellow.500" mr={2} boxSize={4} />
                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" noOfLines={1}>
                  실제 후기 분석
                </Text>
              </Flex>
              <Flex 
                align="center" 
                bg={featureBg} 
                px={{ base: 3, md: 4 }} 
                py={2} 
                borderRadius="full"
                minW="0"
              >
                <Icon as={FaMapMarkerAlt} color="red.500" mr={2} boxSize={4} />
                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" noOfLines={1}>
                  네이버 지도 연동
                </Text>
              </Flex>
              <Flex 
                align="center" 
                bg={featureBg} 
                px={{ base: 3, md: 4 }} 
                py={2} 
                borderRadius="full"
                minW="0"
              >
                <Icon as={FaLightbulb} color="orange.500" mr={2} boxSize={4} />
                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" noOfLines={1}>
                  자동 작성
                </Text>
              </Flex>
            </HStack>
          </VStack>

          {/* 상단 광고 */}
          <AdBanner 
            dataAdSlot="1234567890" 
            dataAdFormat="auto"
          />

          {/* 입력 섹션 */}
          <Box 
            w="100%" 
            maxW={{ base: "100%", md: "2xl" }} 
            p={{ base: 4, md: 8 }} 
            bg={cardBg}
            borderRadius={{ base: "xl", md: "2xl" }} 
            boxShadow={{ base: "lg", md: "2xl" }} 
            border="1px solid"
            borderColor={useColorModeValue("gray.100", "gray.700")}
          >
            <VStack spacing={6}>
              <SmartUrlInput
                value={url}
                onChange={handleUrlChange}
                onValidationChange={handleValidationChange}
                isLoading={isVisitorLoading || isBlogLoading}
                placeholder="네이버 지도 URL을 입력하세요"
              />
              
              <ReviewTypeSelector
                value={reviewTypes}
                onChange={setReviewTypes}
                toneMode={toneMode}
                onToneModeChange={setToneMode}
                isDisabled={isVisitorLoading || isBlogLoading}
              />
              
              <FormControl>
                <FormLabel 
                  fontSize={{ base: "sm", md: "md" }}
                  color={useColorModeValue("gray.700", "gray.300")}
                  fontWeight="medium"
                >
                  이 장소에 대한 간단한 감상을 작성해주세요
                </FormLabel>
                <Textarea
                  value={userImpression}
                  onChange={(e) => setUserImpression(e.target.value)}
                  placeholder="예: 분위기가 정말 좋았고, 음식도 맛있었어요. 친구들과 가기 좋은 곳 같네요."
                  isDisabled={isVisitorLoading || isBlogLoading}
                  rows={3}
                  resize="vertical"
                  borderRadius="lg"
                  bg={useColorModeValue("gray.50", "gray.700")}
                  border="1px solid"
                  borderColor={useColorModeValue("gray.200", "gray.600")}
                  _focus={{
                    borderColor: "teal.500",
                    boxShadow: "0 0 0 1px teal.500",
                    bg: useColorModeValue("white", "gray.800")
                  }}
                  _hover={{
                    borderColor: useColorModeValue("gray.300", "gray.500")
                  }}
                  fontSize={{ base: "sm", md: "md" }}
                />
                <Text 
                  fontSize="xs" 
                  color={useColorModeValue("gray.500", "gray.400")} 
                  mt={1}
                >
                  * 작성하신 감상이 리뷰 생성에 반영됩니다
                </Text>
                {impressionFeedback && (
                  <Text 
                    fontSize="sm" 
                    color={impressionFeedback.includes("반영됩니다") ? "green.600" : "orange.600"}
                    mt={2}
                    p={2}
                    bg={impressionFeedback.includes("반영됩니다") ? "green.50" : "orange.50"}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={impressionFeedback.includes("반영됩니다") ? "green.200" : "orange.200"}
                  >
                    {impressionFeedback}
                  </Text>
                )}
              </FormControl>
              
              <Button
                colorScheme="teal"
                onClick={handleSubmit}
                isLoading={isVisitorLoading || isBlogLoading}
                loadingText="리뷰를 작성하고 있습니다..."
                size={{ base: "md", md: "lg" }}
                w="100%"
                h={{ base: "12", md: "14" }}
                disabled={
                  !url.trim() || !isValidUrl || !userImpression.trim() || isVisitorLoading || isBlogLoading
                }
                borderRadius="xl"
                fontSize={{ base: "md", md: "lg" }}
                fontWeight="bold"
                bgGradient="linear(to-r, teal.500, blue.500)"
                _hover={{
                  bgGradient: "linear(to-r, teal.600, blue.600)",
                  transform: "translateY(-2px)",
                  boxShadow: "2xl"
                }}
                _active={{
                  transform: "translateY(0)",
                }}
                transition="all 0.2s"
              >
                <Icon as={FaRobot} mr={{ base: 2, md: 3 }} boxSize={{ base: 4, md: 5 }} />
                <Text display={{ base: "none", sm: "inline" }}>리뷰 작성하기</Text>
                <Text display={{ base: "inline", sm: "none" }}>작성하기</Text>
              </Button>
            </VStack>
          </Box>

          {/* 결과 섹션 */}
          {((reviewTypes.visitor && (isVisitorLoading || visitorReview)) || 
            (reviewTypes.blog && (isBlogLoading || blogReview))) && (
            <Box w="100%" maxW="4xl">
              <ReviewResult
                visitorReview={visitorReview}
                isVisitorLoading={isVisitorLoading}
                visitorReviewCount={visitorReviewCount}
                blogReview={blogReview}
                isBlogLoading={isBlogLoading}
                blogReviewCount={blogReviewCount}
                showVisitor={reviewTypes.visitor}
                showBlog={reviewTypes.blog}
              />
            </Box>
          )}

          {/* 하단 광고 */}
          <AdBanner 
            dataAdSlot="0987654321" 
            dataAdFormat="auto"
          />

          {/* 푸터 링크 */}
          <Box w="100%" maxW="4xl" pt={8}>
            <VStack spacing={4}>
              <HStack spacing={6} justify="center" flexWrap="wrap">
                <Link href="/about" color="teal.500" fontSize="sm" fontWeight="medium">
                  서비스 소개
                </Link>
                <Link href="/privacy" color="teal.500" fontSize="sm" fontWeight="medium">
                  프라이버시 정책
                </Link>
                <Link href="/terms" color="teal.500" fontSize="sm" fontWeight="medium">
                  이용약관
                </Link>
                <Link href="/contact" color="teal.500" fontSize="sm" fontWeight="medium">
                  문의하기
                </Link>
              </HStack>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                © 2025 Review Maker. All rights reserved.
              </Text>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
    </>
  );
}

import { useState } from "react";
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
  useColorModeValue
} from "@chakra-ui/react";
import { FaRobot, FaStar, FaMapMarkerAlt, FaLightbulb } from "react-icons/fa";
import ReviewResult from "../components/ReviewResult";
import SmartUrlInput from "../components/SmartUrlInput";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(true);

  const [visitorReview, setVisitorReview] = useState("");
  const [visitorReviewCount, setVisitorReviewCount] = useState(0);
  const [isVisitorLoading, setIsVisitorLoading] = useState(false);

  const [blogReview, setBlogReview] = useState("");
  const [blogReviewCount, setBlogReviewCount] = useState(0);
  const [isBlogLoading, setIsBlogLoading] = useState(false);

  const [placeId, setPlaceId] = useState<string | null>(null);
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

    // Reset states
    setVisitorReview("");
    setVisitorReviewCount(0);
    setBlogReview("");
    setBlogReviewCount(0);
    setPlaceId(null);
    setIsVisitorLoading(true);
    setIsBlogLoading(true);

    const baseUrl = "https://us-central1-review-maker-nvr.cloudfunctions.net";

    try {
      // 1. 방문자 리뷰 크롤링 (placeId 추출 및 DB 저장 담당)
      const crawlVisitorRes = await fetch(
        `${baseUrl}/crawlVisitorReviews?url=${encodeURIComponent(url)}`
      );
      if (!crawlVisitorRes.ok) {
        const errData = await crawlVisitorRes.json();
        throw new Error(
          `방문자 리뷰 수집 실패: ${errData.detail || "서버 오류"}`
        );
      }
      const visitorCrawlData = await crawlVisitorRes.json();
      setVisitorReviewCount(visitorCrawlData.visitorReviewCount);
      setPlaceId(visitorCrawlData.placeId);

      // 2-1. 방문자 리뷰 생성 (백그라운드에서 실행)
      const generateVisitor = async () => {
        try {
          const res = await fetch(`${baseUrl}/generateVisitorReviewText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visitorReviews: visitorCrawlData.visitorReviews,
            }),
          });
          if (!res.ok) throw new Error("방문자 리뷰 생성 실패");
          const data = await res.json();
          setVisitorReview(data.visitorReview);
        } catch (err) {
          console.error(err);
          setVisitorReview("오류: 방문자 리뷰 생성 중 문제가 발생했습니다.");
        } finally {
          setIsVisitorLoading(false);
        }
      };

      // 2-2. 블로그 리뷰 처리 (순차적 실행)
      const processBlog = async () => {
        try {
          const crawlRes = await fetch(
            `${baseUrl}/crawlBlogReviews?url=${encodeURIComponent(url)}`
          );
          if (!crawlRes.ok) {
            const errData = await crawlRes.json();
            throw new Error(
              `블로그 리뷰 수집 실패: ${errData.detail || "서버 오류"}`
            );
          }
          const crawlData = await crawlRes.json();
          setBlogReviewCount(crawlData.blogReviewCount);

          const genRes = await fetch(`${baseUrl}/generateBlogReviewText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blogReviews: crawlData.blogReviews }),
          });
          if (!genRes.ok) throw new Error("블로그 리뷰 생성 실패");
          const genData = await genRes.json();
          setBlogReview(genData.blogReview);
        } catch (err: any) {
          console.error(err);
          setBlogReview(
            `오류: ${err.message || "블로그 리뷰 처리 중 문제가 발생했습니다."}`
          );
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
        title: "오류 발생",
        description: err.message || "리뷰 생성 중 문제가 발생했습니다.",
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
              <Badge 
                colorScheme="teal" 
                variant="subtle" 
                px={{ base: 2, md: 3 }} 
                py={1} 
                borderRadius="full"
                fontSize={{ base: "xs", md: "sm" }}
              >
                AI 기반
              </Badge>
            </HStack>
            
            <Text 
              fontSize={{ base: "md", md: "lg" }} 
              color="gray.600" 
              maxW="2xl"
              lineHeight="1.6"
              px={{ base: 2, md: 0 }}
            >
              네이버 지도 URL을 입력하면 AI가 자동으로 방문자 리뷰와 블로그 리뷰를 생성해드립니다
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
                  실제 리뷰 분석
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
                  자동 생성
                </Text>
              </Flex>
            </HStack>
          </VStack>

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
              
              <Button
                colorScheme="teal"
                onClick={handleSubmit}
                isLoading={isVisitorLoading || isBlogLoading}
                loadingText="AI가 리뷰를 생성하고 있습니다..."
                size={{ base: "md", md: "lg" }}
                w="100%"
                h={{ base: "12", md: "14" }}
                disabled={
                  !url.trim() || !isValidUrl || isVisitorLoading || isBlogLoading
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
                <Text display={{ base: "none", sm: "inline" }}>AI 리뷰 생성하기</Text>
                <Text display={{ base: "inline", sm: "none" }}>생성하기</Text>
              </Button>
            </VStack>
          </Box>

          {/* 결과 섹션 */}
          {(isVisitorLoading || isBlogLoading || visitorReview || blogReview) && (
            <Box w="100%" maxW="4xl">
              <ReviewResult
                visitorReview={visitorReview}
                isVisitorLoading={isVisitorLoading}
                visitorReviewCount={visitorReviewCount}
                blogReview={blogReview}
                isBlogLoading={isBlogLoading}
                blogReviewCount={blogReviewCount}
              />
            </Box>
          )}
        </VStack>
      </Container>
    </Box>
  );
}

import {
  Box,
  Heading,
  Text,
  HStack,
  Badge,
  IconButton,
  useToast,
  VStack,
  Flex,
  Icon,
  useColorModeValue,
  Progress,
  ScaleFade,
  Divider,
  Spinner
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { CopyIcon, CheckIcon } from "@chakra-ui/icons";
import { FaUser, FaBlog, FaRobot, FaClock, FaSearch, FaPen, FaCheckCircle } from "react-icons/fa";
import { useState, useEffect } from "react";
import SkeletonLoader from "./SkeletonLoader";
import {
  parseMarkdownToJSX,
  parseMarkdownToPlainText,
} from "../utils/markdownUtils";

// 애니메이션 키프레임 정의
const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-8px); }
  60% { transform: translateY(-4px); }
`;

interface ReviewResultProps {
  visitorReview: string;
  isVisitorLoading: boolean;
  visitorReviewCount: number;
  blogReview: string;
  isBlogLoading: boolean;
  blogReviewCount: number;
  showVisitor?: boolean;
  showBlog?: boolean;
}

export default function ReviewResult({
  visitorReview,
  isVisitorLoading,
  visitorReviewCount,
  blogReview,
  isBlogLoading,
  blogReviewCount,
  showVisitor = true,
  showBlog = true,
}: ReviewResultProps) {
  const [copiedType, setCopiedType] = useState<"visitor" | "blog" | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const toast = useToast();

  // 진행 상황 계산 함수를 먼저 정의
  const getProgress = () => {
    const visitorDone = !isVisitorLoading && visitorReview && showVisitor;
    const blogDone = !isBlogLoading && blogReview && showBlog;
    const visitorActive = isVisitorLoading && showVisitor;
    const blogActive = isBlogLoading && showBlog;
    
    // 선택된 타입의 개수에 따라 진행률 계산
    const totalTypes = (showVisitor ? 1 : 0) + (showBlog ? 1 : 0);
    const completedTypes = (visitorDone ? 1 : 0) + (blogDone ? 1 : 0);
    
    if (totalTypes === 0) return 0;
    if (completedTypes === totalTypes) return 100;
    
    // 진행 중인 작업이 있으면 25% 추가
    const baseProgress = (completedTypes / totalTypes) * 100;
    const activeBonus = (visitorActive || blogActive) ? 25 : 0;
    
    return Math.min(100, baseProgress + activeBonus);
  };

  // 시간 추적
  useEffect(() => {
    const shouldTrack = (showVisitor && isVisitorLoading) || (showBlog && isBlogLoading);
    if (shouldTrack && !startTime) {
      setStartTime(Date.now());
    }
  }, [isVisitorLoading, isBlogLoading, showVisitor, showBlog, startTime]);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
      
      // 개선된 예상 완료 시간 계산
      const progress = getProgress();
      if (progress > 15 && progress < 85 && elapsed >= 10) {
        // 최근 10초간의 평균 진행 속도를 기반으로 계산
        const remainingProgress = 100 - progress;
        const progressRate = progress / elapsed; // 초당 진행률
        
        if (progressRate > 0) {
          const rawEstimated = remainingProgress / progressRate;
          // 과도한 예상 시간을 제한하고, 기존 예상 시간보다 크게 증가하지 않도록 함
          const maxEstimated = Math.max(120, elapsed * 2); // 최대 2분 또는 경과 시간의 2배
          let smoothedEstimated = Math.min(rawEstimated, maxEstimated);
          
          // 기존 예상 시간이 있으면 급격한 변화를 부드럽게 처리
          if (estimatedTime > 0) {
            const changeLimit = Math.max(10, estimatedTime * 0.2); // 기존 시간의 20% 또는 10초
            if (smoothedEstimated > estimatedTime + changeLimit) {
              smoothedEstimated = estimatedTime + changeLimit;
            } else if (smoothedEstimated < estimatedTime - changeLimit) {
              smoothedEstimated = estimatedTime - changeLimit;
            }
          }
          
          setEstimatedTime(Math.floor(smoothedEstimated));
        }
      } else if (progress >= 85) {
        // 85% 이상이면 예상 시간을 점진적으로 줄임
        setEstimatedTime(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isVisitorLoading, isBlogLoading, visitorReview, blogReview, estimatedTime]);

  // 처리 완료 시 시간 추적 중단
  useEffect(() => {
    const visitorComplete = !showVisitor || (!isVisitorLoading && visitorReview);
    const blogComplete = !showBlog || (!isBlogLoading && blogReview);
    
    if (visitorComplete && blogComplete) {
      setStartTime(null);
      setEstimatedTime(0);
    }
  }, [isVisitorLoading, isBlogLoading, visitorReview, blogReview, showVisitor, showBlog]);

  const copyToClipboard = async (text: string, type: "visitor" | "blog") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      toast({
        title: "복사 완료!",
        description: `${
          type === "visitor" ? "방문자" : "블로그"
        } 후기가 클립보드에 복사되었습니다.`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사에 실패했습니다.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const cardBg = useColorModeValue("white", "gray.800");
  const contentBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // 현재 처리 단계 가져오기
  const getCurrentStep = () => {
    const visitorDone = !showVisitor || (!isVisitorLoading && visitorReview);
    const blogDone = !showBlog || (!isBlogLoading && blogReview);
    const visitorActive = showVisitor && isVisitorLoading;
    const blogActive = showBlog && isBlogLoading;
    
    if (visitorDone && blogDone) {
      const completedTypes = [];
      if (showVisitor) completedTypes.push('방문자 후기');
      if (showBlog) completedTypes.push('블로그 후기');
      return { 
        phase: 'complete', 
        message: `${completedTypes.join('와 ')} 작성이 완료되었습니다` 
      };
    }
    
    if (visitorActive && blogActive) {
      return { phase: 'collecting', message: '방문자 후기와 블로그 후기를 동시에 수집하고 있습니다' };
    }
    
    if (visitorActive) {
      return { phase: 'visitor', message: '방문자 후기를 분석하여 새로운 후기를 작성하고 있습니다' };
    }
    
    if (blogActive) {
      return { phase: 'blog', message: '블로그 후기를 분석하여 새로운 후기를 작성하고 있습니다' };
    }
    
    return { phase: 'idle', message: '준비 중입니다' };
  };

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
  };

  // 단계별 아이콘 및 색상 가져오기
  const getStepIcon = (phase: string) => {
    switch (phase) {
      case 'collecting': return { icon: FaSearch, color: 'blue.500', animation: spin };
      case 'visitor': return { icon: FaPen, color: 'blue.500', animation: pulse };
      case 'blog': return { icon: FaPen, color: 'purple.500', animation: pulse };
      case 'complete': return { icon: FaCheckCircle, color: 'green.500', animation: bounce };
      default: return { icon: FaClock, color: 'gray.500' };
    }
  };

  return (
    <VStack spacing={6} w="100%">
      {/* 전체 진행 상황 표시 */}
      {((showVisitor && isVisitorLoading) || (showBlog && isBlogLoading)) && (
        <ScaleFade initialScale={0.9} in={isVisitorLoading || isBlogLoading}>
          <Box 
            w="100%" 
            p={{ base: 4, md: 6 }} 
            bg={cardBg} 
            borderRadius={{ base: "xl", md: "2xl" }} 
            boxShadow="xl" 
            border="2px solid" 
            borderColor={getStepIcon(getCurrentStep().phase).color}
            position="relative"
            overflow="hidden"
          >
            {/* 배경 애니메이션 효과 */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)"
              animation={`${pulse} 3s ease-in-out infinite`}
              pointerEvents="none"
            />
            
            <VStack spacing={5} position="relative" zIndex={1}>
              {/* 메인 상태 표시 */}
              <Flex align="center" w="100%" direction={{ base: "column", sm: "row" }} textAlign={{ base: "center", sm: "left" }}>
                <Box 
                  p={3}
                  borderRadius="full"
                  bg={`${getStepIcon(getCurrentStep().phase).color.split('.')[0]}.100`}
                  mr={{ base: 0, sm: 4 }}
                  mb={{ base: 3, sm: 0 }}
                  animation={getStepIcon(getCurrentStep().phase).animation ? `${getStepIcon(getCurrentStep().phase).animation} 2s infinite` : undefined}
                >
                  <Icon 
                    as={getStepIcon(getCurrentStep().phase).icon} 
                    color={getStepIcon(getCurrentStep().phase).color} 
                    boxSize={{ base: 8, md: 6 }} 
                  />
                </Box>
                <VStack flex={1} align={{ base: "center", sm: "start" }} spacing={2}>
                  <Text fontWeight="bold" color={getStepIcon(getCurrentStep().phase).color} fontSize={{ base: "lg", md: "xl" }}>
                    {getCurrentStep().phase === 'complete' ? '작성 완료!' : '리뷰 작성 중...'}
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign={{ base: "center", sm: "left" }} maxW="400px">
                    {getCurrentStep().message}
                  </Text>
                </VStack>
              </Flex>
              
              {/* 진행률 및 시간 정보 */}
              <Box w="100%">
                <Flex justify="space-between" mb={3} flexWrap="wrap" gap={2}>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">진행률</Text>
                    <Text fontSize="lg" color={getStepIcon(getCurrentStep().phase).color} fontWeight="bold">
                      {getProgress()}%
                    </Text>
                  </VStack>
                  
                  {elapsedTime > 0 && (
                    <VStack align="center" spacing={0}>
                      <Text fontSize="sm" color="gray.600" fontWeight="medium">경과 시간</Text>
                      <Text fontSize="md" color="gray.700" fontWeight="bold">
                        {formatTime(elapsedTime)}
                      </Text>
                    </VStack>
                  )}
                  
                  {estimatedTime > 0 && getProgress() < 90 && (
                    <VStack align="end" spacing={0}>
                      <Text fontSize="sm" color="gray.600" fontWeight="medium">예상 남은 시간</Text>
                      <Text fontSize="md" color="orange.600" fontWeight="bold">
                        약 {formatTime(estimatedTime)}
                      </Text>
                    </VStack>
                  )}
                </Flex>
                
                <Progress 
                  value={getProgress()} 
                  colorScheme={getStepIcon(getCurrentStep().phase).color.split('.')[0]} 
                  size="lg" 
                  borderRadius="full"
                  bg="gray.100"
                  boxShadow="inner"
                  hasStripe
                  isAnimated={getProgress() < 100}
                />
              </Box>
              
              {/* 세부 상태 표시 */}
              <HStack 
                spacing={{ base: 4, md: 6 }} 
                w="100%" 
                justify="center"
                flexWrap="wrap"
                p={4}
                bg="gray.50"
                borderRadius="xl"
              >
                {showVisitor && (
                  <VStack spacing={2} align="center" minW="100px">
                    <Flex align="center" position="relative">
                      <Icon 
                        as={FaUser} 
                        color={!isVisitorLoading && visitorReview ? "green.500" : isVisitorLoading ? "blue.500" : "gray.400"} 
                        boxSize={6}
                      />
                      {isVisitorLoading && (
                        <Spinner 
                          size="xs" 
                          color="blue.500" 
                          position="absolute" 
                          top={-1} 
                          right={-1}
                        />
                      )}
                      {!isVisitorLoading && visitorReview && (
                        <Icon 
                          as={FaCheckCircle} 
                          color="green.500" 
                          boxSize={3} 
                          position="absolute" 
                          top={-1} 
                          right={-1}
                        />
                      )}
                    </Flex>
                    <VStack spacing={0}>
                      <Text fontSize="sm" color="gray.700" fontWeight="medium" noOfLines={1}>방문자 후기</Text>
                      <Text fontSize="xs" color={!isVisitorLoading && visitorReview ? "green.600" : isVisitorLoading ? "blue.600" : "gray.500"}>
                        {!isVisitorLoading && visitorReview ? "완료" : isVisitorLoading ? "작성 중" : "대기"}
                      </Text>
                      {visitorReviewCount > 0 && (
                        <Text fontSize="xs" color="gray.400">
                          {visitorReviewCount}개 분석
                        </Text>
                      )}
                    </VStack>
                  </VStack>
                )}
                
                {showVisitor && showBlog && <Divider orientation="vertical" h="60px" />}
                
                {showBlog && (
                  <VStack spacing={2} align="center" minW="100px">
                    <Flex align="center" position="relative">
                      <Icon 
                        as={FaBlog} 
                        color={!isBlogLoading && blogReview ? "green.500" : isBlogLoading ? "purple.500" : "gray.400"} 
                        boxSize={6}
                      />
                      {isBlogLoading && (
                        <Spinner 
                          size="xs" 
                          color="purple.500" 
                          position="absolute" 
                          top={-1} 
                          right={-1}
                        />
                      )}
                      {!isBlogLoading && blogReview && (
                        <Icon 
                          as={FaCheckCircle} 
                          color="green.500" 
                          boxSize={3} 
                          position="absolute" 
                          top={-1} 
                          right={-1}
                        />
                      )}
                    </Flex>
                    <VStack spacing={0}>
                      <Text fontSize="sm" color="gray.700" fontWeight="medium" noOfLines={1}>블로그 후기</Text>
                      <Text fontSize="xs" color={!isBlogLoading && blogReview ? "green.600" : isBlogLoading ? "purple.600" : "gray.500"}>
                        {!isBlogLoading && blogReview ? "완료" : isBlogLoading ? "작성 중" : "대기"}
                      </Text>
                      {blogReviewCount > 0 && (
                        <Text fontSize="xs" color="gray.400">
                          {blogReviewCount}개 분석
                        </Text>
                      )}
                    </VStack>
                  </VStack>
                )}
              </HStack>
            </VStack>
          </Box>
        </ScaleFade>
      )}

      {/* 방문자 리뷰 */}
      {showVisitor && !isVisitorLoading && visitorReview && (
        <ScaleFade initialScale={0.9} in={!isVisitorLoading && !!visitorReview}>
          <Box 
            w="100%" 
            p={{ base: 4, md: 6 }} 
            bg={cardBg} 
            borderRadius={{ base: "xl", md: "2xl" }} 
            boxShadow="xl" 
            border="1px solid" 
            borderColor={borderColor}
          >
            <Flex 
              justify="space-between" 
              align={{ base: "start", sm: "center" }} 
              mb={4}
              direction={{ base: "column", sm: "row" }}
              gap={{ base: 3, sm: 0 }}
            >
              <HStack spacing={{ base: 2, md: 3 }}>
                <Icon as={FaUser} color="blue.500" boxSize={{ base: 4, md: 5 }} />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="blue.600">
                    방문자 후기
                  </Text>
                  {visitorReviewCount > 0 && (
                    <Text fontSize="sm" color="gray.500">
                      {visitorReviewCount}개 실제 후기 분석
                    </Text>
                  )}
                </VStack>
              </HStack>
              
              <IconButton
                aria-label="방문자 후기 복사"
                icon={copiedType === "visitor" ? <CheckIcon /> : <CopyIcon />}
                size={{ base: "sm", md: "md" }}
                colorScheme={copiedType === "visitor" ? "green" : "blue"}
                variant={copiedType === "visitor" ? "solid" : "ghost"}
                onClick={() => copyToClipboard(visitorReview, "visitor")}
                isDisabled={visitorReview.startsWith("오류:")}
                borderRadius="lg"
                _hover={{
                  transform: "scale(1.05)",
                }}
                transition="all 0.2s"
              />
            </Flex>
            
            <Box
              p={{ base: 3, md: 5 }}
              bg={contentBg}
              borderRadius="xl"
              border="1px solid"
              borderColor={borderColor}
            >
              <Text
                whiteSpace="pre-line"
                lineHeight="1.7"
                fontSize={{ base: "sm", md: "md" }}
                color={visitorReview.startsWith("오류:") ? "red.500" : "gray.700"}
                fontWeight="medium"
              >
                {visitorReview}
              </Text>
            </Box>
          </Box>
        </ScaleFade>
      )}

      {/* 블로그 리뷰 */}
      {showBlog && !isBlogLoading && blogReview && (
        <ScaleFade initialScale={0.9} in={!isBlogLoading && !!blogReview}>
          <Box 
            w="100%" 
            p={{ base: 4, md: 6 }} 
            bg={cardBg} 
            borderRadius={{ base: "xl", md: "2xl" }} 
            boxShadow="xl" 
            border="1px solid" 
            borderColor={borderColor}
          >
            <Flex 
              justify="space-between" 
              align={{ base: "start", sm: "center" }} 
              mb={4}
              direction={{ base: "column", sm: "row" }}
              gap={{ base: 3, sm: 0 }}
            >
              <HStack spacing={{ base: 2, md: 3 }}>
                <Icon as={FaBlog} color="purple.500" boxSize={{ base: 4, md: 5 }} />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="purple.600">
                    블로그 후기
                  </Text>
                  {blogReviewCount > 0 && (
                    <Text fontSize="sm" color="gray.500">
                      {blogReviewCount}개 블로그 포스트 분석
                    </Text>
                  )}
                </VStack>
              </HStack>
              
              <IconButton
                aria-label="블로그 후기 복사"
                icon={copiedType === "blog" ? <CheckIcon /> : <CopyIcon />}
                size={{ base: "sm", md: "md" }}
                colorScheme={copiedType === "blog" ? "green" : "purple"}
                variant={copiedType === "blog" ? "solid" : "ghost"}
                onClick={() =>
                  copyToClipboard(parseMarkdownToPlainText(blogReview), "blog")
                }
                isDisabled={blogReview.startsWith("오류:")}
                borderRadius="lg"
                _hover={{
                  transform: "scale(1.05)",
                }}
                transition="all 0.2s"
              />
            </Flex>
            
            <Box
              p={{ base: 3, md: 5 }}
              bg={contentBg}
              borderRadius="xl"
              border="1px solid"
              borderColor={borderColor}
              overflowX="auto"
            >
              <Box
                lineHeight="1.7"
                fontSize={{ base: "sm", md: "md" }}
                fontFamily="body"
                color={blogReview.startsWith("오류:") ? "red.500" : "gray.700"}
              >
                {blogReview.startsWith("오류:")
                  ? <Text fontWeight="medium">{blogReview}</Text>
                  : parseMarkdownToJSX(blogReview)}
              </Box>
            </Box>
          </Box>
        </ScaleFade>
      )}
    </VStack>
  );
}

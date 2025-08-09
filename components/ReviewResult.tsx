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
  Divider
} from "@chakra-ui/react";
import { CopyIcon, CheckIcon } from "@chakra-ui/icons";
import { FaUser, FaBlog, FaRobot, FaClock } from "react-icons/fa";
import { useState } from "react";
import SkeletonLoader from "./SkeletonLoader";
import {
  parseMarkdownToJSX,
  parseMarkdownToPlainText,
} from "../utils/markdownUtils";

interface ReviewResultProps {
  visitorReview: string;
  isVisitorLoading: boolean;
  visitorReviewCount: number;
  blogReview: string;
  isBlogLoading: boolean;
  blogReviewCount: number;
}

export default function ReviewResult({
  visitorReview,
  isVisitorLoading,
  visitorReviewCount,
  blogReview,
  isBlogLoading,
  blogReviewCount,
}: ReviewResultProps) {
  const [copiedType, setCopiedType] = useState<"visitor" | "blog" | null>(null);
  const toast = useToast();

  const copyToClipboard = async (text: string, type: "visitor" | "blog") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      toast({
        title: "복사 완료!",
        description: `${
          type === "visitor" ? "방문자" : "블로그"
        } 리뷰가 클립보드에 복사되었습니다.`,
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

  // 진행 상황 계산
  const getProgress = () => {
    const visitorDone = !isVisitorLoading && visitorReview;
    const blogDone = !isBlogLoading && blogReview;
    
    if (visitorDone && blogDone) return 100;
    if (visitorDone || blogDone) return 50;
    if (isVisitorLoading || isBlogLoading) return 25;
    return 0;
  };

  return (
    <VStack spacing={6} w="100%">
      {/* 전체 진행 상황 표시 */}
      {(isVisitorLoading || isBlogLoading) && (
        <ScaleFade initialScale={0.9} in={isVisitorLoading || isBlogLoading}>
          <Box 
            w="100%" 
            p={{ base: 4, md: 6 }} 
            bg={cardBg} 
            borderRadius={{ base: "xl", md: "2xl" }} 
            boxShadow="lg" 
            border="1px solid" 
            borderColor={borderColor}
          >
            <VStack spacing={4}>
              <Flex align="center" w="100%" direction={{ base: "column", sm: "row" }} textAlign={{ base: "center", sm: "left" }}>
                <Icon as={FaRobot} color="teal.500" boxSize={{ base: 8, md: 6 }} mr={{ base: 0, sm: 3 }} mb={{ base: 2, sm: 0 }} />
                <VStack flex={1} align={{ base: "center", sm: "start" }} spacing={1}>
                  <Text fontWeight="bold" color="teal.600" fontSize={{ base: "lg", md: "md" }}>
                    AI가 리뷰를 생성하고 있습니다
                  </Text>
                  <Text fontSize="sm" color="gray.500" textAlign={{ base: "center", sm: "left" }}>
                    실제 리뷰 데이터를 분석하여 자연스러운 리뷰를 만들고 있어요
                  </Text>
                </VStack>
              </Flex>
              
              <Box w="100%">
                <Flex justify="space-between" mb={2}>
                  <Text fontSize="sm" color="gray.600" fontWeight="medium">진행률</Text>
                  <Text fontSize="sm" color="teal.600" fontWeight="bold">{getProgress()}%</Text>
                </Flex>
                <Progress 
                  value={getProgress()} 
                  colorScheme="teal" 
                  size="md" 
                  borderRadius="full"
                  bg="gray.100"
                />
              </Box>
              
              <HStack 
                spacing={{ base: 2, md: 4 }} 
                w="100%" 
                justify="center"
                flexWrap="wrap"
              >
                <Flex align="center" opacity={isVisitorLoading ? 1 : 0.5} minW="0">
                  <Icon as={FaUser} color="blue.500" mr={2} boxSize={4} />
                  <Text fontSize="sm" color="gray.600" noOfLines={1}>방문자 리뷰</Text>
                  {isVisitorLoading && <Icon as={FaClock} color="orange.500" ml={2} boxSize={3} />}
                </Flex>
                <Divider 
                  orientation={{ base: "horizontal", sm: "vertical" }} 
                  h={{ base: "1px", sm: "4" }} 
                  w={{ base: "20px", sm: "1px" }}
                />
                <Flex align="center" opacity={isBlogLoading ? 1 : 0.5} minW="0">
                  <Icon as={FaBlog} color="purple.500" mr={2} boxSize={4} />
                  <Text fontSize="sm" color="gray.600" noOfLines={1}>블로그 리뷰</Text>
                  {isBlogLoading && <Icon as={FaClock} color="orange.500" ml={2} boxSize={3} />}
                </Flex>
              </HStack>
            </VStack>
          </Box>
        </ScaleFade>
      )}

      {/* 방문자 리뷰 */}
      {!isVisitorLoading && visitorReview && (
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
                    방문자 리뷰
                  </Text>
                  {visitorReviewCount > 0 && (
                    <Text fontSize="sm" color="gray.500">
                      {visitorReviewCount}개 실제 리뷰 분석
                    </Text>
                  )}
                </VStack>
              </HStack>
              
              <IconButton
                aria-label="방문자 리뷰 복사"
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
      {!isBlogLoading && blogReview && (
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
                    블로그 리뷰
                  </Text>
                  {blogReviewCount > 0 && (
                    <Text fontSize="sm" color="gray.500">
                      {blogReviewCount}개 블로그 포스트 분석
                    </Text>
                  )}
                </VStack>
              </HStack>
              
              <IconButton
                aria-label="블로그 리뷰 복사"
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

import {
  Box,
  Heading,
  Text,
  HStack,
  Badge,
  IconButton,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { CopyIcon, CheckIcon } from "@chakra-ui/icons";
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

  return (
    <VStack spacing={6} w="100%">
      {isVisitorLoading ? (
        <SkeletonLoader />
      ) : (
        visitorReview && (
          <Box w="100%" p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
            <HStack spacing={2} mb={3} justify="space-between">
              <HStack spacing={2}>
                <Badge colorScheme="blue" variant="subtle">
                  방문자 리뷰
                </Badge>
                {visitorReviewCount > 0 && (
                  <Text fontSize="sm" color="gray.500">
                    {visitorReviewCount}개 리뷰 참고
                  </Text>
                )}
              </HStack>
              <IconButton
                aria-label="방문자 리뷰 복사"
                icon={copiedType === "visitor" ? <CheckIcon /> : <CopyIcon />}
                size="sm"
                colorScheme={copiedType === "visitor" ? "green" : "gray"}
                onClick={() => copyToClipboard(visitorReview, "visitor")}
                isDisabled={visitorReview.startsWith("오류:")}
              />
            </HStack>
            <Text
              whiteSpace="pre-line"
              lineHeight="tall"
              p={4}
              bg="gray.50"
              borderRadius="md"
              fontSize="md"
              color={visitorReview.startsWith("오류:") ? "red.500" : "inherit"}
            >
              {visitorReview}
            </Text>
          </Box>
        )
      )}

      {isBlogLoading ? (
        <SkeletonLoader />
      ) : (
        blogReview && (
          <Box w="100%" p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
            <HStack spacing={2} mb={3} justify="space-between">
              <HStack spacing={2}>
                <Badge colorScheme="purple" variant="subtle">
                  블로그 리뷰
                </Badge>
                {blogReviewCount > 0 && (
                  <Text fontSize="sm" color="gray.500">
                    {blogReviewCount}개 리뷰 참고
                  </Text>
                )}
              </HStack>
              <IconButton
                aria-label="블로그 리뷰 복사"
                icon={copiedType === "blog" ? <CheckIcon /> : <CopyIcon />}
                size="sm"
                colorScheme={copiedType === "blog" ? "green" : "gray"}
                onClick={() =>
                  copyToClipboard(parseMarkdownToPlainText(blogReview), "blog")
                }
                isDisabled={blogReview.startsWith("오류:")}
              />
            </HStack>
            <Box
              lineHeight="tall"
              p={4}
              bg="gray.50"
              borderRadius="md"
              fontSize="sm"
              overflowX="auto"
              fontFamily="body"
              color={blogReview.startsWith("오류:") ? "red.500" : "inherit"}
            >
              {blogReview.startsWith("오류:")
                ? blogReview
                : parseMarkdownToJSX(blogReview)}
            </Box>
          </Box>
        )
      )}
    </VStack>
  );
}

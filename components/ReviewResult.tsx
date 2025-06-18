import { 
  Box, 
  Heading, 
  Text, 
  HStack, 
  Badge, 
  IconButton, 
  useToast,
  VStack
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { useState } from 'react';

interface ReviewResultProps {
  visitorReview?: string;
  blogReview?: string;
  visitorReviewCount?: number;
  blogReviewCount?: number;
}

export default function ReviewResult({ 
  visitorReview, 
  blogReview, 
  visitorReviewCount = 0, 
  blogReviewCount = 0 
}: ReviewResultProps) {
  const [copiedType, setCopiedType] = useState<'visitor' | 'blog' | null>(null);
  const toast = useToast();

  const copyToClipboard = async (text: string, type: 'visitor' | 'blog') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      toast({
        title: '복사 완료!',
        description: `${type === 'visitor' ? '방문자' : '블로그'} 리뷰가 클립보드에 복사되었습니다.`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      toast({
        title: '복사 실패',
        description: '클립보드 복사에 실패했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack spacing={4} w="100%">
      {visitorReview && (
        <Box w="100%" p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
          <HStack spacing={2} mb={3} justify="space-between">
            <HStack spacing={2}>
              <Badge colorScheme="blue" variant="subtle">방문자 리뷰</Badge>
              <Text fontSize="sm" color="gray.500">
                4-5문장, 이모지 포함 • {visitorReviewCount}개 리뷰 참고
              </Text>
            </HStack>
            <IconButton
              aria-label="방문자 리뷰 복사"
              icon={copiedType === 'visitor' ? <CheckIcon /> : <CopyIcon />}
              size="sm"
              colorScheme={copiedType === 'visitor' ? 'green' : 'gray'}
              onClick={() => copyToClipboard(visitorReview, 'visitor')}
            />
          </HStack>
          <Heading size="md" mb={3}>방문자 리뷰</Heading>
          <Text 
            whiteSpace="pre-line" 
            lineHeight="tall"
            p={4}
            bg="gray.50"
            borderRadius="md"
            fontSize="md"
          >
            {visitorReview}
          </Text>
        </Box>
      )}
      
      {blogReview && (
        <Box w="100%" p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
          <HStack spacing={2} mb={3} justify="space-between">
            <HStack spacing={2}>
              <Badge colorScheme="purple" variant="subtle">블로그 리뷰</Badge>
              <Text fontSize="sm" color="gray.500">
                자세한 분석, 일반 텍스트 • {blogReviewCount}개 리뷰 참고
              </Text>
            </HStack>
            <IconButton
              aria-label="블로그 리뷰 복사"
              icon={copiedType === 'blog' ? <CheckIcon /> : <CopyIcon />}
              size="sm"
              colorScheme={copiedType === 'blog' ? 'green' : 'gray'}
              onClick={() => copyToClipboard(blogReview, 'blog')}
            />
          </HStack>
          <Heading size="md" mb={3}>블로그 리뷰</Heading>
          <Box 
            whiteSpace="pre-line" 
            lineHeight="tall"
            p={4}
            bg="gray.50"
            borderRadius="md"
            fontSize="sm"
            overflowX="auto"
            fontFamily="body"
          >
            {blogReview}
          </Box>
        </Box>
      )}
    </VStack>
  );
} 
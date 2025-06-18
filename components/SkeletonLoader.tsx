import { Box, VStack, Skeleton, SkeletonText, HStack } from '@chakra-ui/react';

export default function SkeletonLoader() {
  return (
    <VStack spacing={4} w="100%" align="stretch">
      {/* 방문자 리뷰 스켈레톤 */}
      <Box w="100%" p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
        <HStack spacing={2} mb={3}>
          <Skeleton height="20px" width="80px" borderRadius="full" />
          <Skeleton height="16px" width="120px" />
        </HStack>
        <Skeleton height="24px" width="150px" mb={3} />
        <Box p={4} bg="gray.50" borderRadius="md">
          <SkeletonText noOfLines={4} spacing={3} skeletonHeight="16px" />
        </Box>
      </Box>

      {/* 블로그 리뷰 스켈레톤 */}
      <Box w="100%" p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
        <HStack spacing={2} mb={3}>
          <Skeleton height="20px" width="80px" borderRadius="full" />
          <Skeleton height="16px" width="140px" />
        </HStack>
        <Skeleton height="24px" width="120px" mb={3} />
        <Box p={4} bg="gray.50" borderRadius="md">
          <SkeletonText noOfLines={8} spacing={3} skeletonHeight="16px" />
        </Box>
      </Box>
    </VStack>
  );
} 
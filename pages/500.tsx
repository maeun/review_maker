import { Box, Heading, Text, Button, VStack, Container } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default function Custom500() {
  const router = useRouter();

  return (
    <Container maxW="lg" py={20}>
      <VStack spacing={8} textAlign="center">
        <Heading size="2xl" color="red.500">
          500
        </Heading>
        <Text fontSize="lg" color="gray.600">
          서버 오류가 발생했습니다
        </Text>
        <Text fontSize="md" color="gray.500">
          일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </Text>
        <Button 
          colorScheme="teal" 
          onClick={() => router.push('/')}
          size="lg"
        >
          홈으로 돌아가기
        </Button>
      </VStack>
    </Container>
  );
} 
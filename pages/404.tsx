import { Box, Heading, Text, Button, VStack, Container } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default function Custom404() {
  const router = useRouter();

  return (
    <Container maxW="lg" py={20}>
      <VStack spacing={8} textAlign="center">
        <Heading size="2xl" color="red.500">
          404
        </Heading>
        <Text fontSize="lg" color="gray.600">
          페이지를 찾을 수 없습니다
        </Text>
        <Text fontSize="md" color="gray.500">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
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
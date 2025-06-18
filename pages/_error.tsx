import { Box, Heading, Text, Button, VStack, Container } from '@chakra-ui/react';
import { useRouter } from 'next/router';

interface ErrorProps {
  statusCode?: number;
}

export default function Error({ statusCode }: ErrorProps) {
  const router = useRouter();

  const getErrorMessage = (code?: number) => {
    switch (code) {
      case 404:
        return '페이지를 찾을 수 없습니다';
      case 500:
        return '서버 오류가 발생했습니다';
      default:
        return '예상치 못한 오류가 발생했습니다';
    }
  };

  return (
    <Container maxW="lg" py={20}>
      <VStack spacing={8} textAlign="center">
        <Heading size="2xl" color="red.500">
          {statusCode || '오류'}
        </Heading>
        <Text fontSize="lg" color="gray.600">
          {getErrorMessage(statusCode)}
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

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
}; 
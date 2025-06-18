import { keyframes } from '@emotion/react';
import { Box, VStack, HStack, Text } from '@chakra-ui/react';
import { Icon } from '@chakra-ui/icons';
import { TimeIcon, InfoIcon, CheckCircleIcon } from '@chakra-ui/icons';

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
`;

const fadeInOut = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

interface LoadingAnimationProps {
  step: 'idle' | 'crawling' | 'generating' | 'complete';
  progress: number;
}

export default function LoadingAnimation({ step, progress }: LoadingAnimationProps) {
  const getStepConfig = (step: string) => {
    switch (step) {
      case 'crawling':
        return {
          icon: TimeIcon,
          title: '리뷰 데이터 수집 중...',
          description: '네이버 지도에서 실제 리뷰들을 가져오고 있습니다.',
          color: 'blue',
          animation: bounce
        };
      case 'generating':
        return {
          icon: InfoIcon,
          title: 'AI 리뷰 생성 중...',
          description: '수집된 리뷰를 바탕으로 새로운 리뷰를 생성하고 있습니다.',
          color: 'purple',
          animation: rotate
        };
      case 'complete':
        return {
          icon: CheckCircleIcon,
          title: '리뷰 생성 완료!',
          description: '새로운 리뷰가 성공적으로 생성되었습니다.',
          color: 'green',
          animation: bounce
        };
      default:
        return null;
    }
  };

  const config = getStepConfig(step);
  if (!config) return null;

  return (
    <Box
      w="100%"
      p={8}
      borderWidth={2}
      borderRadius="xl"
      borderColor={`${config.color}.200`}
      bg={`${config.color}.50`}
      boxShadow="lg"
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
        bg={`${config.color}.100`}
        opacity={0.1}
        animation={`${fadeInOut} 3s ease-in-out infinite`}
      />
      
      <VStack spacing={6} position="relative" zIndex={1}>
        {/* 아이콘과 제목 */}
        <VStack spacing={3}>
          <Box
            p={4}
            borderRadius="full"
            bg={`${config.color}.100`}
            animation={`${config.animation} 2s infinite`}
          >
            <Icon
              as={config.icon}
              color={`${config.color}.600`}
              boxSize={8}
            />
          </Box>
          <Text
            fontSize="xl"
            fontWeight="bold"
            color={`${config.color}.700`}
            textAlign="center"
          >
            {config.title}
          </Text>
        </VStack>

        {/* 설명 */}
        <Text
          color="gray.600"
          textAlign="center"
          fontSize="md"
          maxW="300px"
        >
          {config.description}
        </Text>

        {/* 진행률 바 */}
        <VStack spacing={2} w="100%">
          <Box
            w="100%"
            h="8px"
            bg={`${config.color}.100`}
            borderRadius="full"
            overflow="hidden"
            position="relative"
          >
            <Box
              h="100%"
              bg={`${config.color}.500`}
              borderRadius="full"
              width={`${progress}%`}
              transition="width 0.5s ease-in-out"
              position="relative"
            >
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bg="white"
                opacity={0.3}
                animation={`${fadeInOut} 1.5s ease-in-out infinite`}
              />
            </Box>
          </Box>
          <Text fontSize="sm" color={`${config.color}.600`} fontWeight="medium">
            {progress}% 완료
          </Text>
        </VStack>

        {/* 단계별 진행 표시 */}
        <HStack spacing={4} justify="center">
          <Box
            w="12px"
            h="12px"
            borderRadius="full"
            bg={step === 'crawling' || step === 'generating' || step === 'complete' ? 'blue.500' : 'gray.300'}
            animation={step === 'crawling' ? `${bounce} 1s infinite` : undefined}
          />
          <Box
            w="12px"
            h="12px"
            borderRadius="full"
            bg={step === 'generating' || step === 'complete' ? 'purple.500' : 'gray.300'}
            animation={step === 'generating' ? `${bounce} 1s infinite` : undefined}
          />
          <Box
            w="12px"
            h="12px"
            borderRadius="full"
            bg={step === 'complete' ? 'green.500' : 'gray.300'}
            animation={step === 'complete' ? `${bounce} 1s infinite` : undefined}
          />
        </HStack>
      </VStack>
    </Box>
  );
} 
import { useState } from 'react';
import {
  Container,
  Heading,
  VStack,
  Box,
  Text,
  Badge,
  Code,
  Divider,
  HStack,
  Button,
  useToast
} from '@chakra-ui/react';
import SmartUrlInput from '../components/SmartUrlInput';

export default function Demo() {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(true);
  const toast = useToast();

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
  };

  const handleValidationChange = (valid: boolean) => {
    setIsValid(valid);
  };

  const addSampleData = () => {
    const sampleUrls = [
      {
        url: 'https://map.naver.com/p/entry/place/1234567890',
        placeName: '스타벅스 강남역점',
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        usageCount: 5
      },
      {
        url: 'https://map.naver.com/p/entry/place/2234567890',
        placeName: '맥도날드 홍대점',
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
        usageCount: 3
      },
      {
        url: 'https://map.naver.com/p/entry/place/3234567890',
        placeName: '올리브영 명동점',
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
        usageCount: 2
      }
    ];

    localStorage.setItem('reviewMaker_recentUrls', JSON.stringify(sampleUrls));
    
    toast({
      title: '샘플 데이터 추가됨',
      description: '페이지를 새로고침하여 히스토리 기능을 확인해보세요',
      status: 'success',
      duration: 3000
    });
  };

  const clearSampleData = () => {
    localStorage.removeItem('reviewMaker_recentUrls');
    
    toast({
      title: '데이터 초기화됨',
      description: '페이지를 새로고침하여 변경사항을 확인해보세요',
      status: 'info',
      duration: 3000
    });
  };

  return (
    <Container maxW="4xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading
            size="xl"
            bgGradient="linear(to-r, teal.400, blue.500)"
            bgClip="text"
          >
            SmartUrlInput 컴포넌트 데모
          </Heading>
          <Text color="gray.600" mt={2}>
            향상된 URL 입력 컴포넌트의 기능들을 확인해보세요
          </Text>
        </Box>

        <Divider />

        {/* 실제 컴포넌트 데모 */}
        <Box>
          <Heading size="md" mb={4}>
            실시간 데모
          </Heading>
          <Box p={6} borderWidth={1} borderRadius="lg" bg="gray.50">
            <SmartUrlInput
              value={url}
              onChange={handleUrlChange}
              onValidationChange={handleValidationChange}
              placeholder="네이버 지도 URL을 입력해보세요..."
            />
          </Box>

          {/* 상태 표시 */}
          <HStack mt={4} spacing={4}>
            <Badge colorScheme={isValid ? 'green' : 'red'}>
              {isValid ? '유효함' : '유효하지 않음'}
            </Badge>
            <Text fontSize="sm" color="gray.600">
              현재 URL: <Code fontSize="xs">{url || '(비어있음)'}</Code>
            </Text>
          </HStack>
        </Box>

        <Divider />

        {/* 기능 설명 */}
        <Box>
          <Heading size="md" mb={4}>
            주요 기능
          </Heading>
          <VStack spacing={4} align="stretch">
            <Box p={4} bg="blue.50" borderRadius="lg">
              <Heading size="sm" color="blue.700" mb={2}>
                🔍 실시간 URL 검증
              </Heading>
              <Text fontSize="sm" color="blue.600">
                네이버 지도 URL 형식을 실시간으로 검증하고 피드백을 제공합니다
              </Text>
            </Box>

            <Box p={4} bg="green.50" borderRadius="lg">
              <Heading size="sm" color="green.700" mb={2}>
                📋 클립보드 지원
              </Heading>
              <Text fontSize="sm" color="green.600">
                클립보드에서 바로 URL을 붙여넣을 수 있습니다
              </Text>
            </Box>

            <Box p={4} bg="purple.50" borderRadius="lg">
              <Heading size="sm" color="purple.700" mb={2}>
                📚 사용 히스토리
              </Heading>
              <Text fontSize="sm" color="purple.600">
                최근 사용한 URL을 기억하고 스마트 제안을 제공합니다
              </Text>
            </Box>

            <Box p={4} bg="orange.50" borderRadius="lg">
              <Heading size="sm" color="orange.700" mb={2}>
                🎯 지능형 검색
              </Heading>
              <Text fontSize="sm" color="orange.600">
                사용 빈도와 관련성을 기반으로 URL을 정렬하여 제안합니다
              </Text>
            </Box>
          </VStack>
        </Box>

        <Divider />

        {/* 테스트 도구 */}
        <Box>
          <Heading size="md" mb={4}>
            테스트 도구
          </Heading>
          <Text fontSize="sm" color="gray.600" mb={4}>
            샘플 데이터를 추가하여 히스토리 기능을 테스트해보세요
          </Text>
          
          <HStack spacing={4}>
            <Button colorScheme="teal" onClick={addSampleData}>
              샘플 데이터 추가
            </Button>
            <Button variant="outline" onClick={clearSampleData}>
              데이터 초기화
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              페이지 새로고침
            </Button>
          </HStack>
        </Box>

        <Divider />

        {/* 사용법 가이드 */}
        <Box>
          <Heading size="md" mb={4}>
            사용법 가이드
          </Heading>
          <VStack spacing={3} align="stretch" fontSize="sm">
            <Text>
              <Badge colorScheme="blue">1단계</Badge> 네이버 지도에서 원하는 장소를 검색합니다
            </Text>
            <Text>
              <Badge colorScheme="blue">2단계</Badge> 장소의 상세 페이지로 이동합니다
            </Text>
            <Text>
              <Badge colorScheme="blue">3단계</Badge> 주소창에서 URL을 복사합니다
            </Text>
            <Text>
              <Badge colorScheme="blue">4단계</Badge> 위의 입력 필드에 붙여넣습니다
            </Text>
            <Text>
              <Badge colorScheme="green">팁</Badge> 클립보드 버튼을 사용하면 더 편리합니다!
            </Text>
          </VStack>
        </Box>

        {/* 지원되는 URL 형식 */}
        <Box>
          <Heading size="md" mb={4}>
            지원되는 URL 형식
          </Heading>
          <VStack spacing={2} align="stretch" fontSize="sm">
            <Code p={2} borderRadius="md">
              https://map.naver.com/p/entry/place/1234567890
            </Code>
            <Code p={2} borderRadius="md">
              https://map.naver.com/p/entry/place/1234567890?c=15.00,0,0,2,dh
            </Code>
            <Code p={2} borderRadius="md">
              https://naver.me/xxxxxxxxx
            </Code>
            <Code p={2} borderRadius="md">
              https://map.naver.com/p/search/장소명/place/1234567890?pinId=1234567890
            </Code>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  HStack,
  VStack,
  Text,
  useToast,
  Icon,
  Tooltip,
  useColorModeValue,
  Flex,
  Badge,
  ScaleFade
} from '@chakra-ui/react';
import {
  FaMapMarkerAlt,
  FaClipboard,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaPaste
} from 'react-icons/fa';
import { 
  validateNaverMapUrl, 
  UrlValidationResult
} from '../utils/urlUtils';

interface SmartUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange: (isValid: boolean) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export default function SmartUrlInput({
  value,
  onChange,
  onValidationChange,
  isLoading = false,
  placeholder = "네이버 지도 URL을 붙여넣어 주세요"
}: SmartUrlInputProps) {
  const [validation, setValidation] = useState<UrlValidationResult>({ isValid: true });
  const [isClipboardSupported, setIsClipboardSupported] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  
  // 색상 테마
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // 클립보드 지원 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsClipboardSupported(!!navigator?.clipboard);
    }
  }, []);

  // URL 검증 함수
  const validateUrl = (url: string): UrlValidationResult => {
    if (!url.trim()) {
      return { isValid: true }; // 빈 값은 유효한 것으로 처리
    }

    return validateNaverMapUrl(url);
  };

  // URL 입력 처리
  const handleUrlChange = (newUrl: string) => {
    onChange(newUrl);
    
    // URL 검증
    const validationResult = validateUrl(newUrl);
    setValidation(validationResult);
    onValidationChange(validationResult.isValid);
  };

  // 클립보드에서 붙여넣기
  const handlePasteFromClipboard = async () => {
    if (!isClipboardSupported) {
      toast({
        title: '클립보드 접근 불가',
        description: '브라우저에서 클립보드 접근을 지원하지 않습니다',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUrlChange(text);
        toast({
          title: '붙여넣기 완료',
          description: 'URL이 입력되었습니다',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      toast({
        title: '붙여넣기 실패',
        description: '클립보드 내용을 읽을 수 없습니다',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // 입력 필드 클리어
  const handleClear = () => {
    handleUrlChange('');
    inputRef.current?.focus();
  };

  return (
    <Box position="relative" w="full">
      <VStack spacing={3} align="stretch">
        {/* 상태 인디케이터 */}
        {value && (
          <ScaleFade initialScale={0.9} in={!!value}>
            <Flex justify="space-between" align="center" px={2}>
              <HStack spacing={2}>
                <Icon as={FaMapMarkerAlt} color="gray.400" boxSize={3} />
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  네이버 지도 URL 검증
                </Text>
              </HStack>
              <Badge 
                colorScheme={validation.isValid ? "green" : "red"}
                variant="subtle"
                fontSize="xs"
                px={2}
                py={1}
                borderRadius="full"
              >
                {validation.isValid ? "✓ 유효" : "✗ 오류"}
              </Badge>
            </Flex>
          </ScaleFade>
        )}

        {/* 입력 필드 */}
        <InputGroup size="lg">
          <InputLeftElement>
            <Icon 
              as={FaMapMarkerAlt} 
              color={validation.isValid ? "teal.500" : "red.500"}
              boxSize={5}
            />
          </InputLeftElement>
          
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleUrlChange(e.target.value)}
            isDisabled={isLoading}
            focusBorderColor={validation.isValid ? "teal.500" : "red.500"}
            borderColor={validation.isValid ? borderColor : "red.300"}
            borderRadius="xl"
            bg={bgColor}
            h="14"
            fontSize="md"
            boxShadow="sm"
            _hover={{ 
              boxShadow: "md",
              borderColor: validation.isValid ? "teal.300" : "red.400"
            }}
            _focus={{ 
              boxShadow: "0 0 0 3px rgba(72, 187, 120, 0.1)",
              borderColor: validation.isValid ? "teal.400" : "red.400"
            }}
            _disabled={{
              opacity: 0.7,
              cursor: "not-allowed"
            }}
            transition="all 0.2s"
            pr="120px"
          />
          
          <InputRightElement width="auto" pr={3} h="14">
            <HStack spacing={2}>
              {/* 검증 상태 아이콘 */}
              {value && (
                <ScaleFade initialScale={0.8} in={!!value}>
                  <Tooltip 
                    label={validation.isValid ? "유효한 URL입니다" : validation.error}
                    placement="top"
                    hasArrow
                  >
                    <Box
                      p={1}
                      borderRadius="full"
                      bg={validation.isValid ? "green.50" : "red.50"}
                    >
                      <Icon
                        as={validation.isValid ? FaCheck : FaExclamationTriangle}
                        color={validation.isValid ? "green.500" : "red.500"}
                        boxSize={4}
                        aria-label={validation.isValid ? "유효한 URL" : "유효하지 않은 URL"}
                      />
                    </Box>
                  </Tooltip>
                </ScaleFade>
              )}
              
              {/* 클립보드 버튼 */}
              {isClipboardSupported && (
                <Tooltip label="클립보드에서 붙여넣기" placement="top" hasArrow>
                  <IconButton
                    icon={<FaPaste />}
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    onClick={handlePasteFromClipboard}
                    aria-label="클립보드에서 붙여넣기"
                    isDisabled={isLoading}
                    borderRadius="lg"
                    _hover={{
                      bg: "blue.50",
                      transform: "scale(1.05)"
                    }}
                    transition="all 0.2s"
                  />
                </Tooltip>
              )}
              
              {/* 클리어 버튼 */}
              {value && (
                <ScaleFade initialScale={0.8} in={!!value}>
                  <Tooltip label="입력 지우기" placement="top" hasArrow>
                    <IconButton
                      icon={<FaTimes />}
                      size="sm"
                      variant="ghost"
                      colorScheme="gray"
                      onClick={handleClear}
                      aria-label="입력 지우기"
                      isDisabled={isLoading}
                      borderRadius="lg"
                      _hover={{
                        bg: "gray.100",
                        transform: "scale(1.05)"
                      }}
                      transition="all 0.2s"
                    />
                  </Tooltip>
                </ScaleFade>
              )}
            </HStack>
          </InputRightElement>
        </InputGroup>

        {/* 에러 메시지 */}
        {!validation.isValid && validation.error && (
          <ScaleFade initialScale={0.9} in={!validation.isValid && !!validation.error}>
            <Flex 
              align="center" 
              bg="red.50" 
              px={3} 
              py={2} 
              borderRadius="lg"
              border="1px solid"
              borderColor="red.200"
            >
              <Icon as={FaExclamationTriangle} color="red.500" mr={2} boxSize={4} />
              <Text fontSize="sm" color="red.700" fontWeight="medium">
                {validation.error}
              </Text>
            </Flex>
          </ScaleFade>
        )}

        {/* 도움말 텍스트 */}
        {!value && (
          <ScaleFade initialScale={0.9} in={!value}>
            <Flex 
              align="center" 
              bg="blue.50" 
              px={4} 
              py={3} 
              borderRadius="lg"
              border="1px solid"
              borderColor="blue.200"
            >
              <Text fontSize="sm" color="blue.700" lineHeight="1.6" whiteSpace="pre-line">
                <Text as="span" fontWeight="bold">💡 사용법:</Text>
                {' 네이버 지도 주소창의 장소 URL을 복사해서 입력창에 붙여넣어주세요'}
              </Text>
            </Flex>
          </ScaleFade>
        )}
      </VStack>
    </Box>
  );
}

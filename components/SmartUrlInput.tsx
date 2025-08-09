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
  useColorModeValue
} from '@chakra-ui/react';
import {
  FaMapMarkerAlt,
  FaClipboard,
  FaTimes,
  FaCheck,
  FaExclamationTriangle
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
      <VStack spacing={2} align="stretch">
        <InputGroup size="lg">
          <InputLeftElement>
            <Icon 
              as={FaMapMarkerAlt} 
              color={validation.isValid ? "teal.500" : "red.500"} 
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
            boxShadow="md"
            _hover={{ boxShadow: "lg" }}
            _focus={{ boxShadow: "lg", borderColor: validation.isValid ? "teal.400" : "red.400" }}
            pr="100px" // 오른쪽 버튼들을 위한 공간
          />
          
          <InputRightElement width="auto" pr={2}>
            <HStack spacing={1}>
              {/* 검증 상태 아이콘 */}
              {value && (
                <Tooltip 
                  label={validation.isValid ? "유효한 URL" : validation.error}
                  placement="top"
                >
                  <Box>
                    <Icon
                      as={validation.isValid ? FaCheck : FaExclamationTriangle}
                      color={validation.isValid ? "green.500" : "red.500"}
                      boxSize={4}
                      aria-label={validation.isValid ? "유효한 URL" : "유효하지 않은 URL"}
                    />
                  </Box>
                </Tooltip>
              )}
              
              {/* 클립보드 버튼 */}
              {isClipboardSupported && (
                <Tooltip label="클립보드에서 붙여넣기" placement="top">
                  <IconButton
                    icon={<FaClipboard />}
                    size="sm"
                    variant="ghost"
                    onClick={handlePasteFromClipboard}
                    aria-label="클립보드에서 붙여넣기"
                    isDisabled={isLoading}
                  />
                </Tooltip>
              )}
              
              {/* 클리어 버튼 */}
              {value && (
                <Tooltip label="입력 지우기" placement="top">
                  <IconButton
                    icon={<FaTimes />}
                    size="sm"
                    variant="ghost"
                    onClick={handleClear}
                    aria-label="입력 지우기"
                    isDisabled={isLoading}
                  />
                </Tooltip>
              )}
            </HStack>
          </InputRightElement>
        </InputGroup>

        {/* 에러 메시지 */}
        {!validation.isValid && validation.error && (
          <Text fontSize="sm" color="red.500" px={2}>
            {validation.error}
          </Text>
        )}

        {/* 도움말 텍스트 */}
        {!value && (
          <Text fontSize="xs" color="gray.500" px={2}>
            💡 네이버 지도에서 장소를 검색한 후, 주소창의 URL을 복사해서 붙여넣어주세요
          </Text>
        )}
      </VStack>
    </Box>
  );
}
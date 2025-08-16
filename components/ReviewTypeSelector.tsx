import {
  VStack,
  Text,
  HStack,
  Checkbox,
  Icon,
  useColorModeValue,
  Box,
  Flex,
  Divider
} from "@chakra-ui/react";
import { FaUser, FaBlog } from "react-icons/fa";
import ToneModeSelector, { ToneMode } from "./ToneModeSelector";

export interface ReviewTypeOptions {
  visitor: boolean;
  blog: boolean;
}

interface ReviewTypeSelectorProps {
  value: ReviewTypeOptions;
  onChange: (value: ReviewTypeOptions) => void;
  toneMode: ToneMode;
  onToneModeChange: (value: ToneMode) => void;
  isDisabled?: boolean;
}

export default function ReviewTypeSelector({ 
  value, 
  onChange, 
  toneMode,
  onToneModeChange,
  isDisabled = false 
}: ReviewTypeSelectorProps) {
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const bgColor = useColorModeValue("gray.50", "gray.700");
  const selectedBg = useColorModeValue("teal.50", "teal.900");
  const selectedBorder = useColorModeValue("teal.200", "teal.600");

  const handleChange = (type: keyof ReviewTypeOptions, checked: boolean) => {
    const newValue = { ...value, [type]: checked };
    
    // 둘 다 선택 해제되면 방문자 리뷰를 기본으로 선택
    if (!newValue.visitor && !newValue.blog) {
      newValue.visitor = true;
    }
    
    onChange(newValue);
  };

  return (
    <VStack spacing={3} w="100%" align="start">
      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
        작성할 리뷰 타입을 선택해주세요
      </Text>
      
      <HStack spacing={4} w="100%" justify="center" flexWrap="wrap">
        {/* 방문자 리뷰 선택 */}
        <Box
          p={4}
          borderRadius="xl"
          border="2px solid"
          borderColor={value.visitor ? selectedBorder : borderColor}
          bg={value.visitor ? selectedBg : bgColor}
          cursor={isDisabled ? "not-allowed" : "pointer"}
          opacity={isDisabled ? 0.6 : 1}
          transition="all 0.2s"
          _hover={!isDisabled ? {
            transform: "translateY(-2px)",
            boxShadow: "lg"
          } : {}}
          onClick={() => !isDisabled && handleChange('visitor', !value.visitor)}
          minW="140px"
        >
          <VStack spacing={3}>
            <Flex align="center" justify="center">
              <Icon 
                as={FaUser} 
                boxSize={6} 
                color={value.visitor ? "teal.600" : "gray.500"} 
                mr={2}
              />
              <Checkbox
                isChecked={value.visitor}
                onChange={(e) => !isDisabled && handleChange('visitor', e.target.checked)}
                colorScheme="teal"
                isDisabled={isDisabled}
                size="lg"
              />
            </Flex>
            <VStack spacing={1} textAlign="center">
              <Text 
                fontSize="md" 
                fontWeight="bold" 
                color={value.visitor ? "teal.700" : "gray.600"}
              >
                방문자 후기
              </Text>
              <Text 
                fontSize="xs" 
                color="gray.500" 
                lineHeight="1.3"
              >
                실제 방문자들의 후기를{'\n'}분석하여 작성
              </Text>
            </VStack>
          </VStack>
        </Box>

        {/* 블로그 리뷰 선택 */}
        <Box
          p={4}
          borderRadius="xl"
          border="2px solid"
          borderColor={value.blog ? selectedBorder : borderColor}
          bg={value.blog ? selectedBg : bgColor}
          cursor={isDisabled ? "not-allowed" : "pointer"}
          opacity={isDisabled ? 0.6 : 1}
          transition="all 0.2s"
          _hover={!isDisabled ? {
            transform: "translateY(-2px)",
            boxShadow: "lg"
          } : {}}
          onClick={() => !isDisabled && handleChange('blog', !value.blog)}
          minW="140px"
        >
          <VStack spacing={3}>
            <Flex align="center" justify="center">
              <Icon 
                as={FaBlog} 
                boxSize={6} 
                color={value.blog ? "teal.600" : "gray.500"} 
                mr={2}
              />
              <Checkbox
                isChecked={value.blog}
                onChange={(e) => !isDisabled && handleChange('blog', e.target.checked)}
                colorScheme="teal"
                isDisabled={isDisabled}
                size="lg"
              />
            </Flex>
            <VStack spacing={1} textAlign="center">
              <Text 
                fontSize="md" 
                fontWeight="bold" 
                color={value.blog ? "teal.700" : "gray.600"}
              >
                블로그 후기
              </Text>
              <Text 
                fontSize="xs" 
                color="gray.500" 
                lineHeight="1.3"
              >
                블로그 포스트를{'\n'}분석하여 작성
              </Text>
            </VStack>
          </VStack>
        </Box>
      </HStack>

      {/* 톤앤매너 선택 섹션 추가 */}
      <Divider my={4} />
      
      <ToneModeSelector 
        value={toneMode}
        onChange={onToneModeChange}
        isDisabled={isDisabled}
      />
    
    </VStack>
  );
}
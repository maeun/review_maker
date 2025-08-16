import {
  VStack,
  Text,
  HStack,
  Radio,
  RadioGroup,
  useColorModeValue,
  Box,
  Flex,
  Icon
} from "@chakra-ui/react";
import { FaCrown, FaUser, FaStar } from "react-icons/fa";

export type ToneMode = 'gentle' | 'casual' | 'energetic';

export interface ToneModeOption {
  id: ToneMode;
  label: string;
  icon: any;
  description: string;
  example: string;
}

const toneModeOptions: ToneModeOption[] = [
  {
    id: 'gentle',
    label: '젠틀모드',
    icon: FaCrown,
    description: '존댓말로 정중하게',
    example: '"음식이 정말 맛있었습니다"'
  },
  {
    id: 'casual',
    label: '일상모드',
    icon: FaUser,
    description: '혼잣말처럼 자연스럽게',
    example: '"생각보다 훨씬 맛있었다"'
  },
  {
    id: 'energetic',
    label: '발랄모드',
    icon: FaStar,
    description: '이모지로 생동감 있게',
    example: '"여기 진짜 대박이에요! 😍"'
  }
];

interface ToneModeSelectorProps {
  value: ToneMode;
  onChange: (value: ToneMode) => void;
  isDisabled?: boolean;
}

export default function ToneModeSelector({ 
  value, 
  onChange, 
  isDisabled = false 
}: ToneModeSelectorProps) {
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const bgColor = useColorModeValue("gray.50", "gray.700");
  const selectedBg = useColorModeValue("purple.50", "purple.900");
  const selectedBorder = useColorModeValue("purple.200", "purple.600");

  return (
    <VStack spacing={3} w="100%" align="start">
      <Text fontSize="sm" fontWeight="semibold" color="gray.700">
        리뷰 톤앤매너를 선택해주세요
      </Text>
      
      <RadioGroup 
        value={value} 
        onChange={(val) => onChange(val as ToneMode)}
        w="100%"
        isDisabled={isDisabled}
      >
        <HStack spacing={3} w="100%" justify="center" flexWrap="wrap">
          {toneModeOptions.map((option) => (
            <Box
              key={option.id}
              p={4}
              borderRadius="xl"
              border="2px solid"
              borderColor={value === option.id ? selectedBorder : borderColor}
              bg={value === option.id ? selectedBg : bgColor}
              cursor={isDisabled ? "not-allowed" : "pointer"}
              opacity={isDisabled ? 0.6 : 1}
              transition="all 0.2s"
              _hover={!isDisabled ? {
                transform: "translateY(-2px)",
                boxShadow: "lg"
              } : {}}
              onClick={() => !isDisabled && onChange(option.id)}
              minW="140px"
              maxW="160px"
              flex="1"
            >
              <VStack spacing={3}>
                <Flex align="center" justify="center">
                  <Icon 
                    as={option.icon} 
                    boxSize={6} 
                    color={value === option.id ? "purple.600" : "gray.500"} 
                    mr={2}
                  />
                  <Radio
                    value={option.id}
                    colorScheme="purple"
                    isDisabled={isDisabled}
                    size="lg"
                  />
                </Flex>
                <VStack spacing={1} textAlign="center">
                  <Text 
                    fontSize="md" 
                    fontWeight="bold" 
                    color={value === option.id ? "purple.700" : "gray.600"}
                  >
                    {option.label}
                  </Text>
                  <Text 
                    fontSize="xs" 
                    color="gray.500" 
                    lineHeight="1.3"
                  >
                    {option.description}
                  </Text>
                  <Text 
                    fontSize="2xs" 
                    color="gray.400" 
                    fontStyle="italic"
                    lineHeight="1.2"
                    px={1}
                  >
                    {option.example}
                  </Text>
                </VStack>
              </VStack>
            </Box>
          ))}
        </HStack>
      </RadioGroup>
    </VStack>
  );
}
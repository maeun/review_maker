import { FaHome } from "react-icons/fa";


import { 
  Container, 
  Heading, 
  VStack, 
  Text, 
  Box, 
  useColorModeValue,
  HStack,
  Icon,
  Link,
  Button
} from "@chakra-ui/react";
import { FaComments, FaQuestionCircle } from "react-icons/fa";
import Head from "next/head";

export default function Contact() {
  const cardBg = useColorModeValue("white", "gray.800");
  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, teal.50, purple.50)",
    "linear(to-br, gray.900, blue.900, purple.900)"
  );
  const featureBg = useColorModeValue("gray.50", "gray.700");

  return (
    <>
      <Head>
        <title>연락처 및 문의 - Review Maker | 네이버 리뷰 생성기</title>
        <meta name="description" content="Review Maker에 대한 문의사항이나 지원이 필요하시면 언제든지 연락해주세요." />
        <meta name="robots" content="index, follow" />
      </Head>
      
      <Box minH="100vh" bgGradient={bgGradient}>
        <Container maxW="4xl" py={8}>
          <VStack spacing={8}>
            <Box bg={cardBg} p={8} borderRadius="2xl" boxShadow="2xl" w="100%">
              <VStack spacing={6} align="stretch">
                <VStack spacing={4} textAlign="center">
                  <Heading size="xl" color="teal.500">
                    연락처 및 문의
                  </Heading>
                  <Text fontSize="lg" color="gray.600">
                    Review Maker에 대한 문의사항이나 지원이 필요하시면 언제든지 연락해주세요.
                  </Text>
                </VStack>

             <VStack spacing={6} align="stretch">
                  {/* 카카오톡 1:1 문의 */}
                  <Box>
                    <Heading size="md" mb={4}>💬 카카오톡 1:1 문의</Heading>
                    <Box bg={featureBg} p={4} borderRadius="lg">
                      <HStack spacing={3} mb={2}>
                        <Icon as={FaComments} color="teal.500" />
                        <Text fontWeight="medium">운영 관련 소통</Text>
                      </HStack>
                      <Text color="gray.600" mb={2}>
                        서비스 이용 문의, 협업/협찬, 기능 개선 제안 등 운영 관련 사항은 카카오톡을 통해 소통할 수 있습니다. 
                      </Text>
                      <Link 
                        href="https://open.kakao.com/o/s0mp6kMh" 
                        color="teal.500" 
                        fontWeight="medium" 
                        isExternal
                      >
                       🔗카카오톡 채팅방 바로가기
                      </Link>
                    </Box>
                  </Box>




                  <Box>
                    <Heading size="md" mb={4}>❓ 자주 묻는 질문</Heading>
                    <VStack spacing={3} align="stretch">
                      <Box bg={featureBg} p={4} borderRadius="lg">
                        <HStack spacing={3} mb={2}>
                          <Icon as={FaQuestionCircle} color="orange.500" />
                          <Text fontWeight="medium">서비스는 무료인가요?</Text>
                        </HStack>
                        <Text color="gray.600">
                          네, Review Maker는 완전 무료 서비스입니다. 회원가입도 필요하지 않습니다.
                        </Text>
                      </Box>
                      
                      <Box bg={featureBg} p={4} borderRadius="lg">
                        <HStack spacing={3} mb={2}>
                          <Icon as={FaQuestionCircle} color="orange.500" />
                          <Text fontWeight="medium">개인정보가 저장되나요?</Text>
                        </HStack>
                        <Text color="gray.600" whiteSpace="pre-line">
                          {'아니요, 서비스 이용과정에서 개인정보의 수집과 활용은 전혀 이루어지지 않고 있습니다.\n자세한 내용은 프라이버시 정책을 참고해주세요.'}
                        </Text>
                      </Box>
                      
                      <Box bg={featureBg} p={4} borderRadius="lg">
                        <HStack spacing={3} mb={2}>
                          <Icon as={FaQuestionCircle} color="orange.500" />
                          <Text fontWeight="medium">생성된 리뷰를 상업적으로 이용할 수 있나요?</Text>
                        </HStack>
                        <Text color="gray.600">
                          네, 생성된 리뷰의 저작권은 이용자에게 있어 자유롭게 활용하실 수 있습니다. <br/>단, 사용에 따른 책임은 이용자에게 있습니다.
                        </Text>
                      </Box>
                    </VStack>
                  </Box>

                  <Box textAlign="center" pt={4}>
                    <Text color="gray.600" mb={4}>
                      문의사항에 대한 답변은 영업일 기준 1-2일 내에 드립니다.
                    </Text>
                {/* 메인으로 돌아가기 버튼 */}
                <Box textAlign="center" pt={6}>
                  <HStack spacing={4} justify="center">
                      <Button 
                        as={Link} 
                        href="/"
                        colorScheme="teal" 
                        variant="solid"
                        leftIcon={<FaHome />}
                        size="md"
                      >
                        메인 서비스로 돌아가기
                      </Button>
                      <Button
                      as={Link} 
                      href="/terms"
                      variant="outline" colorScheme="teal" size="md">
                        이용약관
                      </Button>
                      <Button
                      as={Link} 
                      href="/privacy"
                      variant="outline" colorScheme="teal" size="md">
                        프라이버시 정책
                      </Button>
                  </HStack>
                </Box>
                  </Box>
                </VStack>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>
    </>
  );
}

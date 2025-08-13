import { Container, Heading, VStack, Text, Box, useColorModeValue, Button, HStack } from "@chakra-ui/react";
import { FaHome } from "react-icons/fa";
import Head from "next/head";
import Link from "next/link";

export default function Privacy() {
  const cardBg = useColorModeValue("white", "gray.800");
  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, teal.50, purple.50)",
    "linear(to-br, gray.900, blue.900, purple.900)"
  );

  return (
    <>
      <Head>
        <title>개인정보처리방침 - Review Maker | 네이버 리뷰 생성기</title>
        <meta name="description" content="Review Maker의 개인정보처리방침(Privacy Policy)입니다. 본 서비스는 사용자의 개인정보를 소중히 다루며, 관련 법령을 준수합니다." />
        <meta name="robots" content="index, follow" />
      </Head>
      
      <Box minH="100vh" bgGradient={bgGradient}>
        <Container maxW="4xl" py={8}>
          <Box bg={cardBg} p={8} borderRadius="2xl" boxShadow="2xl">
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" color="teal.500">
                개인정보처리방침 (Privacy Policy)
              </Heading>
              
              <Text>
                Review Maker(이하 "본 서비스")는 사용자의 개인정보를 보호하고 관련 법령을 준수합니다.
                본 서비스는 원칙적으로 개인정보를 수집하지 않으며, 서비스 제공 과정에서 개인을 식별할 수 있는 정보는 처리하지 않습니다.
              </Text>

              <VStack spacing={4} align="stretch">
                <Box>
                  <Heading size="md" mb={3}>1. 개인정보 수집 및 이용</Heading>
                  <Text lineHeight="1.6">
                    본 서비스는 사용자의 개인정보를 직접 수집하지 않습니다.
                  </Text>
                  <Text lineHeight="1.6" mt={2}>
                    서비스 이용 과정에서 수집될 수 있는 일부 정보는 개인을 식별할 수 없는 형태이며, 서비스 제공 및 품질 개선, 광고·통계 분석 등의 목적으로만 활용됩니다.
                  </Text>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>2. 쿠키 및 추적 기술</Heading>
                  <Text lineHeight="1.6">
                    본 서비스는 Google AdSense, Google Analytics 등 제3자 도구를 통해 쿠키를 사용할 수 있습니다.
                  </Text>
                  <Text lineHeight="1.6" mt={2}>
                    이를 통해 수집되는 정보는 해당 사업자의 개인정보처리방침에 따라 처리됩니다.
                  </Text>
                  <Text lineHeight="1.6" mt={2}>
                    사용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다.
                  </Text>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>3. 제3자 제공</Heading>
                  <Text lineHeight="1.6">
                    본 서비스는 법령에 따른 경우를 제외하고 사용자의 개인정보를 제3자에게 제공하지 않습니다.
                  </Text>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>4. 정책 변경</Heading>
                  <Text lineHeight="1.6">
                    본 방침은 법령·정책 변경 또는 서비스 운영상 필요에 따라 개정될 수 있습니다.
                  </Text>
                  <Text lineHeight="1.6" mt={2}>
                    중요한 변경 사항이 있을 경우 시행 7일 전에 공지하며, 변경 이후 서비스를 계속 이용하는 경우 동의한 것으로 간주됩니다.
                  </Text>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>부칙</Heading>
                  <Text lineHeight="1.6">
                    본 개인정보처리방침은 2025년 8월 13일부터 시행됩니다.
                  </Text>
                </Box>

                {/* 메인으로 돌아가기 버튼 */}
                <Box textAlign="center" pt={6}>
                  <HStack spacing={4} justify="center">
                    <Link href="/" passHref>
                      <Button 
                        colorScheme="teal" 
                        variant="solid"
                        leftIcon={<FaHome />}
                        size="md"
                      >
                        메인 서비스로 돌아가기
                      </Button>
                    </Link>
                    <Link href="/terms" passHref>
                      <Button variant="outline" colorScheme="teal" size="md">
                        이용약관
                      </Button>
                    </Link>
                    <Link href="/contact" passHref>
                      <Button variant="outline" colorScheme="teal" size="md">
                        문의하기
                      </Button>
                    </Link>
                  </HStack>
                </Box>
              </VStack>
            </VStack>
          </Box>
        </Container>
      </Box>
    </>
  );
}

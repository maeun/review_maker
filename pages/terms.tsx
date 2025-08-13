import { Container, Heading, VStack, Text, Box, useColorModeValue, Button, HStack } from "@chakra-ui/react";
import { FaHome } from "react-icons/fa";
import Head from "next/head";
import Link from "next/link";

export default function Terms() {
  const cardBg = useColorModeValue("white", "gray.800");
  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, teal.50, purple.50)",
    "linear(to-br, gray.900, blue.900, purple.900)"
  );

  return (
    <>
      <Head>
        <title>이용약관 - Review Maker | 네이버 리뷰 생성기</title>
        <meta name="description" content="Review Maker 서비스 이용약관 및 운영정책입니다." />
        <meta name="robots" content="index, follow" />
      </Head>
      
      <Box minH="100vh" bgGradient={bgGradient}>
        <Container maxW="4xl" py={8}>
          <Box bg={cardBg} p={8} borderRadius="2xl" boxShadow="2xl">
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" color="teal.500">
                서비스 이용약관
              </Heading>
              
              <VStack spacing={4} align="stretch">
                <Box>
                  <Heading size="md" mb={3}>제1조 (목적)</Heading>
                  <Text lineHeight="1.6">
                    본 약관은 Review Maker(이하 "서비스")가 제공하는 지능형 리뷰 생성 서비스의 
                    이용 조건 및 절차, 이용자와 서비스 제공자의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.
                  </Text>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제2조 (정의)</Heading>
                  <VStack spacing={2} align="stretch" pl={4}>
                    <Text>1. "서비스"란 Review Maker에서 제공하는 지능형 리뷰 생성 도구를 의미합니다.</Text>
                    <Text>2. "이용자"란 본 약관에 따라 서비스를 이용하는 개인 또는 법인을 의미합니다.</Text>
                    <Text>3. "콘텐츠"란 서비스를 통해 생성되는 모든 형태의 리뷰 및 관련 자료를 의미합니다.</Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제3조 (서비스의 제공)</Heading>
                  <Text lineHeight="1.6" mb={2}>
                    서비스는 다음과 같은 기능을 제공합니다:
                  </Text>
                  <VStack spacing={2} align="stretch" pl={4}>
                    <Text>1. 네이버 지도 URL 기반 장소 정보 분석</Text>
                    <Text>2. 방문자 리뷰 및 블로그 리뷰 자동 생성</Text>
                    <Text>3. 생성된 리뷰의 복사 및 활용 기능</Text>
                    <Text>4. 기타 서비스 제공자가 정하는 부가 서비스</Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제4조 (서비스 이용)</Heading>
                  <VStack spacing={2} align="stretch">
                    <Text lineHeight="1.6">
                      서비스는 원칙적으로 무료 제공되며, 별도의 회원가입 없이 이용할 수 있습니다.
                    </Text>
                    <Text lineHeight="1.6">
                      이용자는 유효한 입력값을 제공해야 하며, 서비스 이용 시 본 약관 및 개인정보처리방침에 동의한 것으로 간주됩니다.
                    </Text>
                    <Text lineHeight="1.6">
                      서비스 제공자는 필요 시 사전 통지 없이 서비스의 전부 또는 일부를 제한·변경·중단할 수 있습니다.
                    </Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제5조 (이용자의 의무)</Heading>
                  <Text lineHeight="1.6" mb={2}>
                    이용자는 다음 행위를 하여서는 안 됩니다.
                  </Text>
                  <VStack spacing={2} align="stretch" pl={4}>
                    <Text>• 타인의 개인정보 또는 허위 정보 입력</Text>
                    <Text>• 서비스의 정상적 운영 방해</Text>
                    <Text>• 불법·부적절한 목적으로 서비스 이용</Text>
                    <Text>• 생성된 콘텐츠를 허위 정보 유포·명예훼손 등 법령 위반에 활용</Text>
                    <Text>• 과도한 요청 등으로 시스템 부하 유발</Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제6조 (콘텐츠의 권리)</Heading>
                  <VStack spacing={2} align="stretch">
                    <Text lineHeight="1.6">
                      생성된 리뷰의 저작권은 원칙적으로 이용자에게 귀속됩니다.
                    </Text>
                    <Text lineHeight="1.6">
                      이용자는 서비스 제공자에게 해당 콘텐츠를 전세계적·영구적·무상·비독점적으로 이용할 권리를 부여합니다.
                    </Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제7조 (서비스 제공자의 의무와 면책)</Heading>
                  <VStack spacing={2} align="stretch" pl={4}>
                    <Text>1. 서비스 제공자는 안정적인 서비스 제공을 위해 노력합니다.</Text>
                    <Text>2. 생성된 리뷰의 정확성이나 품질에 대해서는 보장하지 않습니다.</Text>
                    <Text>3. 자동 생성 콘텐츠의 특성상 부정확한 정보가 포함될 수 있습니다.</Text>
                    <Text>4. 서비스 이용으로 인한 직간접적 손해에 대해서는 책임지지 않습니다.</Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제8조 (서비스의 변경 및 중단)</Heading>
                  <Text lineHeight="1.6">
                    서비스 제공자는 운영상 또는 기술상의 필요에 따라 서비스를 변경하거나 
                    중단할 수 있으며, 이 경우 웹사이트를 통해 공지합니다.
                  </Text>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제9조 (광고 및 제3자 서비스)</Heading>
                  <VStack spacing={2} align="stretch">
                    <Text lineHeight="1.6">
                      서비스 내에 Google AdSense 등 제3자 광고가 표시될 수 있습니다.
                    </Text>
                    <Text lineHeight="1.6">
                      광고 클릭, 제3자 서비스 이용에 따른 모든 결과는 해당 제3자의 책임이며, 서비스 제공자는 이를 보증하지 않습니다.
                    </Text>
                    <Text lineHeight="1.6">
                      광고 관련 쿠키 등은 개인정보처리방침에 따릅니다.
                    </Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제10조 (분쟁 해결)</Heading>
                  <Text lineHeight="1.6">
                    본 약관과 관련된 분쟁은 대한민국 법률을 적용하며, 관할 법원은 서비스 제공자의 주소지를 관할하는 법원으로 합니다.
                  </Text>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>제11조 (약관의 효력 및 변경)</Heading>
                  <VStack spacing={2} align="stretch">
                    <Text lineHeight="1.6">
                      본 약관은 서비스 이용 시부터 효력이 발생합니다.
                    </Text>
                    <Text lineHeight="1.6">
                      서비스 제공자는 필요 시 약관을 변경할 수 있으며, 변경 사항은 웹사이트를 통해 공지합니다.
                    </Text>
                    <Text lineHeight="1.6">
                      중요한 변경 사항의 경우 합리적인 사전 고지 기간을 두며, 이용자가 변경에 동의하지 않을 경우 서비스 이용을 중단해야 합니다.
                    </Text>
                  </VStack>
                </Box>

                <Box>
                  <Heading size="md" mb={3}>부칙</Heading>
                  <Text lineHeight="1.6">
                    본 약관은 2025년 8월 13일부터 시행됩니다.
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
                    <Link href="/privacy" passHref>
                      <Button variant="outline" colorScheme="teal" size="md">
                        프라이버시 정책
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

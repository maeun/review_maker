import { 
  Container, 
  Heading, 
  VStack, 
  Text, 
  Box, 
  useColorModeValue, 
  Button, 
  HStack,
  Icon,
  Grid,
  GridItem,
  Flex
} from "@chakra-ui/react";
import { FaRobot, FaStar, FaMapMarkerAlt, FaLightbulb, FaHome, FaUsers, FaShieldAlt } from "react-icons/fa";
import Head from "next/head";
import Link from "next/link";

export default function About() {
  const cardBg = useColorModeValue("white", "gray.800");
  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, teal.50, purple.50)",
    "linear(to-br, gray.900, blue.900, purple.900)"
  );
  const featureBg = useColorModeValue("gray.50", "gray.700");

  return (
    <>
      <Head>
        <title>서비스 소개 - Review Maker | 네이버 리뷰 생성기</title>
        <meta name="description" content="Review Maker는 스마트 기술을 활용하여 네이버 지도 리뷰를 자동으로 생성해주는 혁신적인 도구입니다. 무료로 이용하세요." />
        <meta name="keywords" content="리뷰 생성, 네이버 지도, 방문자 리뷰, 블로그 리뷰, 자동 생성, 무료 도구" />
        <meta name="robots" content="index, follow" />
      </Head>
      
      <Box minH="100vh" bgGradient={bgGradient}>
        <Container maxW="6xl" py={8}>
          <VStack spacing={12}>
            {/* 헤더 섹션 */}
            <Box bg={cardBg} p={8} borderRadius="2xl" boxShadow="2xl" w="100%">
              <VStack spacing={6} textAlign="center">
                <HStack spacing={3}>
                  <Icon as={FaRobot} boxSize={10} color="teal.500" />
                  <Heading size="2xl" bgGradient="linear(to-r, teal.400, blue.500)" bgClip="text">
                    Review Maker
                  </Heading>
                </HStack>
                <Text fontSize="xl" color="gray.600" maxW="3xl" lineHeight="1.7">
                  고급 알고리즘을 활용하여 네이버 지도의 실제 방문자 후기와 블로그 리뷰를 분석하고, <br />
                  자연스럽고 유용한 새로운 리뷰를 자동으로 생성해주는 혁신적인 도구입니다.
                </Text>
              </VStack>
            </Box>

            {/* 주요 기능 섹션 */}
            <Box bg={cardBg} p={8} borderRadius="2xl" boxShadow="2xl" w="100%">
              <VStack spacing={8}>
                <Heading size="xl" textAlign="center" color="teal.500">
                  주요 기능
                </Heading>
                
                <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={8} w="100%">
                  <GridItem>
                    <Box bg={featureBg} p={8} borderRadius="xl" h="100%" textAlign="center">
                      <VStack spacing={6}>
                        <Icon as={FaMapMarkerAlt} boxSize={12} color="red.500" />
                        <Heading size="md">네이버 지도 연동</Heading>
                        <Text color="gray.600" lineHeight="1.6">
                          네이버 지도 URL만 입력하면,<br />자동으로 장소의 정보를 분석합니다.
                        </Text>
                      </VStack>
                    </Box>
                  </GridItem>

                  <GridItem>
                    <Box bg={featureBg} p={8} borderRadius="xl" h="100%" textAlign="center">
                      <VStack spacing={6}>
                        <Icon as={FaUsers} boxSize={12} color="blue.500" />
                        <Heading size="md">실제 후기 분석</Heading>
                        <Text color="gray.600" lineHeight="1.6">
                          방문자들의 실제 후기와 블로그 리뷰를<br />
                          분석하여 리뷰를 생성합니다.
                        </Text>
                      </VStack>
                    </Box>
                  </GridItem>

                  <GridItem>
                    <Box bg={featureBg} p={8} borderRadius="xl" h="100%" textAlign="center">
                      <VStack spacing={6}>
                        <Icon as={FaShieldAlt} boxSize={12} color="green.500" />
                        <Heading size="md">개인정보 보호</Heading>
                        <Text color="gray.600" lineHeight="1.6">
                          개인정보를 수집하지 않아<br />
                          안전하게 이용할 수 있습니다.
                        </Text>
                      </VStack>
                    </Box>
                  </GridItem>
                </Grid>
              </VStack>
            </Box>

            {/* 사용법 섹션 */}
            <Box bg={cardBg} p={8} borderRadius="2xl" boxShadow="2xl" w="100%">
              <VStack spacing={6}>
                <Heading size="xl" textAlign="center" color="teal.500">
                  간단한 사용법
                </Heading>
                
                <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={8} w="100%">
                  <GridItem textAlign="center">
                    <VStack spacing={4}>
                      <Box bg="teal.100" borderRadius="full" p={4}>
                        <Text fontSize="2xl" fontWeight="bold" color="teal.600">1</Text>
                      </Box>
                      <Heading size="md">URL 입력</Heading>
                      <Text color="gray.600" lineHeight="1.6">
                        네이버 지도에서 원하는 장소를 찾아<br />
                        URL을 복사하여 입력창에 붙여넣습니다.
                      </Text>
                    </VStack>
                  </GridItem>

                  <GridItem textAlign="center">
                    <VStack spacing={4}>
                      <Box bg="blue.100" borderRadius="full" p={4}>
                        <Text fontSize="2xl" fontWeight="bold" color="blue.600">2</Text>
                      </Box>
                      <Heading size="md">감상 작성</Heading>
                      <Text color="gray.600" lineHeight="1.6">
                        해당 장소에 대한 간단한<br />
                        개인적인 감상이나 경험을 작성합니다.
                      </Text>
                    </VStack>
                  </GridItem>

                  <GridItem textAlign="center">
                    <VStack spacing={4}>
                      <Box bg="purple.100" borderRadius="full" p={4}>
                        <Text fontSize="2xl" fontWeight="bold" color="purple.600">3</Text>
                      </Box>
                      <Heading size="md">리뷰 생성</Heading>
                      <Text color="gray.600" lineHeight="1.6">
                        시스템이 실제 후기를 분석하여<br />
                        자연스럽고 유용한 리뷰를 자동으로 생성합니다.
                      </Text>
                    </VStack>
                  </GridItem>
                </Grid>
              </VStack>
            </Box>

            {/* CTA 섹션 */}
            <Box bg={cardBg} p={8} borderRadius="2xl" boxShadow="2xl" w="100%" textAlign="center">
              <VStack spacing={6}>
                <Heading size="xl" color="teal.500">
                  지금 바로 시작해보세요!
                </Heading>
                <Text fontSize="lg" color="gray.600" maxW="2xl">
                  복잡한 회원가입 없이 바로 시작할 수 있습니다. <br />
                  자동 생성된 고품질 리뷰를 무료로 체험해보세요.
                </Text>
                <HStack spacing={4}>
                  <Link href="/" passHref>
                    <Button 
                      colorScheme="teal" 
                      size="lg"
                      leftIcon={<FaRobot />}
                    >
                      리뷰 생성하기
                    </Button>
                  </Link>
                  <Link href="/contact" passHref>
                    <Button 
                      variant="outline" 
                      colorScheme="teal"
                      size="lg"
                    >
                      문의하기
                    </Button>
                  </Link>
                </HStack>
              </VStack>
            </Box>

            {/* 네비게이션 */}
            <Box textAlign="center">
              <HStack spacing={4} justify="center" flexWrap="wrap">
                <Link href="/" passHref>
                  <Button leftIcon={<FaHome />} variant="ghost" colorScheme="teal">
                    메인으로
                  </Button>
                </Link>
                <Link href="/privacy" passHref>
                  <Button variant="ghost" colorScheme="teal">
                    프라이버시 정책
                  </Button>
                </Link>
                <Link href="/terms" passHref>
                  <Button variant="ghost" colorScheme="teal">
                    이용약관
                  </Button>
                </Link>
                <Link href="/contact" passHref>
                  <Button variant="ghost" colorScheme="teal">
                    문의하기
                  </Button>
                </Link>
              </HStack> 
            </Box>
          </VStack>
        </Container>
      </Box>
    </>
  );
}

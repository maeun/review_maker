/**
 * 날짜 관련 유틸리티 함수들
 * YYYYMMDD 형식의 일자별 데이터 구조화를 위한 헬퍼 함수들
 */

/**
 * 현재 시간을 기준으로 YYYYMMDD 형식의 날짜 문자열을 반환합니다.
 * @param date 날짜 객체 (선택적, 기본값: 현재 시간)
 * @returns YYYYMMDD 형식의 문자열
 */
export function getCurrentDateString(date?: Date): string {
  const targetDate = date || new Date();
  
  // 한국 시간대(KST) 기준으로 날짜 계산
  const kstOffset = 9 * 60; // UTC+9
  const utc = targetDate.getTime() + (targetDate.getTimezoneOffset() * 60000);
  const kstDate = new Date(utc + (kstOffset * 60000));
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}

/**
 * 타임스탬프를 YYYYMMDD 형식으로 변환합니다.
 * @param timestamp Firebase Timestamp 또는 number
 * @returns YYYYMMDD 형식의 문자열
 */
export function timestampToDateString(timestamp: any): string {
  let date: Date;
  
  if (timestamp && typeof timestamp.toDate === 'function') {
    // Firebase Timestamp
    date = timestamp.toDate();
  } else if (typeof timestamp === 'number') {
    // Unix timestamp (milliseconds)
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    // 기본값: 현재 시간
    date = new Date();
  }
  
  return getCurrentDateString(date);
}

/**
 * YYYYMMDD 형식의 문자열이 유효한지 검증합니다.
 * @param dateString 검증할 날짜 문자열
 * @returns 유효하면 true, 그렇지 않으면 false
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString || dateString.length !== 8) {
    return false;
  }
  
  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6));
  const day = parseInt(dateString.substring(6, 8));
  
  // 기본적인 유효성 검사
  if (year < 2020 || year > 2030) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Date 객체로 실제 유효성 검사
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * YYYYMMDD 형식의 날짜 문자열을 사람이 읽기 쉬운 형식으로 변환합니다.
 * @param dateString YYYYMMDD 형식의 문자열
 * @returns YYYY-MM-DD 형식의 문자열
 */
export function formatDateString(dateString: string): string {
  if (!isValidDateString(dateString)) {
    return dateString;
  }
  
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  
  return `${year}-${month}-${day}`;
}

/**
 * 두 날짜 문자열 사이의 모든 날짜를 YYYYMMDD 형식으로 반환합니다.
 * @param startDate 시작 날짜 (YYYYMMDD)
 * @param endDate 종료 날짜 (YYYYMMDD)
 * @returns 날짜 배열
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return [];
  }
  
  const dates: string[] = [];
  const start = new Date(
    parseInt(startDate.substring(0, 4)),
    parseInt(startDate.substring(4, 6)) - 1,
    parseInt(startDate.substring(6, 8))
  );
  
  const end = new Date(
    parseInt(endDate.substring(0, 4)),
    parseInt(endDate.substring(4, 6)) - 1,
    parseInt(endDate.substring(6, 8))
  );
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(getCurrentDateString(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * 특정 날짜로부터 N일 전/후의 날짜를 반환합니다.
 * @param baseDate 기준 날짜 (YYYYMMDD)
 * @param offset 일수 (음수면 이전, 양수면 이후)
 * @returns YYYYMMDD 형식의 문자열
 */
export function addDays(baseDate: string, offset: number): string {
  if (!isValidDateString(baseDate)) {
    return baseDate;
  }
  
  const date = new Date(
    parseInt(baseDate.substring(0, 4)),
    parseInt(baseDate.substring(4, 6)) - 1,
    parseInt(baseDate.substring(6, 8))
  );
  
  date.setDate(date.getDate() + offset);
  return getCurrentDateString(date);
}
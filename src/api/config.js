// API 기본 설정

// API 요청에 사용할 공통 헤더
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// API 요청 시간 제한 (ms)
export const API_TIMEOUT = 10000;

// API 요청 실패 시 재시도 횟수
export const API_RETRY_COUNT = 3;

// API 요청 시 기본 옵션
export const API_FETCH_OPTIONS = {
  headers: API_HEADERS,
  credentials: 'same-origin'  // CORS 문제 해결
};
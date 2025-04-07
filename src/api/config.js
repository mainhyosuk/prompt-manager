// API 기본 설정

// API 서버 베이스 URL
export const API_BASE_URL = 'http://localhost:5000';

// API 요청에 사용할 공통 헤더
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// API 요청 시간 제한 (ms)
export const API_TIMEOUT = 10000;

// API 요청 실패 시 재시도 횟수
export const API_RETRY_COUNT = 3;
/**
 * 프롬프트 관련 API 요청 함수
 */
import { API_HEADERS, API_FETCH_OPTIONS } from './config';

// 테스트 함수 - 서버 연결 확인용
export const testApiConnection = async () => {
  try {
    console.log('API 연결 테스트 시작...');
    
    // 1. 루트 경로 테스트
    try {
      const rootResponse = await fetch(`/`, API_FETCH_OPTIONS);
      console.log('루트 경로 응답 상태:', rootResponse.status);
      if (rootResponse.ok) {
        const rootData = await rootResponse.json();
        console.log('루트 경로 응답 데이터:', rootData);
      }
    } catch (rootError) {
      console.error('루트 경로 접근 실패:', rootError);
    }
    
    // 2. 테스트 엔드포인트 테스트
    try {
      console.log('테스트 엔드포인트 접근 시도...');
      const testResponse = await fetch(`/api/test`, API_FETCH_OPTIONS);
      console.log('테스트 엔드포인트 응답 상태:', testResponse.status);
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('테스트 엔드포인트 응답:', testData);
        return { success: true, data: testData };
      } else {
        const errorText = await testResponse.text();
        console.error('테스트 엔드포인트 오류 응답:', errorText);
        return { success: false, error: errorText };
      }
    } catch (testError) {
      console.error('테스트 엔드포인트 접근 실패:', testError);
      return { success: false, error: testError.message };
    }
  } catch (error) {
    console.error('API 연결 테스트 실패:', error);
    return { success: false, error: error.message };
  }
};

// 모든 프롬프트 가져오기
export const getPrompts = async () => {
  try {
    console.log('API 요청 옵션:', API_FETCH_OPTIONS); // 디버깅용
    console.log('API 요청 URL:', `/api/prompts`); // 디버깅용
    
    // 먼저 API 연결 테스트 실행
    const testResult = await testApiConnection();
    console.log('API 연결 테스트 결과:', testResult);
    
    // 실제 프롬프트 API 호출
    const response = await fetch(`/api/prompts`, API_FETCH_OPTIONS);
    
    // 상태 코드 로깅
    console.log('프롬프트 API 응답 상태:', response.status);
    
    if (!response.ok) {
      // 에러 응답 본문 확인
      const errorText = await response.text();
      console.error('서버 응답:', errorText);
      throw new Error('프롬프트를 불러오는데 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('프롬프트 불러오기 오류:', error);
    throw error;
  }
};

// 프롬프트 생성
export const createPrompt = async (promptData) => {
  try {
    const response = await fetch(`/api/prompts`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
      body: JSON.stringify(promptData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 생성에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('프롬프트 생성 오류:', error);
    throw error;
  }
};

// 프롬프트 수정
export const updatePrompt = async (id, promptData) => {
  try {
    const response = await fetch(`/api/prompts/${id}`, {
      ...API_FETCH_OPTIONS,
      method: 'PUT',
      body: JSON.stringify(promptData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 수정에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('프롬프트 수정 오류:', error);
    throw error;
  }
};

// 프롬프트 삭제
export const deletePrompt = async (id) => {
  try {
    const response = await fetch(`/api/prompts/${id}`, {
      ...API_FETCH_OPTIONS,
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 삭제에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('프롬프트 삭제 오류:', error);
    throw error;
  }
};

// 프롬프트 사용 기록
export const recordPromptUsage = async (id) => {
  try {
    const response = await fetch(`/api/prompts/${id}/use`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 사용 기록에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('프롬프트 사용 기록 오류:', error);
    throw error;
  }
};

// 즐겨찾기 토글
export const toggleFavorite = async (id) => {
  try {
    const response = await fetch(`/api/prompts/${id}/favorite`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '즐겨찾기 상태 변경에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('즐겨찾기 토글 오류:', error);
    throw error;
  }
};
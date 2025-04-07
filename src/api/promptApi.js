/**
 * 프롬프트 관련 API 요청 함수
 */
import { API_BASE_URL, API_HEADERS } from './config';

// 모든 프롬프트 가져오기
export const getPrompts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prompts`, {
      headers: API_HEADERS
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트를 불러오는데 실패했습니다.');
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
    const response = await fetch(`${API_BASE_URL}/api/prompts`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(promptData),
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
    const response = await fetch(`${API_BASE_URL}/api/prompts/${id}`, {
      method: 'PUT',
      headers: API_HEADERS,
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
    const response = await fetch(`${API_BASE_URL}/api/prompts/${id}`, {
      method: 'DELETE',
      headers: API_HEADERS,
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
    const response = await fetch(`${API_BASE_URL}/api/prompts/${id}/use`, {
      method: 'POST',
      headers: API_HEADERS,
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
    const response = await fetch(`${API_BASE_URL}/api/prompts/${id}/favorite`, {
      method: 'POST',
      headers: API_HEADERS,
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
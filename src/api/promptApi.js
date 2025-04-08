/**
 * 프롬프트 관련 API 요청 함수
 */
import { API_HEADERS, API_FETCH_OPTIONS } from './config';

// 모든 프롬프트 가져오기
export const getPrompts = async () => {
  try {
    const response = await fetch(`/api/prompts`, API_FETCH_OPTIONS);
    
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
    const response = await fetch(`/api/prompts`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
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

// 프롬프트 복제
export const duplicatePrompt = async (id) => {
  try {
    const response = await fetch(`/api/prompts/${id}/duplicate`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 복제에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('프롬프트 복제 오류:', error);
    throw error;
  }
};

// 변수 기본값 업데이트
export const updateVariableDefaultValue = async (promptId, variableName, defaultValue) => {
  try {
    const response = await fetch(`/api/prompts/${promptId}/variables/${encodeURIComponent(variableName)}`, {
      ...API_FETCH_OPTIONS,
      method: 'PUT',
      body: JSON.stringify({ default_value: defaultValue }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '변수 기본값 업데이트에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('변수 기본값 업데이트 오류:', error);
    throw error;
  }
};

// 프롬프트 메모 업데이트
export const updatePromptMemo = async (id, memo) => {
  try {
    const response = await fetch(`/api/prompts/${id}/memo`, {
      ...API_FETCH_OPTIONS,
      method: 'PUT',
      body: JSON.stringify({ memo }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '메모 업데이트에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('메모 업데이트 오류:', error);
    throw error;
  }
};
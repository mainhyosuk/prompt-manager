// src/api/trashApi.js

// API 요청 기본 옵션 (다른 API 파일과 동일하게 유지)
const API_FETCH_OPTIONS = {
  headers: {
    'Content-Type': 'application/json',
  }
};

const BASE_URL = '/api'; // API 기본 경로

// 삭제된(휴지통에 있는) 프롬프트 목록 가져오기
export const getTrashedPrompts = async () => {
  try {
    const response = await fetch(`${BASE_URL}/prompts/trash`, API_FETCH_OPTIONS);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '삭제된 프롬프트를 불러오는 데 실패했습니다.');
    }
    return await response.json();
  } catch (error) {
    console.error('휴지통 데이터 로드 오류:', error);
    throw error;
  }
};

// 프롬프트 복구하기
export const restorePrompt = async (promptId) => {
  try {
    const response = await fetch(`${BASE_URL}/prompts/${promptId}/restore`, {
      ...API_FETCH_OPTIONS,
      method: 'POST'
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 복구에 실패했습니다.');
    }
    return await response.json();
  } catch (error) {
    console.error('프롬프트 복구 오류:', error);
    throw error;
  }
};

// 프롬프트 영구 삭제하기
export const permanentDeletePrompt = async (promptId) => {
  try {
    const response = await fetch(`${BASE_URL}/prompts/${promptId}/permanent-delete`, {
      ...API_FETCH_OPTIONS,
      method: 'DELETE'
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 영구 삭제에 실패했습니다.');
    }
    return await response.json();
  } catch (error) {
    console.error('프롬프트 영구 삭제 오류:', error);
    throw error;
  }
}; 
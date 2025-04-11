// src/api/promptApi.js

import { updateUserAddedPrompt } from './userPromptApi'; // 사용자 추가 프롬프트 업데이트 함수 임포트

// API 요청 기본 옵션 (필요시 환경변수 등으로 관리)
const API_FETCH_OPTIONS = {
  headers: {
    'Content-Type': 'application/json',
    // 필요시 인증 토큰 등 추가
    // 'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
};

const BASE_URL = '/api'; // API 기본 경로

const USER_PROMPTS_STORAGE_KEY = 'user_added_prompts';

// 모든 프롬프트 가져오기
export const getPrompts = async () => {
  try {
    const response = await fetch(`${BASE_URL}/prompts`, API_FETCH_OPTIONS);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트를 불러오는 데 실패했습니다.');
    }
    return await response.json();
  } catch (error) {
    console.error('프롬프트 로딩 오류:', error);
    throw error;
  }
};

// 새 프롬프트 생성
export const createPrompt = async (promptData) => {
  try {
    const response = await fetch(`${BASE_URL}/prompts`, {
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

// 프롬프트 업데이트 (전체 업데이트 - PUT)
export const updatePrompt = async (id, promptData) => {
  try {
    const response = await fetch(`${BASE_URL}/prompts/${id}`, {
      ...API_FETCH_OPTIONS,
      method: 'PUT',
      body: JSON.stringify(promptData),
    });
    if (!response.ok) {
      // 서버 응답이 텍스트일 수도 있으므로 처리 추가
      const textResponse = await response.text();
      try {
        const errorData = JSON.parse(textResponse);
        throw new Error(errorData.error || `프롬프트 업데이트 실패: ${response.statusText}`);
      } catch (parseError) {
        // JSON 파싱 실패 시 텍스트 응답 사용
        throw new Error(`프롬프트 업데이트 실패: ${textResponse || response.statusText}`);
      }
    }
    // 성공 시 업데이트된 프롬프트 데이터 반환 (JSON 형식이라고 가정)
    return await response.json();
  } catch (error) {
    console.error('프롬프트 업데이트 오류:', error);
    throw error;
  }
};

// 프롬프트 삭제
export const deletePrompt = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/prompts/${id}`, {
      ...API_FETCH_OPTIONS,
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 삭제에 실패했습니다.');
    }
    // 성공 시 상태 코드 또는 메시지 반환 가능 (여기서는 void 처리)
  } catch (error) {
    console.error('프롬프트 삭제 오류:', error);
    throw error;
  }
};

// 즐겨찾기 상태 토글
export const toggleFavorite = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/prompts/${id}/favorite`, {
      ...API_FETCH_OPTIONS,
      method: 'POST', // 또는 PUT/PATCH - 백엔드 API 설계에 따라 조정
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '즐겨찾기 상태 변경에 실패했습니다.');
    }
    return await response.json(); // 업데이트된 is_favorite 상태 반환 기대
  } catch (error) {
    console.error('즐겨찾기 토글 오류:', error);
    throw error;
  }
};

// 프롬프트 사용 기록
export const recordPromptUsage = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/prompts/${id}/use`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
    });
    if (!response.ok) {
      // 오류 발생해도 계속 진행하도록 처리 (선택 사항)
      console.warn(`프롬프트 사용 기록 실패 (ID: ${id}): ${response.statusText}`);
      // throw new Error('프롬프트 사용 기록에 실패했습니다.');
    }
    // 성공 시 별도 데이터 반환 불필요
  } catch (error) {
    console.error('프롬프트 사용 기록 오류:', error);
    // throw error;
  }
};

// 프롬프트 복제
export const duplicatePrompt = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/prompts/${id}/duplicate`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 복제에 실패했습니다.');
    }
    return await response.json(); // 복제된 새 프롬프트 데이터 반환 기대
  } catch (error) {
    console.error('프롬프트 복제 오류:', error);
    throw error;
  }
};

// 변수 기본값 업데이트
export const updateVariableDefaultValue = async (promptId, variableName, defaultValue) => {
  try {
    const response = await fetch(`${BASE_URL}/prompts/${promptId}/variables/${variableName}`, {
      ...API_FETCH_OPTIONS,
      method: 'PUT', // 또는 PATCH
      body: JSON.stringify({ default_value: defaultValue }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '변수 기본값 업데이트에 실패했습니다.');
    }
    return await response.json(); // 업데이트된 프롬프트 또는 변수 정보 반환 기대
  } catch (error) {
    console.error('변수 기본값 업데이트 오류:', error);
    throw error;
  }
};

// 프롬프트 메모 업데이트 (서버 API 또는 로컬 스토리지 업데이트)
export const updatePromptMemo = async (promptId, memo) => {
  // 사용자 추가 프롬프트 ID 형식인지 확인 ('user-added-' 접두사)
  if (typeof promptId === 'string' && promptId.startsWith('user-added-')) {
    // 사용자 추가 프롬프트는 userPromptApi의 업데이트 함수 호출
    try {
      // updateUserAddedPrompt는 전체 프롬프트 객체를 반환하므로 memo만 업데이트
      // userPromptApi.js의 updateUserAddedPrompt 함수는 업데이트할 데이터만 전달받음
      const updatedPrompt = await updateUserAddedPrompt(promptId, { memo });
      return updatedPrompt; // 업데이트된 전체 프롬프트 객체 반환
    } catch (error) {
      console.error('로컬 프롬프트 메모 업데이트 오류 (userPromptApi):', error);
      throw error; // 오류를 다시 던져서 호출 측에서 처리하도록 함
    }
  } else {
    // 일반 프롬프트는 기존 API 호출
    try {
      const response = await fetch(`${BASE_URL}/prompts/${promptId}/memo`, {
        ...API_FETCH_OPTIONS,
        method: 'PUT',
        body: JSON.stringify({ memo }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '프롬프트 메모 업데이트에 실패했습니다.');
      }
      return await response.json(); // 업데이트된 프롬프트 정보 반환 기대
    } catch (error) {
      console.error('프롬프트 메모 업데이트 오류:', error);
      throw error;
    }
  }
}; 
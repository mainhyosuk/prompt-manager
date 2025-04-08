/**
 * 컬렉션 및 관련 프롬프트 API 요청 함수
 */
import { API_HEADERS, API_FETCH_OPTIONS } from './config';

// 모든 컬렉션 가져오기
export const getCollections = async () => {
  try {
    const response = await fetch(`/api/collections`, API_FETCH_OPTIONS);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '컬렉션을 불러오는데 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('컬렉션 불러오기 오류:', error);
    throw error;
  }
};

// 컬렉션 생성
export const createCollection = async (name) => {
  try {
    const response = await fetch(`/api/collections`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '컬렉션 생성에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('컬렉션 생성 오류:', error);
    throw error;
  }
};

// 컬렉션 삭제
export const deleteCollection = async (id) => {
  try {
    const response = await fetch(`/api/collections/${id}`, {
      ...API_FETCH_OPTIONS,
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '컬렉션 삭제에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('컬렉션 삭제 오류:', error);
    throw error;
  }
};

// 컬렉션의 프롬프트 목록 가져오기
export const getCollectionPrompts = async (collectionId) => {
  try {
    const response = await fetch(`/api/collections/${collectionId}/prompts`, API_FETCH_OPTIONS);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '컬렉션 프롬프트를 불러오는데 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('컬렉션 프롬프트 불러오기 오류:', error);
    throw error;
  }
};

// 프롬프트를 컬렉션에 추가
export const addPromptToCollection = async (collectionId, promptId) => {
  const response = await fetch(`/api/collections/${collectionId}/prompts/${promptId}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Failed to add prompt to collection');
  }
  
  return await response.json();
};

// 프롬프트를 컬렉션에서 제거
export const removePromptFromCollection = async (collectionId, promptId) => {
  const response = await fetch(`/api/collections/${collectionId}/prompts/${promptId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to remove prompt from collection');
  }
  
  return await response.json();
};

// 컬렉션 내 프롬프트 순서 변경
export const reorderCollectionPrompts = async (collectionId, promptIds) => {
  try {
    const response = await fetch(`/api/collections/${collectionId}/reorder`, {
      ...API_FETCH_OPTIONS,
      method: 'PUT',
      body: JSON.stringify({ prompt_ids: promptIds }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '컬렉션 순서 변경에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('컬렉션 순서 변경 오류:', error);
    throw error;
  }
};

// 유사 프롬프트 가져오기
export const getSimilarPrompts = async (promptId) => {
  try {
    const response = await fetch(`/api/prompts/${promptId}/similar`, API_FETCH_OPTIONS);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '유사 프롬프트를 불러오는데 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('유사 프롬프트 불러오기 오류:', error);
    throw error;
  }
};

// 최근 사용 프롬프트 가져오기
export const getRecentPrompts = async (excludedId = 0, limit = 10) => {
  try {
    const response = await fetch(`/api/prompts/recent?excluded_id=${excludedId}&limit=${limit}`, API_FETCH_OPTIONS);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '최근 프롬프트를 불러오는데 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('최근 프롬프트 불러오기 오류:', error);
    throw error;
  }
};

// 컬렉션 이름 변경
export const renameCollection = async (collectionId, newName) => {
  try {
    const response = await fetch(`/api/collections/${collectionId}`, {
      ...API_FETCH_OPTIONS,
      method: 'PATCH',
      body: JSON.stringify({ name: newName }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '컬렉션 이름 변경에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('컬렉션 이름 변경 오류:', error);
    throw error;
  }
};

// 컬렉션 순서 변경
export const reorderCollections = async (collectionIds) => {
  try {
    const response = await fetch(`/api/collections/reorder`, {
      ...API_FETCH_OPTIONS,
      method: 'PUT',
      body: JSON.stringify({ collection_ids: collectionIds }),
    });
    
    if (!response.ok) {
      throw new Error(`컬렉션 순서 변경 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('컬렉션 순서 변경 중 오류:', error);
    throw error;
  }
};

/**
 * 태그 관련 API 요청 함수
 */
import { API_HEADERS, API_FETCH_OPTIONS } from './config';

// 모든 태그 가져오기
export const getTags = async () => {
  try {
    const response = await fetch(`/api/tags`, API_FETCH_OPTIONS);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '태그를 불러오는데 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('태그 불러오기 오류:', error);
    throw error;
  }
};

// 태그 생성
export const createTag = async (tagData) => {
  try {
    const response = await fetch(`/api/tags`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
      body: JSON.stringify(tagData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '태그 생성에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('태그 생성 오류:', error);
    throw error;
  }
};

// 태그 수정
export const updateTag = async (id, tagData) => {
  try {
    const response = await fetch(`/api/tags/${id}`, {
      ...API_FETCH_OPTIONS,
      method: 'PUT',
      body: JSON.stringify(tagData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '태그 수정에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('태그 수정 오류:', error);
    throw error;
  }
};

// 태그 삭제
export const deleteTag = async (id) => {
  try {
    const response = await fetch(`/api/tags/${id}`, {
      ...API_FETCH_OPTIONS,
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '태그 삭제에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('태그 삭제 오류:', error);
    throw error;
  }
};
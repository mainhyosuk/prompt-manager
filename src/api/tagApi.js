/**
 * 태그 관련 API 요청 함수
 */
import { API_BASE_URL, API_HEADERS } from './config';

// 모든 태그 가져오기
export const getTags = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tags`, {
      headers: API_HEADERS
    });
    
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
    const response = await fetch(`${API_BASE_URL}/api/tags`, {
      method: 'POST',
      headers: API_HEADERS,
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
    const response = await fetch(`${API_BASE_URL}/api/tags/${id}`, {
      method: 'PUT',
      headers: API_HEADERS,
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
    const response = await fetch(`${API_BASE_URL}/api/tags/${id}`, {
      method: 'DELETE',
      headers: API_HEADERS,
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
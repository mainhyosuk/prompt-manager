/**
 * 폴더 관련 API 요청 함수
 */
import { API_BASE_URL, API_HEADERS } from './config';

// 모든 폴더 가져오기
export const getFolders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/folders`, {
      headers: API_HEADERS
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '폴더를 불러오는데 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('폴더 불러오기 오류:', error);
    throw error;
  }
};

// 폴더 생성
export const createFolder = async (folderData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/folders`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(folderData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '폴더 생성에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('폴더 생성 오류:', error);
    throw error;
  }
};

// 폴더 수정
export const updateFolder = async (id, folderData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/folders/${id}`, {
      method: 'PUT',
      headers: API_HEADERS,
      body: JSON.stringify(folderData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '폴더 수정에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('폴더 수정 오류:', error);
    throw error;
  }
};

// 폴더 삭제
export const deleteFolder = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/folders/${id}`, {
      method: 'DELETE',
      headers: API_HEADERS
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '폴더 삭제에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('폴더 삭제 오류:', error);
    throw error;
  }
};
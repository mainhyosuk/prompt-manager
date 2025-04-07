/**
 * 설정 관련 API 요청 함수
 */
import { API_HEADERS, API_FETCH_OPTIONS } from './config';

// 설정 가져오기
export const getSettings = async () => {
  try {
    const response = await fetch(`/api/settings`, API_FETCH_OPTIONS);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '설정을 불러오는데 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('설정 불러오기 오류:', error);
    throw error;
  }
};

// 설정 업데이트
export const updateSettings = async (settingsData) => {
  try {
    const response = await fetch(`/api/settings`, {
      ...API_FETCH_OPTIONS,
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '설정 업데이트에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('설정 업데이트 오류:', error);
    throw error;
  }
};

// 데이터베이스 백업
export const backupDatabase = async (path) => {
  try {
    const response = await fetch(`/api/backup`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
      body: JSON.stringify({ path }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '데이터베이스 백업에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('데이터베이스 백업 오류:', error);
    throw error;
  }
};

// 데이터베이스 복원
export const restoreDatabase = async (file) => {
  try {
    const response = await fetch(`/api/restore`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
      body: JSON.stringify({ file }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '데이터베이스 복원에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('데이터베이스 복원 오류:', error);
    throw error;
  }
};

// 프롬프트 내보내기
export const exportPrompts = async () => {
  try {
    const response = await fetch(`/api/export`, API_FETCH_OPTIONS);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 내보내기에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('프롬프트 내보내기 오류:', error);
    throw error;
  }
};

// 프롬프트 가져오기
export const importPrompts = async (data) => {
  try {
    const response = await fetch(`/api/import`, {
      ...API_FETCH_OPTIONS,
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '프롬프트 가져오기에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('프롬프트 가져오기 오류:', error);
    throw error;
  }
};
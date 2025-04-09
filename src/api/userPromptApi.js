// 사용자 추가 프롬프트 관리를 위한 모킹 API (로컬 스토리지 사용)

// 로컬 스토리지 키 정의
const USER_PROMPTS_STORAGE_KEY = 'user_added_prompts';

// 사용자 추가 프롬프트 데이터를 로컬 스토리지에서 가져오는 헬퍼 함수
const getUserPromptsFromStorage = () => {
  try {
    const data = localStorage.getItem(USER_PROMPTS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('로컬 스토리지 데이터 조회 오류:', error);
    return {};
  }
};

// 사용자 추가 프롬프트 데이터를 로컬 스토리지에 저장하는 헬퍼 함수
const saveUserPromptsToStorage = (userPrompts) => {
  try {
    localStorage.setItem(USER_PROMPTS_STORAGE_KEY, JSON.stringify(userPrompts));
  } catch (error) {
    console.error('로컬 스토리지 데이터 저장 오류:', error);
  }
};

/**
 * 프롬프트에 연결된 사용자 추가 프롬프트 목록을 가져옵니다.
 * @param {string} parentId - 부모 프롬프트 ID
 * @returns {Promise<Array>} - 사용자 추가 프롬프트 목록
 */
export const getUserAddedPrompts = async (parentId) => {
  try {
    // 로컬 스토리지에서 사용자 추가 프롬프트 데이터 조회
    const userPrompts = getUserPromptsFromStorage();
    
    // 해당 부모 ID의 사용자 추가 프롬프트 목록 반환
    const parentUserPrompts = userPrompts[parentId] || [];
    
    // 중복 방지: ID로 고유한 프롬프트만 필터링
    const uniquePrompts = [];
    const seenIds = new Set();
    
    for (const prompt of parentUserPrompts) {
      if (!seenIds.has(prompt.id)) {
        seenIds.add(prompt.id);
        uniquePrompts.push(prompt);
      }
    }
    
    // 인위적인 지연을 줘서 비동기 호출을 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return uniquePrompts;
  } catch (error) {
    console.error('사용자 추가 프롬프트 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 새 사용자 추가 프롬프트를 생성합니다.
 * @param {Object} promptData - 프롬프트 데이터
 * @returns {Promise<Object>} - 생성된 프롬프트 정보
 */
export const createUserAddedPrompt = async (promptData) => {
  try {
    if (!promptData || !promptData.parent_id) {
      throw new Error('유효하지 않은 프롬프트 데이터: parent_id가 필요합니다.');
    }
    
    // 프롬프트 ID 생성 (실제로는 서버에서 생성)
    const promptId = `user-added-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 데이터에 ID와 생성 시간 추가
    const newPromptData = {
      ...promptData,
      id: promptId,
      created_at: promptData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_user_added: true
    };
    
    // 로컬 스토리지에서 사용자 추가 프롬프트 데이터 조회
    const userPrompts = getUserPromptsFromStorage();
    
    // 부모 ID 기준으로 프롬프트 목록 업데이트
    const parentId = promptData.parent_id;
    if (!userPrompts[parentId]) {
      userPrompts[parentId] = [];
    }
    
    // 중복 확인: 동일한 title과 content를 가진 프롬프트가 있는지 확인
    let isDuplicate = false;
    const now = new Date();
    
    isDuplicate = userPrompts[parentId].some(p => {
      // title과 content가 같은지 확인
      const isSameContent = p.title === newPromptData.title;
      
      if (!isSameContent) return false;
      
      // 생성 시간이 1분 이내인지 확인 (중복 방지 시간 윈도우)
      try {
        const pCreatedDate = new Date(p.created_at);
        const timeDiffMs = now - pCreatedDate;
        const isWithinTimeWindow = timeDiffMs < 60000; // 1분 (60,000ms)
        return isWithinTimeWindow;
      } catch (e) {
        return false; // 날짜 파싱 오류 시 중복으로 간주하지 않음
      }
    });
    
    // 중복이 아닐 경우에만 추가
    if (!isDuplicate) {
      // 프롬프트 목록 맨 앞에 추가
      userPrompts[parentId].unshift(newPromptData);
      
      // 로컬 스토리지에 저장
      saveUserPromptsToStorage(userPrompts);
    } else {
      console.warn('중복된 프롬프트 생성 시도가 감지되어 무시되었습니다.');
    }
    
    // 인위적인 지연을 줘서 비동기 호출을 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return newPromptData;
  } catch (error) {
    console.error('사용자 추가 프롬프트 생성 오류:', error);
    throw error;
  }
};

/**
 * 사용자 추가 프롬프트를 업데이트합니다.
 * @param {string} promptId - 프롬프트 ID
 * @param {Object} promptData - 업데이트할 프롬프트 데이터
 * @returns {Promise<Object>} - 업데이트된 프롬프트 정보
 */
export const updateUserAddedPrompt = async (promptId, promptData) => {
  try {
    const userPrompts = getUserPromptsFromStorage();
    let updatedPrompt = null;
    
    // 모든 부모 ID 순회
    for (const parentId in userPrompts) {
      const parentPrompts = userPrompts[parentId];
      const promptIndex = parentPrompts.findIndex(p => p.id === promptId);
      
      if (promptIndex !== -1) {
        // 프롬프트 업데이트
        updatedPrompt = {
          ...parentPrompts[promptIndex],
          ...promptData,
          updated_at: new Date().toISOString()
        };
        
        parentPrompts[promptIndex] = updatedPrompt;
        saveUserPromptsToStorage(userPrompts);
        break;
      }
    }
    
    if (!updatedPrompt) {
      throw new Error(`프롬프트 ID ${promptId}를 찾을 수 없습니다.`);
    }
    
    // 인위적인 지연을 줘서 비동기 호출을 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return updatedPrompt;
  } catch (error) {
    console.error('사용자 추가 프롬프트 업데이트 오류:', error);
    throw error;
  }
};

/**
 * 사용자 추가 프롬프트를 삭제합니다.
 * @param {string} promptId - 프롬프트 ID
 * @returns {Promise<void>}
 */
export const deleteUserAddedPrompt = async (promptId) => {
  try {
    const userPrompts = getUserPromptsFromStorage();
    let found = false;
    
    // 모든 부모 ID 순회
    for (const parentId in userPrompts) {
      const parentPrompts = userPrompts[parentId];
      const promptIndex = parentPrompts.findIndex(p => p.id === promptId);
      
      if (promptIndex !== -1) {
        // 프롬프트 삭제
        parentPrompts.splice(promptIndex, 1);
        saveUserPromptsToStorage(userPrompts);
        found = true;
        break;
      }
    }
    
    if (!found) {
      throw new Error(`프롬프트 ID ${promptId}를 찾을 수 없습니다.`);
    }
    
    // 인위적인 지연을 줘서 비동기 호출을 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200));
    
  } catch (error) {
    console.error('사용자 추가 프롬프트 삭제 오류:', error);
    throw error;
  }
}; 
// 사용자 추가 프롬프트 관리를 위한 모킹 API (로컬 스토리지 사용)

// 로컬 스토리지 키 정의
const USER_PROMPTS_STORAGE_KEY = 'user_added_prompts';

// 사용자 추가 프롬프트 데이터를 로컬 스토리지에서 가져오는 헬퍼 함수
export const getUserPromptsFromStorage = () => {
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
 * 사용자 추가 프롬프트 목록을 가져옵니다. (백엔드 API 호출 방식으로 변경)
 * @param {string} parentId - 부모 프롬프트 ID (이제 사용됨)
 * @returns {Promise<Array>} - 사용자 추가 프롬프트 목록 (DB에서 조회)
 */
export const getUserAddedPrompts = async (parentId) => {
  // parentId 유효성 검사 추가
  if (!parentId) {
    console.warn('getUserAddedPrompts 호출 시 parentId가 필요합니다.');
    return []; // parentId 없으면 빈 배열 반환
  }

  // 백엔드 API 엔드포인트 URL (userId 및 parentId 쿼리 파라미터 추가)
  const userId = "default-user";
  const API_URL = `/api/prompts?userId=${encodeURIComponent(userId)}&parentId=${encodeURIComponent(parentId)}`;

  try {
    // --- 로컬 스토리지 로직 제거 ---
    // const userPrompts = getUserPromptsFromStorage();
    // const parentUserPrompts = userPrompts[parentId] || [];
    // ... (중복 제거 및 지연 로직 제거) ...

    // --- 백엔드 API 호출 로직 추가 ---
    const response = await fetch(API_URL);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response (getUserAddedPrompts):', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const promptsFromDB = await response.json();

    // 백엔드에서 is_user_added 플래그를 이미 추가했으므로 별도 처리 필요 없음
    // (get_prompts 함수에서 `prompt['is_user_added'] = bool(prompt.get('is_user_prompt'))` 처리함)

    console.log(`사용자(${userId}) 추가 프롬프트 목록 조회 성공 (DB):`, promptsFromDB);
    return promptsFromDB; // DB에서 직접 조회한 목록 반환
    // --- API 호출 로직 끝 ---

  } catch (error) {
    console.error('사용자 추가 프롬프트 목록 조회 오류 (API):', error);
    throw error;
  }
};

/**
 * 새 사용자 추가 프롬프트를 생성합니다. (백엔드 API 호출 방식으로 변경)
 * @param {Object} promptData - 프롬프트 데이터 (title, content, parent_id 등 포함)
 * @returns {Promise<Object>} - 생성된 프롬프트 정보 (백엔드로부터 받은 데이터)
 */
export const createUserAddedPrompt = async (promptData) => {
  // 백엔드 API 엔드포인트 URL
  const API_URL = '/api/prompts'; // 실제 환경에 맞게 조정 필요 (예: http://localhost:8000/api/prompts)

  try {
    // 필수 데이터 확인 (기존 로직 유지)
    if (!promptData || !promptData.title || !promptData.content) {
      throw new Error('유효하지 않은 프롬프트 데이터: 제목과 내용은 필수입니다.');
    }

    // --- 백엔드 API 호출 로직 추가 ---
    // 백엔드로 전송할 데이터 구성
    const payload = {
      ...promptData, // 프론트엔드에서 전달받은 데이터 (title, content, tags, variables 등)
      isUserPrompt: true, // 사용자 추가 프롬프트임을 명시
      userId: "default-user", // 임시 사용자 ID (추후 실제 ID로 변경 필요)
      parentId: promptData.parent_id // <<< parent_id를 parentId로 전달
    };
    // payload에서 parent_id, parent_title 제거 로직 제거
    // delete payload.parent_id;
    // delete payload.parent_title;

    // 백엔드 API 호출 (fetch 사용 예시)
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 응답 상태 확인
    if (!response.ok) {
      // 에러 응답 처리
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    // 성공 응답 처리 (생성된 프롬프트 데이터 반환)
    const createdPrompt = await response.json();

    // 백엔드에서 받은 데이터에 is_user_added 플래그 추가 (프론트엔드 호환성)
    createdPrompt.is_user_added = true;

    console.log('사용자 추가 프롬프트 생성 성공 (DB):', createdPrompt);
    return createdPrompt;
    // --- API 호출 로직 끝 ---

  } catch (error) {
    console.error('사용자 추가 프롬프트 생성 오류 (API):', error);
    throw error; // 에러를 다시 throw하여 호출한 곳에서 처리하도록 함
  }
};

/**
 * 사용자 추가 프롬프트를 업데이트합니다. (백엔드 API 호출 방식으로 변경)
 * @param {string} promptId - 프롬프트 ID (DB의 숫자 ID여야 함)
 * @param {Object} promptData - 업데이트할 프롬프트 데이터
 * @returns {Promise<Object>} - 업데이트된 프롬프트 정보
 */
export const updateUserAddedPrompt = async (promptId, promptData) => {
  // 백엔드 API 엔드포인트 URL
  const API_URL = `/api/prompts/${promptId}`;

  try {
    // --- 로컬 스토리지 로직 제거 ---
    // const userPrompts = getUserPromptsFromStorage();
    // ... (찾기 및 업데이트 로직 제거) ...

    // --- 백엔드 API 호출 로직 추가 ---
    // 백엔드로 전송할 데이터 구성 (기존 update_prompt 엔드포인트 형식에 맞춤)
    const payload = {
      // title, content는 필수
      title: promptData.title,
      content: promptData.content,
      // 나머지 필드는 promptData에 있으면 포함, 없으면 생략 (백엔드 기본값 또는 기존값 유지)
      ...(promptData.folder_id !== undefined && { folder_id: promptData.folder_id }),
      ...(promptData.is_favorite !== undefined && { is_favorite: promptData.is_favorite }),
      ...(promptData.memo !== undefined && { memo: promptData.memo }),
      ...(promptData.tags !== undefined && { tags: promptData.tags }),
      ...(promptData.variables !== undefined && { variables: promptData.variables }),
      // isUserPrompt, userId, parentId 등은 업데이트하지 않음 (필요시 별도 API 구현)
    };

    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response (updateUserAddedPrompt):', errorData);
      if (response.status === 404) {
          throw new Error(`프롬프트 ID ${promptId}를 찾을 수 없습니다 (API).`);
      } else {
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    }

    const updatedPrompt = await response.json();

    // 백엔드에서 is_user_added 플래그를 이미 추가했으므로 별도 처리 필요 없음
    updatedPrompt.is_user_added = true; // 호환성을 위해 유지할 수 있음

    console.log(`사용자 추가 프롬프트 업데이트 성공 (DB): ID ${promptId}`, updatedPrompt);
    return updatedPrompt;
    // --- API 호출 로직 끝 ---

  } catch (error) {
    console.error('사용자 추가 프롬프트 업데이트 오류 (API):', error);
    throw error;
  }
};

/**
 * 사용자 추가 프롬프트를 삭제합니다. (백엔드 API 호출 방식으로 변경)
 * @param {string} promptId - 프롬프트 ID
 * @returns {Promise<void>}
 */
export const deleteUserAddedPrompt = async (promptId) => {
  // 백엔드 API 엔드포인트 URL
  const API_URL = `/api/prompts/${promptId}`;

  try {
    // --- 로컬 스토리지 로직 제거 ---
    // const userPrompts = getUserPromptsFromStorage();
    // ... (찾기 및 삭제 로직 제거) ...

    // --- 백엔드 API 호출 로직 추가 ---
    const response = await fetch(API_URL, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response (deleteUserAddedPrompt):', errorData);
      // 백엔드에서 404를 반환할 수도 있으므로, 에러 메시지를 좀 더 구체적으로
      if (response.status === 404) {
          throw new Error(`프롬프트 ID ${promptId}를 찾을 수 없습니다 (API).`);
      } else {
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    }

    // 성공 시 (보통 200 OK 또는 204 No Content 반환)
    console.log(`사용자 추가 프롬프트 삭제 성공 (DB): ID ${promptId}`);
    // 반환값 없음 (void)
    // --- API 호출 로직 끝 ---

  } catch (error) {
    console.error('사용자 추가 프롬프트 삭제 오류 (API):', error);
    throw error;
  }
};

/**
 * 특정 부모 프롬프트에 대한 사용자 추가 프롬프트 목록의 순서를 업데이트합니다.
 * @param {string} parentId - 부모 프롬프트 ID
 * @param {Array} reorderedPrompts - 순서가 변경된 프롬프트 객체 배열
 * @returns {Promise<void>}
 */
export const reorderUserAddedPrompts = async (parentId, reorderedPrompts) => {
  if (!parentId || !Array.isArray(reorderedPrompts)) {
    console.error('Invalid arguments for reordering user prompts.');
    throw new Error('순서 변경을 위한 유효하지 않은 인자입니다.');
  }

  try {
    const userPrompts = getUserPromptsFromStorage();

    // 해당 부모 ID의 목록을 새 순서로 업데이트
    userPrompts[parentId] = reorderedPrompts;

    // 로컬 스토리지에 저장
    saveUserPromptsToStorage(userPrompts);

    // 인위적인 지연 (선택적)
    await new Promise(resolve => setTimeout(resolve, 100)); 

  } catch (error) {
    console.error('사용자 추가 프롬프트 순서 변경 오류:', error);
    throw error;
  }
}; 
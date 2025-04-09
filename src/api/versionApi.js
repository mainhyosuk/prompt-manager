// 프롬프트 버전 관리를 위한 모킹 API (로컬 스토리지 사용)

// 로컬 스토리지 키 정의
const VERSION_STORAGE_KEY = 'prompt_versions';

// 버전 데이터를 로컬 스토리지에서 가져오는 헬퍼 함수
const getVersionsFromStorage = () => {
  try {
    const data = localStorage.getItem(VERSION_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('로컬 스토리지 데이터 조회 오류:', error);
    return {};
  }
};

// 버전 데이터를 로컬 스토리지에 저장하는 헬퍼 함수
const saveVersionsToStorage = (versions) => {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions));
  } catch (error) {
    console.error('로컬 스토리지 데이터 저장 오류:', error);
  }
};

/**
 * 프롬프트의 버전 목록을 가져옵니다.
 * @param {string} parentId - 부모 프롬프트 ID
 * @returns {Promise<Array>} - 버전 목록
 */
export const getPromptVersions = async (parentId) => {
  try {
    // 로컬 스토리지에서 버전 데이터 조회
    const versions = getVersionsFromStorage();
    
    // 해당 부모 ID의 버전 목록 반환
    const parentVersions = versions[parentId] || [];
    
    // 중복 방지: ID로 고유한 버전만 필터링
    const uniqueVersions = [];
    const seenIds = new Set();
    
    for (const version of parentVersions) {
      if (!seenIds.has(version.id)) {
        seenIds.add(version.id);
        uniqueVersions.push(version);
      }
    }
    
    // 인위적인 지연을 줘서 비동기 호출을 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return uniqueVersions;
  } catch (error) {
    console.error('버전 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 새 프롬프트 버전을 생성합니다.
 * @param {Object} versionData - 버전 데이터
 * @returns {Promise<Object>} - 생성된 버전 정보
 */
export const createPromptVersion = async (versionData) => {
  try {
    if (!versionData || !versionData.parent_id) {
      throw new Error('유효하지 않은 버전 데이터: parent_id가 필요합니다.');
    }
    
    // 버전 ID 생성 (실제로는 서버에서 생성)
    const versionId = `version-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 데이터에 ID와 생성 시간 추가
    const newVersionData = {
      ...versionData,
      id: versionId,
      created_at: versionData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 로컬 스토리지에서 버전 데이터 조회
    const versions = getVersionsFromStorage();
    
    // 부모 ID 기준으로 버전 목록 업데이트
    const parentId = versionData.parent_id;
    if (!versions[parentId]) {
      versions[parentId] = [];
    }
    
    // 중복 확인: 동일한 title과 content를 가진 버전이 있는지 확인
    // 히스토리 플래그가 있는 경우 (이전 버전을 보존하는 경우)는 중복 검사를 하지 않음
    let isDuplicate = false;
    
    // 이전 버전 스냅샷(is_history=true)이 아닌 경우에만 중복 검사 수행
    if (!versionData.is_history) {
      const now = new Date();
      isDuplicate = versions[parentId].some(v => {
        // title과 content가 같은지 확인
        const isSameContent = v.title === newVersionData.title && 
                              v.content === newVersionData.content;
        
        if (!isSameContent) return false;
        
        // 생성 시간이 1분 이내인지 확인 (중복 방지 시간 윈도우)
        try {
          const vCreatedDate = new Date(v.created_at);
          const timeDiffMs = now - vCreatedDate;
          const isWithinTimeWindow = timeDiffMs < 60000; // 1분 (60,000ms)
          return isWithinTimeWindow;
        } catch (e) {
          return false; // 날짜 파싱 오류 시 중복으로 간주하지 않음
        }
      });
    }
    
    // 중복이 아닐 경우에만 추가
    if (!isDuplicate) {
      // 히스토리 버전인 경우 버전 목록 정렬 순서를 고려해서 추가
      // 이전 버전 스냅샷(is_history=true)은 시간순으로 정렬되도록 unshift 대신 push 사용
      if (versionData.is_history) {
        versions[parentId].push(newVersionData);
      } else {
        // 일반 버전(복제본 등)은 목록 맨 앞에 추가
        versions[parentId].unshift(newVersionData);
      }
      
      // 로컬 스토리지에 저장
      saveVersionsToStorage(versions);
    } else {
      console.warn('중복된 버전 생성 시도가 감지되어 무시되었습니다.');
    }
    
    // 인위적인 지연을 줘서 비동기 호출을 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return newVersionData;
  } catch (error) {
    console.error('버전 생성 오류:', error);
    throw error;
  }
};

/**
 * 프롬프트 버전을 업데이트합니다.
 * @param {string} versionId - 버전 ID
 * @param {Object} versionData - 업데이트할 버전 데이터
 * @returns {Promise<Object>} - 업데이트된 버전 정보
 */
export const updatePromptVersion = async (versionId, versionData) => {
  try {
    const versions = getVersionsFromStorage();
    let updatedVersion = null;
    
    // 모든 부모 ID 순회
    for (const parentId in versions) {
      const parentVersions = versions[parentId];
      const versionIndex = parentVersions.findIndex(v => v.id === versionId);
      
      if (versionIndex !== -1) {
        // 버전 업데이트
        updatedVersion = {
          ...parentVersions[versionIndex],
          ...versionData,
          updated_at: new Date().toISOString()
        };
        
        parentVersions[versionIndex] = updatedVersion;
        saveVersionsToStorage(versions);
        break;
      }
    }
    
    if (!updatedVersion) {
      throw new Error(`버전 ID ${versionId}를 찾을 수 없습니다.`);
    }
    
    // 인위적인 지연을 줘서 비동기 호출을 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return updatedVersion;
  } catch (error) {
    console.error('버전 업데이트 오류:', error);
    throw error;
  }
};

/**
 * 버전을 최신 버전으로 설정합니다.
 * @param {string} parentId - 부모 프롬프트 ID
 * @param {string} versionId - 버전 ID
 * @returns {Promise<Object>} - 응답 결과
 */
export const setAsLatestVersion = async (parentId, versionId) => {
  try {
    if (!parentId || !versionId) {
      throw new Error('부모 ID 또는 버전 ID가 제공되지 않았습니다.');
    }
    
    const versions = getVersionsFromStorage();
    
    // 부모 ID에 해당하는 버전 목록이 없으면 빈 배열 생성
    if (!versions[parentId]) {
      console.warn(`부모 ID ${parentId}에 해당하는 버전 목록이 없습니다. 새로 생성합니다.`);
      versions[parentId] = [];
      saveVersionsToStorage(versions);
      throw new Error(`버전 ID ${versionId}를 찾을 수 없습니다.`);
    }
    
    const parentVersions = versions[parentId];
    
    // 버전이 존재하는지 확인
    const versionIndex = parentVersions.findIndex(v => v.id === versionId);
    if (versionIndex === -1) {
      throw new Error(`버전 ID ${versionId}를 찾을 수 없습니다.`);
    }
    
    // 최신 버전으로 등록할 선택된 버전 정보 저장
    const selectedVersion = parentVersions[versionIndex];
    
    // 최신 버전으로 등록되는 버전(복제본)은 목록에서 제거 - 중복 방지
    // 현재 버전으로 등록되는 버전과 내용, 제목이 같은 버전은 제거
    // 선택된 복제본 자체도 목록에서 제거 (최신 버전으로 승격되었으므로)
    const filteredVersions = parentVersions.filter((version, idx) => {
      // 선택된 복제본(최신 버전으로 등록될 버전)은 제거
      if (version.id === versionId) {
        return false;
      }
      
      // 내용과 제목이 같은 중복 버전도 제거
      if (version.content === selectedVersion.content && 
          version.title === selectedVersion.title) {
        return false;
      }
      
      return true;
    });
    
    // 모든 버전의 is_current_version 플래그를 false로 설정
    filteredVersions.forEach(version => {
      version.is_current_version = false;
    });
    
    // 업데이트된 버전 목록을 저장
    versions[parentId] = filteredVersions;
    saveVersionsToStorage(versions);
    
    // 인위적인 지연을 줘서 비동기 호출을 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return { success: true, message: '최신 버전 설정 완료' };
  } catch (error) {
    console.error('최신 버전 설정 오류:', error);
    throw error;
  }
};

/**
 * 프롬프트 버전을 삭제합니다.
 * @param {string} versionId - 버전 ID
 * @returns {Promise<void>}
 */
export const deletePromptVersion = async (versionId) => {
  try {
    const versions = getVersionsFromStorage();
    let found = false;
    
    // 모든 부모 ID 순회
    for (const parentId in versions) {
      const parentVersions = versions[parentId];
      const versionIndex = parentVersions.findIndex(v => v.id === versionId);
      
      if (versionIndex !== -1) {
        // 버전 삭제
        parentVersions.splice(versionIndex, 1);
        saveVersionsToStorage(versions);
        found = true;
        break;
      }
    }
    
    if (!found) {
      throw new Error(`버전 ID ${versionId}를 찾을 수 없습니다.`);
    }
    
    // 인위적인 지연을 줘서 비동기 호출을 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200));
    
  } catch (error) {
    console.error('버전 삭제 오류:', error);
    throw error;
  }
}; 
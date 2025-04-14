import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getPrompts, createPrompt, updatePrompt, deletePrompt, toggleFavorite, recordPromptUsage, duplicatePrompt, updateVariableDefaultValue, updatePromptMemo, deleteMultiplePrompts, moveMultiplePrompts } from '../api/promptApi';
import { getFolders, createFolder as createFolderApi, updateFolder, deleteFolder } from '../api/folderApi';
import { getTags } from '../api/tagApi';
import { getUserPromptsFromStorage, deleteUserAddedPrompt as deleteUserAddedPromptApi } from '../api/userPromptApi';
import PromptOverlayModal from '../modals/PromptOverlayModal';
import UserPromptDetailModal from '../modals/UserPromptDetailModal';

// 초기 상태
const initialState = {
  // UI 상태
  currentScreen: 'main',
  isAddEditModalOpen: false,
  isDetailModalOpen: false,
  isOverlayModalOpen: false,
  isLoading: false,
  error: null,
  theme: 'light',
  isFolderModalOpen: false,
  
  // 데이터 상태
  prompts: [],
  folders: [],
  tags: [],
  
  // 선택 상태
  selectedPrompt: null,
  overlayPrompt: null,
  selectedFolder: '모든 프롬프트',
  editMode: false,
  initialFolderInfo: null,
  
  // 폴더 확장/축소 상태
  expandedFolders: {},
  
  // 폴더 생성 모달 관련 상태 추가
  newFolderName: '',
  parentFolderId: null,
  folderError: '',

  // 검색 및 필터 상태
  searchQuery: '',
  filterTags: [],
  sortBy: 'updated_at',
  sortDirection: 'desc',
  viewMode: 'grid',
  
  // 새로고침 트리거 상태 추가
  userPromptUpdateTimestamp: null,
  previousPrompt: null,
};

const AppContext = createContext(initialState);

export const AppProvider = ({ children }) => {
  // 상태 관리
  const [currentScreen, setCurrentScreen] = useState(initialState.currentScreen);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(initialState.isAddEditModalOpen);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(initialState.isDetailModalOpen);
  const [isOverlayModalOpen, setIsOverlayModalOpen] = useState(initialState.isOverlayModalOpen);
  const [isLoading, setIsLoading] = useState(initialState.isLoading);
  const [error, setError] = useState(initialState.error);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(initialState.isFolderModalOpen);
  
  // 테마 상태 추가
  const [theme, setTheme] = useState(initialState.theme);
  
  const [prompts, setPrompts] = useState(initialState.prompts);
  const [folders, setFolders] = useState(initialState.folders);
  const [tags, setTags] = useState(initialState.tags);
  const [userAddedPrompts, setUserAddedPrompts] = useState([]);
  
  // 누락된 상태 선언 추가
  const [favoritePrompts, setFavoritePrompts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  const [selectedPrompt, setSelectedPrompt] = useState(initialState.selectedPrompt);
  const [overlayPrompt, setOverlayPrompt] = useState(initialState.overlayPrompt);
  const [selectedFolder, setSelectedFolder] = useState(initialState.selectedFolder);
  const [editMode, setEditMode] = useState(initialState.editMode);
  const [initialFolderInfo, setInitialFolderInfo] = useState(initialState.initialFolderInfo);
  
  const [expandedFolders, setExpandedFolders] = useState(initialState.expandedFolders);

  // 폴더 생성 모달 관련 상태 추가
  const [newFolderName, setNewFolderName] = useState(initialState.newFolderName);
  const [parentFolderId, setParentFolderId] = useState(initialState.parentFolderId);
  const [folderError, setFolderError] = useState(initialState.folderError);
  
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [filterTags, setFilterTags] = useState(initialState.filterTags);
  const [sortBy, setSortBy] = useState(initialState.sortBy);
  const [sortDirection, setSortDirection] = useState(initialState.sortDirection);
  const [viewMode, setViewMode] = useState(initialState.viewMode);

  // 사용자 추가 프롬프트 모달 상태 추가
  const [isUserPromptModalOpen, setIsUserPromptModalOpen] = useState(false);
  const [userPrompt, setUserPrompt] = useState(null);

  // 새로고침 트리거 상태 추가
  const [userPromptUpdateTimestamp, setUserPromptUpdateTimestamp] = useState(initialState.userPromptUpdateTimestamp);

  // 이전 프롬프트 상태 추가
  const [previousPrompt, setPreviousPrompt] = useState(initialState.previousPrompt);

  // 테마 변경 함수
  const changeTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    // HTML 요소에 테마 클래스 적용
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // 로컬 스토리지에 테마 저장
    localStorage.setItem('theme', newTheme);
  }, []);
  
  // 테마 초기화
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      changeTheme(savedTheme);
    }
  }, [changeTheme]);

  // 데이터 로드 함수 수정 (서버 + 로컬 스토리지 통합)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. 서버 데이터 로드
      const [serverPrompts, foldersData, tagsData] = await Promise.all([
        getPrompts(),
        getFolders(),
        getTags()
      ]);

      // 2. 로컬 스토리지 데이터 로드 (userPromptApi 헬퍼 사용)
      const userAddedPromptsData = getUserPromptsFromStorage(); // { parentId: [prompts...] } 형태
      let allUserAddedPrompts = [];
      for (const parentId in userAddedPromptsData) {
        // 각 사용자 추가 프롬프트에 is_user_added 플래그 추가 및 유효성 검사
        const markedPrompts = userAddedPromptsData[parentId]
          .filter(p => p && p.id) // 유효한 프롬프트 객체만 필터링
          .map(p => ({ ...p, is_user_added: true }));
        allUserAddedPrompts = allUserAddedPrompts.concat(markedPrompts);
      }

      // 사용자 추가 프롬프트는 별도의 상태에만 저장 (중요: prompts에는 포함하지 않음)
      setUserAddedPrompts(allUserAddedPrompts);

      // 3. 서버 데이터만 prompts 상태에 설정
      const serverPromptsWithFlag = serverPrompts.map(p => ({ ...p, is_user_added: false }));
      const newPromptsState = [...serverPromptsWithFlag];
      setPrompts(newPromptsState); 
      
      // 폴더와 태그 데이터 설정
      const newFoldersState = [...foldersData];
      const newTagsState = [...tagsData];
      setFolders(newFoldersState); 
      setTags(newTagsState); 
      
    } catch (err) {
      console.error('[AppContext] 데이터 로드 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 폴더 토글 함수
  const toggleFolder = useCallback((folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  }, []);

  // 폴더가 특정 폴더의 하위 폴더인지 확인하는 함수
  const isDescendantFolder = useCallback((childFolderName, parentFolderName) => {
    // 폴더 이름으로 폴더 객체 찾기
    const findFolderByName = (name) => {
      return folders.find(f => f.name === name);
    };
    
    const childFolder = findFolderByName(childFolderName);
    const parentFolder = findFolderByName(parentFolderName);
    
    if (!childFolder || !parentFolder) return false;
    
    // 직접 자식인 경우
    if (childFolder.parent_id === parentFolder.id) {
      return true;
    }
    
    // 깊은 계층 구조 확인
    let currentId = childFolder.parent_id;
    while (currentId) {
      const parent = folders.find(f => f.id === currentId);
      if (!parent) break;
      
      if (parent.id === parentFolder.id) {
        return true;
      }
      currentId = parent.parent_id;
    }
    
    return false;
  }, [folders]);

  // 프롬프트 필터링 함수
  const getFilteredPrompts = useCallback(() => {
    let result = [...prompts];
    
    // 폴더별 필터링
    if (selectedFolder && selectedFolder !== '모든 프롬프트') {
      if (selectedFolder === '즐겨찾기') {
        result = result.filter(p => p.is_favorite);
      } else {
        // 선택된 폴더 또는 그 하위 폴더에 속한 프롬프트 필터링
        result = result.filter(p => {
          // 직접 해당 폴더에 속한 프롬프트
          if (p.folder === selectedFolder) return true;
          
          // 하위 폴더에 속한 프롬프트
          return isDescendantFolder(p.folder, selectedFolder);
        });
      }
    }
    
    // 검색어 필터링 (개선)
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        // 제목 검색
        const titleMatch = p.title.toLowerCase().includes(query);
        
        // 폴더 검색
        const folderMatch = p.folder && p.folder.toLowerCase().includes(query);
        
        // 태그 검색
        const tagMatch = p.tags.some(tag => 
          tag.name.toLowerCase().includes(query)
        );
        
        // 내용 검색 제외 (사용자 요청에 따라)
        // 기존 내용 검색: p.content.toLowerCase().includes(query)
        
        return titleMatch || folderMatch || tagMatch;
      });
    }
    
    // 태그 필터링
    if (filterTags.length > 0) {
      result = result.filter(p => {
        return filterTags.every(filterTag => 
          p.tags.some(promptTag => promptTag.name === filterTag)
        );
      });
    }
    
    // 정렬
    result.sort((a, b) => {
      let valA, valB;
      
      switch (sortBy) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'updated_at':
          valA = new Date(a.updated_at);
          valB = new Date(b.updated_at);
          break;
        case 'created_at':
          valA = new Date(a.created_at);
          valB = new Date(b.created_at);
          break;
        case 'last_used_at':
          valA = a.last_used_at ? new Date(a.last_used_at) : new Date(0);
          valB = b.last_used_at ? new Date(b.last_used_at) : new Date(0);
          break;
        case 'use_count':
          valA = a.use_count || 0;
          valB = b.use_count || 0;
          break;
        default:
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
      }
      
      // 정렬 방향에 따라 결과 부호 반전
      let result = 0;
      if (valA < valB) result = -1;
      if (valA > valB) result = 1;
      
      return sortDirection === 'asc' ? result : -result;
    });
    
    return result;
  }, [prompts, selectedFolder, searchQuery, filterTags, sortBy, sortDirection]);

  // 프롬프트 추가 핸들러
  const handleAddPrompt = useCallback((folderId = null, folderName = null) => {
    setSelectedPrompt(null);
    setEditMode(false);
    
    // 폴더 정보 설정 (특정 폴더에 추가하는 경우)
    if (folderId && folderName) {
      // 임시 상태로 초기 폴더 정보 설정 (PromptAddEditModal에서 사용)
      setInitialFolderInfo({
        id: folderId,
        name: folderName
      });
    } else {
      setInitialFolderInfo(null);
    }
    
    setIsAddEditModalOpen(true);
  }, []);

  // 프롬프트 편집 핸들러
  const handleEditPrompt = useCallback((prompt) => {
    // 중요: 변수(variables) 속성 등 모든 프롬프트 속성이 있는지 확인
    if (prompt) {
      // 현재 프롬프트 목록에서 최신 데이터 가져오기
      const latestPrompt = prompts.find(p => p.id === prompt.id);
      
      if (latestPrompt) {
        // 최신 데이터와 전달받은 데이터 병합 (최신 데이터 우선)
        setSelectedPrompt(latestPrompt);
      } else {
        // 최신 데이터가 없으면 전달받은 데이터 사용
        setSelectedPrompt(prompt);
      }
    } else {
      setSelectedPrompt(null);
    }
    
    setEditMode(true);
    setIsAddEditModalOpen(true);
    setIsDetailModalOpen(false);
  }, [prompts]);

  // 프롬프트 상세보기 핸들러
  const handleViewPrompt = useCallback((prompt) => {
    // 중요: 뒤로가기 시 previousPrompt를 null로 설정해야 무한 루프 방지
    // setPreviousPrompt(null); // handleGoBack에서 처리하므로 여기선 제거
    setSelectedPrompt(prompt);
    setIsDetailModalOpen(true);
  }, []);

  // 프롬프트 전환 함수 (이전 상태 저장)
  const switchToPrompt = useCallback((nextPrompt) => {
    if (selectedPrompt && nextPrompt && selectedPrompt.id !== nextPrompt.id) {
      setPreviousPrompt(selectedPrompt); // 현재 프롬프트를 이전 상태로 저장
      setSelectedPrompt(nextPrompt); // 새 프롬프트로 전환
      setIsDetailModalOpen(true); // 혹시 닫혔을 수 있으니 열기 상태 확인
    } else {
      // 동일 프롬프트 클릭 등 일반적인 경우
      handleViewPrompt(nextPrompt);
    }
  }, [selectedPrompt, handleViewPrompt]); // handleViewPrompt 의존성 추가

  // 뒤로 가기 핸들러
  const handleGoBack = useCallback(() => {
    if (previousPrompt) {
      setSelectedPrompt(previousPrompt); // 이전 프롬프트로 복원
      setPreviousPrompt(null); // 이전 상태 기록 초기화
      setIsDetailModalOpen(true); // 모달 열기 상태 확인
    }
  }, [previousPrompt]);

  // 상세 모달 닫기 함수 (previousPrompt 초기화 추가)
  const handleCloseModal = useCallback(async () => {
    // ... (기존 메모 저장 로직 등은 그대로 둠 - handleCloseModal 내부 코드 필요)
    // 모달 닫을 때 이전 기록도 초기화
    setPreviousPrompt(null);
    setIsDetailModalOpen(false);
  }, [/* handleCloseModal의 기존 의존성 배열 */ setIsDetailModalOpen]);

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = useCallback(async (promptId) => {
    try {
      const response = await toggleFavorite(promptId);
      
      setPrompts(prev => prev.map(p => 
        p.id === promptId 
          ? { ...p, is_favorite: response.is_favorite } 
          : p
      ));
      
      // 현재 선택된 프롬프트가 있고, 그 프롬프트의 id가 변경된 프롬프트와 같으면 선택된 프롬프트도 업데이트
      if (selectedPrompt && selectedPrompt.id === promptId) {
        setSelectedPrompt(prev => ({
          ...prev,
          is_favorite: response.is_favorite
        }));
      }
    } catch (err) {
      console.error('즐겨찾기 토글 오류:', err);
      setError('즐겨찾기 상태를 변경하는 중 오류가 발생했습니다.');
    }
  }, [selectedPrompt]);

  // 프롬프트 사용 기록 핸들러
  const handleRecordUsage = useCallback(async (promptId) => {
    // 사용자 추가 프롬프트는 로컬 스토리지를 사용하므로 서버 API 호출을 건너뛰도록 수정합니다.
    if (typeof promptId === 'string' && promptId.startsWith('user-added-')) {
      console.log('사용자 추가 프롬프트는 사용 기록 API를 호출하지 않습니다.');
      return; // API 호출 없이 함수 종료
    }
    
    try {
      await recordPromptUsage(promptId);
      
      // 프롬프트 목록을 다시 불러와서 최신 상태로 업데이트
      const updatedPrompts = await getPrompts();
      setPrompts(updatedPrompts);
    } catch (err) {
      console.error('프롬프트 사용 기록 오류:', err);
      // 여기서는 사용자에게 오류를 표시하지 않고 조용히 처리
    }
  }, []);

  // 프롬프트 저장 핸들러
  const handleSavePrompt = useCallback(async (promptData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let savedPrompt;
      
      if (editMode && selectedPrompt) {
        savedPrompt = await updatePrompt(selectedPrompt.id, promptData);
      } else {
        savedPrompt = await createPrompt(promptData);
      }
      
      setIsAddEditModalOpen(false);
      await loadData(); // 데이터 전체 리로드
      return savedPrompt;
    } catch (err) {
      console.error('[AppContext] 프롬프트 저장 오류:', err);
      setError('프롬프트를 저장하는 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [editMode, selectedPrompt, loadData]);

  // 오버레이 모달 닫기
  const closeOverlayModal = useCallback(() => {
    // 현재 로직에서는 모달을 닫을 때
    // AddEditModal과 DetailModal이 같이 닫히는 문제가 없도록 처리

    // 우선 모달 상태부터 변경
    setIsOverlayModalOpen(false);

    // 모달이 닫힌 후 데이터 초기화 (애니메이션 완료 후)
    setTimeout(() => {
      setOverlayPrompt(null);
    }, 300);
  }, []);

  // 사용자 추가 프롬프트 모달 닫기
  const closeUserPromptModal = useCallback(() => {
    // 우선 모달 상태부터 변경
    setIsUserPromptModalOpen(false);

    // 모달이 닫힌 후 데이터 초기화 (애니메이션 완료 후)
    setTimeout(() => {
      setUserPrompt(null);
    }, 300);
  }, []);

  // 프롬프트 삭제 핸들러 (단일)
  const handleDeletePrompt = useCallback(async (promptId) => {
    // ID 타입 확인
    const isUserAdded = typeof promptId === 'string' && promptId.startsWith('user-added-');
    const confirmMessage = isUserAdded
      ? '정말로 이 사용자 추가 프롬프트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
      : '정말로 이 프롬프트를 삭제하시겠습니까?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isUserAdded) {
        // 사용자 추가 프롬프트 삭제 (userPromptApi 사용)
        await deleteUserAddedPromptApi(promptId);
      } else {
        // 일반 프롬프트 삭제 (기존 API 사용)
        await deletePrompt(promptId);
      }

      // 로컬 상태 업데이트 (삭제된 항목 제거)
      setPrompts(prev => prev.filter(p => p.id !== promptId));

      // 현재 선택/편집 중인 프롬프트가 삭제된 프롬프트와 같다면 초기화
      if (selectedPrompt && selectedPrompt.id === promptId) {
        setIsDetailModalOpen(false);
        setSelectedPrompt(null);
      }
      if (editMode && selectedPrompt && selectedPrompt.id === promptId) {
        setIsAddEditModalOpen(false);
        setEditMode(false);
        setSelectedPrompt(null);
      }
      // 오버레이 모달 관련 초기화 추가
      if (overlayPrompt && overlayPrompt.id === promptId) {
        closeOverlayModal(); // 이제 이 함수는 이전에 정의됨
      }
      if (userPrompt && userPrompt.id === promptId) {
        closeUserPromptModal(); // 이제 이 함수는 이전에 정의됨
      }

      // 필요시 데이터 전체 리로드 대신 로컬 상태만 업데이트 (성능 개선)
      // await loadData();

    } catch (err) {
      console.error(`[AppContext] 프롬프트 삭제 오류 (ID: ${promptId}):`, err);
      setError('프롬프트를 삭제하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrompt, editMode, overlayPrompt, userPrompt, closeOverlayModal, closeUserPromptModal]); // 의존성 배열 업데이트

  // 여러 프롬프트 삭제 핸들러 (벌크)
  const handleDeleteMultiplePrompts = useCallback(async (promptIds) => {
    // ID 배열 유효성 검사
    if (!promptIds || promptIds.length === 0) return;

    // 사용자 확인 (단일 삭제와 메시지 동일하게 사용 가능)
    if (!window.confirm(`정말로 선택된 ${promptIds.length}개의 프롬프트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // API 호출 (일반 프롬프트와 사용자 추가 프롬프트 분리 필요 없음 - API에서 처리 가정)
      // 만약 API가 분리되어 있다면, promptIds를 필터링하여 각각 호출해야 함
      await deleteMultiplePrompts(promptIds);

      // 로컬 상태 업데이트: prompts 배열에서 삭제된 ID들 제거
      setPrompts(prev => prev.filter(p => !promptIds.includes(p.id)));
      // 사용자 추가 프롬프트 상태도 업데이트
      setUserAddedPrompts(prev => prev.filter(p => !promptIds.includes(p.id)));

      // 현재 선택/편집/오버레이/사용자 모달에 있는 프롬프트가 삭제 목록에 포함되면 초기화
      if (selectedPrompt && promptIds.includes(selectedPrompt.id)) {
        setIsDetailModalOpen(false);
        setSelectedPrompt(null);
      }
      if (editMode && selectedPrompt && promptIds.includes(selectedPrompt.id)) {
        setIsAddEditModalOpen(false);
        setEditMode(false);
        setSelectedPrompt(null);
      }
      if (overlayPrompt && promptIds.includes(overlayPrompt.id)) {
        closeOverlayModal();
      }
      if (userPrompt && promptIds.includes(userPrompt.id)) {
        closeUserPromptModal();
      }

      // 삭제 성공 후 알림 (선택 사항)
      // alert(`${promptIds.length}개의 프롬프트가 삭제되었습니다.`); 
      // 또는 토스트 메시지 사용

    } catch (err) {
      console.error(`[AppContext] 프롬프트 벌크 삭제 오류:`, err);
      setError('프롬프트를 삭제하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrompt, editMode, overlayPrompt, userPrompt, closeOverlayModal, closeUserPromptModal]); // 의존성 배열 확인

  // 여러 프롬프트 폴더 이동 핸들러 (벌크)
  const handleMoveMultiplePrompts = useCallback(async (promptIds, targetFolderId) => {
    // ID 배열 유효성 검사
    if (!promptIds || promptIds.length === 0) return;

    // targetFolderId가 null일 수도 있으므로 유효성 검사는 API 함수에서 처리

    setIsLoading(true);
    setError(null);

    try {
      // API 호출
      const result = await moveMultiplePrompts(promptIds, targetFolderId);

      // 로컬 상태 업데이트 대신 전체 데이터 리로드 (사이드바 등 동기화 목적)
      await loadData(); // loadData 호출 추가

      // 이동 성공 후 알림 (선택 사항)
      // alert(result.message || `${result.moved_count}개의 프롬프트가 이동되었습니다.`);

    } catch (err) {
      console.error(`[AppContext] 프롬프트 벌크 이동 오류:`, err);
      setError(err.message || '프롬프트를 이동하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
    // 의존성 배열에 loadData 추가
  }, [folders, loadData, setIsLoading, setError]); // loadData 추가

  // 프롬프트 복제 핸들러
  const handleDuplicatePrompt = useCallback(async (promptId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const duplicatedPrompt = await duplicatePrompt(promptId);
      
      // 복제된 프롬프트를 목록에 추가
      setPrompts(prev => [...prev, duplicatedPrompt]);
      
      // 복제 후 성공 메시지 표시
      alert('프롬프트가 성공적으로 복제되었습니다.');
      return duplicatedPrompt;
    } catch (err) {
      console.error('프롬프트 복제 오류:', err);
      setError('프롬프트를 복제하는 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 변수 기본값 업데이트 핸들러
  const handleUpdateVariableDefaultValue = useCallback(async (promptId, variableName, defaultValue) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // API 호출하여 변수 기본값 업데이트
      const updatedPrompt = await updateVariableDefaultValue(promptId, variableName, defaultValue);
      
      // 프롬프트 목록 업데이트
      setPrompts(prev => prev.map(p => 
        p.id === promptId 
          ? { 
              ...p, 
              variables: p.variables.map(v => 
                v.name === variableName 
                  ? { ...v, default_value: defaultValue }
                  : v
              )
            } 
          : p
      ));
      
      // 현재 선택된 프롬프트가 있고, 그 프롬프트의 id가 변경된 프롬프트와 같으면 선택된 프롬프트도 업데이트
      if (selectedPrompt && selectedPrompt.id === promptId) {
        setSelectedPrompt(prev => ({
          ...prev,
          variables: prev.variables.map(v => 
            v.name === variableName 
              ? { ...v, default_value: defaultValue }
              : v
          )
        }));
      }
      
      return updatedPrompt;
    } catch (err) {
      console.error('변수 기본값 업데이트 오류:', err);
      setError('변수 기본값을 업데이트하는 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrompt]);

  // 설정 페이지로 이동
  const goToSettings = useCallback(() => {
    setCurrentScreen('settings');
  }, []);

  // 메인 대시보드로 돌아가기
  const goToDashboard = useCallback(() => {
    setCurrentScreen('main');
  }, []);

  // 프롬프트 아이템 업데이트 함수 (내부 상태 업데이트용)
  const updatePromptItem = useCallback((promptId, updatedData) => {
    const updateItem = (items) => items.map(item => {
      if (item.id === promptId) {
        const newItem = { ...item, ...updatedData };
        if (typeof item.is_user_added !== 'undefined') {
          newItem.is_user_added = item.is_user_added;
        }
        return newItem;
      }
      return item;
    });

    setPrompts(prev => updateItem(prev));
    setUserAddedPrompts(prev => updateItem(prev)); // userAddedPrompts 상태 업데이트 추가
    setFavoritePrompts(prev => updateItem(prev)); // 즐겨찾기 목록도 업데이트 (필요시 is_user_added 확인 로직 추가)
    setSearchResults(prev => updateItem(prev)); // 검색 결과도 업데이트

    // 현재 선택된 프롬프트도 업데이트
    setSelectedPrompt(prev => (prev && prev.id === promptId) ? { ...prev, ...updatedData, is_user_added: prev.is_user_added } : prev);
    // 이전 프롬프트도 업데이트 (뒤로가기 시 반영되도록)
    setPreviousPrompt(prev => (prev && prev.id === promptId) ? { ...prev, ...updatedData, is_user_added: prev.is_user_added } : prev);

    // --- 추가: 현재 열려있는 사용자 프롬프트 모달 상태도 업데이트 ---
    setUserPrompt(prev => {
      if (prev && prev.id === promptId) {
        const newItem = { ...prev, ...updatedData };
        // is_user_added 플래그가 항상 true가 되도록 보장 (사용자 프롬프트 모달이므로)
        newItem.is_user_added = true;
        return newItem;
      }
      return prev; // ID가 다르면 기존 상태 유지
    });
    // --- 추가 끝 ---

    // --- 추가: 목록 새로고침 트리거 ---
    setUserPromptUpdateTimestamp(Date.now());
    // --- 추가 끝 ---

  }, [setSelectedPrompt, setPreviousPrompt, setUserPrompt, setUserPromptUpdateTimestamp]); // setUserPromptUpdateTimestamp 의존성 추가

  // 프롬프트 제목 업데이트 핸들러 (updatePrompt API 사용)
  const handleUpdatePromptTitle = useCallback(async (promptId, newTitle) => {
    if (!newTitle || newTitle.trim() === '') {
      console.error('Prompt title cannot be empty.');
      return; // 빈 제목은 저장하지 않음
    }

    // 현재 프롬프트 데이터 찾기 (상태에서)
    // 중요: prompts 배열뿐만 아니라 다른 상태 배열에서도 찾아야 할 수 있음
    // 여기서는 간단하게 prompts에서 찾는 것으로 가정
    const currentPrompt = prompts.find(p => p.id === promptId);
    
    if (!currentPrompt) {
      console.error('Prompt not found locally for title update:', promptId);
      return;
    }

    // 업데이트할 데이터 준비 (전체 프롬프트 데이터 + 변경된 제목)
    const updatedPromptData = { ...currentPrompt, title: newTitle };

    try {
      // 기존 updatePrompt API 함수 호출
      await updatePrompt(promptId, updatedPromptData);
      // 로컬 상태 업데이트 (내부 함수 호출)
      updatePromptItem(promptId, { title: newTitle });
    } catch (error) {
      console.error('Failed to update prompt title via updatePrompt:', error);
      // 필요시 사용자에게 에러 알림 표시
    }
  }, [prompts, updatePromptItem]); // prompts와 updatePromptItem 의존성 추가

  // 태그 색상 매핑
  const getTagColorClasses = useCallback((color) => {
    const colorMap = {
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      sky: 'bg-sky-50 text-sky-700 border-sky-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      pink: 'bg-pink-50 text-pink-700 border-pink-200',
      red: 'bg-red-50 text-red-700 border-red-200'
    };
    
    return colorMap[color] || 'bg-gray-100 text-gray-700 border-gray-200';
  }, []);

  // 오버레이 모달 열기 함수 수정 (통합 상태 사용)
  const openOverlayModal = useCallback((promptToOpen) => {
    if (!promptToOpen || !promptToOpen.id) {
        console.warn("[AppContext] Invalid prompt object passed to openOverlayModal:", promptToOpen);
        return;
    }

    // 프롬프트 ID 타입 확인 (사용자 추가 프롬프트인지 확인)
    const isUserAddedPromptId = typeof promptToOpen.id === 'string' && promptToOpen.id.startsWith('user-added-');
    
    let latestPrompt = null;
    
    // 사용자 추가 프롬프트인 경우 userAddedPrompts에서 찾기
    if (isUserAddedPromptId) {
      latestPrompt = userAddedPrompts.find(p => p.id === promptToOpen.id);
      
      // userAddedPrompts에서 찾지 못한 경우, 전달된 객체 자체가 최신 정보일 수 있으므로 사용
      if (!latestPrompt) {
        latestPrompt = promptToOpen;
      }
    } else {
      // 일반 프롬프트는 prompts에서 찾기
      latestPrompt = prompts.find(p => p.id === promptToOpen.id);
      
      // prompts에서 찾지 못한 경우, 전달된 객체 사용
      if (!latestPrompt) {
        latestPrompt = promptToOpen;
      }
    }

    // 사용자 추가 프롬프트인지 최종 확인 (ID 또는 is_user_added 플래그 기준)
    if (isUserAddedPromptId || latestPrompt.is_user_added) {
      // 사용자 추가 프롬프트 모달 상태 설정
      setUserPrompt(latestPrompt);
      setTimeout(() => setIsUserPromptModalOpen(true), 10);
    } else {
      // 일반 오버레이 모달 상태 설정
      setOverlayPrompt(latestPrompt);
      setTimeout(() => setIsOverlayModalOpen(true), 10);
    }
  }, [prompts, userAddedPrompts]);

  // 폴더 생성 모달 상태 초기화 함수
  const resetFolderModalState = useCallback(() => {
    setNewFolderName('');
    setParentFolderId(null);
    setFolderError('');
  }, []);

  // 폴더 생성 모달 열기 함수
  const openFolderModal = useCallback((parentId = null) => {
    resetFolderModalState();
    setParentFolderId(parentId);
    setIsFolderModalOpen(true);
  }, [resetFolderModalState]);

  // 폴더 생성 모달 닫기 함수
  const closeFolderModal = useCallback(() => {
    setIsFolderModalOpen(false);
    resetFolderModalState();
  }, [resetFolderModalState]);

  // 폴더 생성 핸들러 (API 호출 포함) - loadData 호출 방식으로 복구
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      setFolderError('폴더 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setFolderError('');

    try {
      await createFolderApi({ 
        name: newFolderName, 
        parent_id: parentFolderId 
      }); 
      
      // 폴더 생성 성공 후 전체 데이터 리로드 (복구)
      await loadData(); 
      closeFolderModal(); 
    } catch (err) {
      console.error('폴더 생성 오류:', err);
      setFolderError(err.message || '폴더 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [newFolderName, parentFolderId, closeFolderModal, loadData, setFolderError, setIsLoading]); 

  // 폴더 삭제 핸들러 추가
  const handleDeleteFolder = useCallback(async (folderId) => {
    // 기본 폴더 삭제 방지 (필요시 백엔드에서도 확인)
    if (folderId <= 0) { 
      alert('기본 폴더는 삭제할 수 없습니다.');
      return;
    }
    
    // 하위 항목 확인 및 사용자 확인 (백엔드 deleteFolder API에서 처리하므로 생략 가능, 또는 여기서 추가 확인)
    if (!window.confirm('정말로 이 폴더를 삭제하시겠습니까? 하위 폴더 및 프롬프트가 없는 경우에만 삭제됩니다.')) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      await deleteFolder(folderId);
      await loadData(); // 삭제 후 데이터 리로드
      // alert('폴더가 삭제되었습니다.'); // 성공 알림 (선택 사항)
      // 현재 선택된 폴더가 삭제된 폴더면 '모든 프롬프트'로 변경
      const deletedFolder = folders.find(f => f.id === folderId);
      if (deletedFolder && selectedFolder === deletedFolder.name) {
          setSelectedFolder('모든 프롬프트');
      }
    } catch (err) {
      console.error('폴더 삭제 오류:', err);
      setError(err.message || '폴더 삭제 중 오류가 발생했습니다.');
      alert(err.message || '폴더 삭제 중 오류가 발생했습니다.'); // 사용자에게 오류 알림
    } finally {
      setIsLoading(false);
    }
  }, [loadData, folders, selectedFolder, setSelectedFolder, setIsLoading, setError]);

  // 제공할 컨텍스트 값
  const value = useMemo(() => ({ 
    // 상태
    currentScreen,
    isAddEditModalOpen,
    isDetailModalOpen,
    isLoading,
    error,
    theme,
    prompts,
    folders,
    tags,
    selectedPrompt,
    selectedFolder,
    editMode,
    initialFolderInfo,
    expandedFolders,
    searchQuery,
    filterTags,
    sortBy,
    sortDirection,
    viewMode,
    isOverlayModalOpen,
    overlayPrompt,
    isUserPromptModalOpen,
    userPrompt,
    userPromptUpdateTimestamp,
    previousPrompt,
    userAddedPrompts,
    isFolderModalOpen,
    newFolderName,
    parentFolderId,
    folderError,

    // 데이터 접근 함수
    getFilteredPrompts,
    getTagColorClasses,
    
    // 액션 함수들
    setIsAddEditModalOpen,
    setIsDetailModalOpen,
    setIsLoading,
    setError,
    setCurrentScreen,
    setSearchQuery,
    setFilterTags,
    setSortBy,
    setSortDirection,
    setViewMode,
    setSelectedFolder,
    setInitialFolderInfo,
    setExpandedFolders,
    toggleFolder,
    handleAddPrompt,
    handleEditPrompt,
    handleViewPrompt,
    handleToggleFavorite,
    handleRecordUsage,
    handleSavePrompt,
    handleDeletePrompt,
    handleDeleteMultiplePrompts,
    handleDuplicatePrompt,
    handleUpdateVariableDefaultValue,
    goToSettings,
    goToDashboard,
    loadData,
    changeTheme,
    updatePromptItem,
    openOverlayModal,
    closeOverlayModal,
    closeUserPromptModal,
    setIsOverlayModalOpen,
    setOverlayPrompt,
    setIsUserPromptModalOpen,
    setUserPrompt,
    setUserPromptUpdateTimestamp,
    switchToPrompt,
    handleGoBack,
    handleCloseModal,
    handleUpdatePromptTitle,
    openFolderModal,
    closeFolderModal,
    handleCreateFolder,
    setNewFolderName,
    setParentFolderId,
    setFolderError,
    handleMoveMultiplePrompts,
    handleDeleteFolder
  }), [
    // 원래의 전체 의존성 배열 복구
    currentScreen, isAddEditModalOpen, isDetailModalOpen, isLoading, error, theme, prompts, folders, tags, 
    selectedPrompt, selectedFolder, editMode, initialFolderInfo, expandedFolders, searchQuery, filterTags, 
    sortBy, sortDirection, viewMode, isOverlayModalOpen, overlayPrompt, isUserPromptModalOpen, userPrompt, 
    userPromptUpdateTimestamp, previousPrompt, userAddedPrompts, isFolderModalOpen, newFolderName, 
    parentFolderId, folderError,
    // useCallback 함수들
    getFilteredPrompts, getTagColorClasses, toggleFolder, handleAddPrompt, handleEditPrompt, handleViewPrompt,
    handleToggleFavorite, handleRecordUsage, handleSavePrompt, handleDeletePrompt, handleDeleteMultiplePrompts,
    handleDuplicatePrompt, handleUpdateVariableDefaultValue, goToSettings, goToDashboard, loadData,
    changeTheme, updatePromptItem, openOverlayModal, closeOverlayModal, closeUserPromptModal, 
    switchToPrompt, handleGoBack, handleCloseModal, handleUpdatePromptTitle, openFolderModal, 
    closeFolderModal, handleCreateFolder, handleMoveMultiplePrompts, handleDeleteFolder,
    // setState 함수들
    setIsAddEditModalOpen, setIsDetailModalOpen, setIsLoading, setError, setCurrentScreen, setSearchQuery,
    setFilterTags, setSortBy, setSortDirection, setViewMode, setSelectedFolder, setInitialFolderInfo,
    setExpandedFolders, setIsOverlayModalOpen, setOverlayPrompt, setIsUserPromptModalOpen, setUserPrompt,
    setUserPromptUpdateTimestamp, setNewFolderName, setParentFolderId, setFolderError
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
      
      {/* 오버레이 모달 (일반 프롬프트용) */}
      {isOverlayModalOpen && overlayPrompt && (
        <PromptOverlayModal
          isOpen={isOverlayModalOpen}
          onClose={closeOverlayModal}
          prompt={overlayPrompt}
        />
      )}
      
      {/* 사용자 추가 프롬프트 모달 */}
      {isUserPromptModalOpen && userPrompt && (
        <UserPromptDetailModal
          isOpen={isUserPromptModalOpen}
          onClose={closeUserPromptModal}
          prompt={userPrompt}
        />
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
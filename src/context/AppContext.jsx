import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPrompts, createPrompt, updatePrompt, deletePrompt, toggleFavorite, recordPromptUsage } from '../api/promptApi';
import { getFolders } from '../api/folderApi';
import { getTags } from '../api/tagApi';

// 초기 상태
const initialState = {
  // UI 상태
  currentScreen: 'main',
  isAddEditModalOpen: false,
  isDetailModalOpen: false,
  isLoading: false,
  error: null,
  
  // 데이터 상태
  prompts: [],
  folders: [],
  tags: [],
  
  // 선택 상태
  selectedPrompt: null,
  selectedFolder: '모든 프롬프트',
  editMode: false,
  
  // 폴더 확장/축소 상태
  expandedFolders: {},
  
  // 검색 및 필터 상태
  searchQuery: '',
  filterTags: [],
  sortBy: 'updated_at',
  sortDirection: 'desc',
  viewMode: 'grid'
};

const AppContext = createContext(initialState);

export const AppProvider = ({ children }) => {
  // 상태 관리
  const [currentScreen, setCurrentScreen] = useState(initialState.currentScreen);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(initialState.isAddEditModalOpen);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(initialState.isDetailModalOpen);
  const [isLoading, setIsLoading] = useState(initialState.isLoading);
  const [error, setError] = useState(initialState.error);
  
  const [prompts, setPrompts] = useState(initialState.prompts);
  const [folders, setFolders] = useState(initialState.folders);
  const [tags, setTags] = useState(initialState.tags);
  
  const [selectedPrompt, setSelectedPrompt] = useState(initialState.selectedPrompt);
  const [selectedFolder, setSelectedFolder] = useState(initialState.selectedFolder);
  const [editMode, setEditMode] = useState(initialState.editMode);
  
  const [expandedFolders, setExpandedFolders] = useState(initialState.expandedFolders);
  
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [filterTags, setFilterTags] = useState(initialState.filterTags);
  const [sortBy, setSortBy] = useState(initialState.sortBy);
  const [sortDirection, setSortDirection] = useState(initialState.sortDirection);
  const [viewMode, setViewMode] = useState(initialState.viewMode);

  // 데이터 로드 함수
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 프롬프트, 폴더, 태그 데이터 병렬로 로드
      const [promptsData, foldersData, tagsData] = await Promise.all([
        getPrompts(),
        getFolders(),
        getTags()
      ]);
      
      setPrompts(promptsData);
      setFolders(foldersData);
      setTags(tagsData);
    } catch (err) {
      console.error('데이터 로드 오류:', err);
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

  // 프롬프트 필터링 함수
  const getFilteredPrompts = useCallback(() => {
    let result = [...prompts];
    
    // 폴더별 필터링
    if (selectedFolder && selectedFolder !== '모든 프롬프트') {
      if (selectedFolder === '즐겨찾기') {
        result = result.filter(p => p.is_favorite);
      } else {
        result = result.filter(p => p.folder === selectedFolder);
      }
    }
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.content.toLowerCase().includes(query)
      );
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
  const handleAddPrompt = useCallback(() => {
    setSelectedPrompt(null);
    setEditMode(false);
    setIsAddEditModalOpen(true);
  }, []);

  // 프롬프트 편집 핸들러
  const handleEditPrompt = useCallback((prompt) => {
    setSelectedPrompt(prompt);
    setEditMode(true);
    setIsAddEditModalOpen(true);
    setIsDetailModalOpen(false);
  }, []);

  // 프롬프트 상세보기 핸들러
  const handleViewPrompt = useCallback((prompt) => {
    setSelectedPrompt(prompt);
    setIsDetailModalOpen(true);
  }, []);

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
        // 기존 프롬프트 업데이트
        savedPrompt = await updatePrompt(selectedPrompt.id, promptData);
        setPrompts(prev => prev.map(p => p.id === selectedPrompt.id ? savedPrompt : p));
      } else {
        // 새 프롬프트 생성
        savedPrompt = await createPrompt(promptData);
        setPrompts(prev => [...prev, savedPrompt]);
      }
      
      setIsAddEditModalOpen(false);
      return savedPrompt;
    } catch (err) {
      console.error('프롬프트 저장 오류:', err);
      setError('프롬프트를 저장하는 중 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [editMode, selectedPrompt]);

  // 프롬프트 삭제 핸들러
  const handleDeletePrompt = useCallback(async (promptId) => {
    if (!window.confirm('정말로 이 프롬프트를 삭제하시겠습니까?')) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await deletePrompt(promptId);
      
      setPrompts(prev => prev.filter(p => p.id !== promptId));
      
      // 현재 상세보기나 편집 중이던 프롬프트가 삭제된 경우 모달 닫기
      if (selectedPrompt && selectedPrompt.id === promptId) {
        setIsDetailModalOpen(false);
        setIsAddEditModalOpen(false);
      }
    } catch (err) {
      console.error('프롬프트 삭제 오류:', err);
      setError('프롬프트를 삭제하는 중 오류가 발생했습니다.');
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

  // 태그 색상 매핑
  const getTagColorClasses = useCallback((color) => {
    const colorMap = {
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

  // 제공할 컨텍스트 값
  const value = {
    // 상태
    currentScreen,
    isAddEditModalOpen,
    isDetailModalOpen,
    isLoading,
    error,
    prompts,
    folders,
    tags,
    selectedPrompt,
    selectedFolder,
    editMode,
    expandedFolders,
    searchQuery,
    filterTags,
    sortBy,
    sortDirection,
    viewMode,
    
    // 데이터 접근 함수
    getFilteredPrompts,
    
    // 액션
    setIsAddEditModalOpen,
    setIsDetailModalOpen,
    setSearchQuery,
    setFilterTags,
    setSortBy,
    setSortDirection,
    setViewMode,
    setSelectedFolder,
    toggleFolder,
    handleAddPrompt,
    handleEditPrompt,
    handleViewPrompt,
    handleToggleFavorite,
    handleRecordUsage,
    handleSavePrompt,
    handleDeletePrompt,
    goToSettings,
    goToDashboard,
    getTagColorClasses,
    loadData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
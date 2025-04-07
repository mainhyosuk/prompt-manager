import React, { createContext, useContext, useState } from 'react';

// 초기 샘플 데이터
const initialPrompts = [
  { 
    id: 1, 
    title: '마케팅 콘텐츠 요약', 
    content: '다음 텍스트를 읽고 {요약_길이}개의 핵심 포인트로 요약해주세요...', 
    tags: [
      { name: '요약', color: 'green' },
      { name: 'GPT-4', color: 'blue' }
    ], 
    lastUsed: '2일 전', 
    folder: '마케팅', 
    isFavorite: true,
    variables: [
      { name: '요약_길이', defaultValue: '5' }
    ]
  },
  { 
    id: 2, 
    title: '블로그 아이디어 생성', 
    content: '{주제}에 대한 10가지 블로그 포스트 아이디어를 제안해주세요...', 
    tags: [
      { name: '마케팅', color: 'pink' },
      { name: 'GPT-4', color: 'blue' }
    ], 
    lastUsed: '1주일 전', 
    folder: '마케팅', 
    isFavorite: false,
    variables: [
      { name: '주제', defaultValue: '' }
    ]
  },
  { 
    id: 3, 
    title: '코드 리팩토링 도우미', 
    content: '다음 {언어} 코드를 더 효율적으로 리팩토링해주세요...', 
    tags: [
      { name: '개발', color: 'red' },
      { name: '코드생성', color: 'purple' }
    ], 
    lastUsed: '3일 전', 
    folder: '개발', 
    isFavorite: true,
    variables: [
      { name: '언어', defaultValue: 'JavaScript' }
    ]
  },
  { 
    id: 4, 
    title: '기술 문서 번역', 
    content: '다음 기술 문서를 {대상_언어}로 번역해주세요...', 
    tags: [
      { name: '번역', color: 'amber' },
      { name: '개발', color: 'red' }
    ], 
    lastUsed: '5일 전', 
    folder: '개발', 
    isFavorite: false,
    variables: [
      { name: '대상_언어', defaultValue: '한국어' }
    ]
  },
];

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // 앱 상태
  const [currentScreen, setCurrentScreen] = useState('main');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [prompts, setPrompts] = useState(initialPrompts);
  
  // 폴더 확장/축소 상태
  const [expandedFolders, setExpandedFolders] = useState({
    업무: true,
    개인: false
  });
  
  // 폴더 토글 함수
  const toggleFolder = (folderName) => {
    setExpandedFolders({
      ...expandedFolders,
      [folderName]: !expandedFolders[folderName]
    });
  };
  
  // 프롬프트 추가 핸들러
  const handleAddPrompt = () => {
    setSelectedPrompt(null);
    setEditMode(false);
    setIsAddEditModalOpen(true);
  };
  
  // 프롬프트 편집 핸들러
  const handleEditPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setEditMode(true);
    setIsAddEditModalOpen(true);
    setIsDetailModalOpen(false);
  };
  
  // 프롬프트 상세보기 핸들러
  const handleViewPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setIsDetailModalOpen(true);
  };
  
  // 프롬프트 저장 핸들러
  const handleSavePrompt = (promptData) => {
    if (editMode) {
      // 기존 프롬프트 업데이트
      setPrompts(
        prompts.map(p => p.id === selectedPrompt.id ? { ...promptData, id: p.id } : p)
      );
    } else {
      // 새 프롬프트 추가
      const newPrompt = {
        ...promptData,
        id: Math.max(...prompts.map(p => p.id)) + 1,
        lastUsed: '방금',
      };
      setPrompts([...prompts, newPrompt]);
    }
    
    setIsAddEditModalOpen(false);
  };
  
  // 설정 페이지로 이동
  const goToSettings = () => {
    setCurrentScreen('settings');
  };
  
  // 메인 대시보드로 돌아가기
  const goToDashboard = () => {
    setCurrentScreen('main');
  };
  
  // 태그 색상 매핑
  const getTagColorClasses = (color) => {
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
  };
  
  const value = {
    currentScreen,
    isAddEditModalOpen,
    isDetailModalOpen,
    selectedPrompt,
    editMode,
    prompts,
    expandedFolders,
    toggleFolder,
    handleAddPrompt,
    handleEditPrompt,
    handleViewPrompt,
    handleSavePrompt,
    goToSettings,
    goToDashboard,
    getTagColorClasses,
    setIsAddEditModalOpen,
    setIsDetailModalOpen
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
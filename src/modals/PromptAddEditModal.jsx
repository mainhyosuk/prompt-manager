// 새로운 프롬프트를 추가하거나 기존 프롬프트를 편집하는 모달 (메인 프롬프트 목록에서 사용)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import VariableList from '../components/variables/VariableList';
import VariableHighlighter, { extractVariablesFromContent } from '../components/variables/VariableHighlighter';
import TagSelector from '../components/tags/TagSelector';
import FolderSelector from '../components/folders/FolderSelector';

// UnsavedChangesPopup 임포트
import UnsavedChangesPopup from '../components/common/UnsavedChangesPopup';

// Props와 Context를 모두 고려하여 수정
const PromptAddEditModal = ({ 
  isOpen: isOpenProp,       // 오버레이 호출 시 사용 (Props)
  onClose: onCloseProp,     // 오버레이 호출 시 사용 (Props)
  prompt: initialPromptProp, // 오버레이 호출 시 사용 (Props)
  editMode: editModeProp     // 오버레이 호출 시 사용 (Props)
}) => {
  const { 
    // Context 상태 (전역 호출 시 사용)
    isAddEditModalOpen: isAddEditModalOpenContext,
    selectedPrompt: selectedPromptContext,
    editMode: editModeContext,
    setIsAddEditModalOpen, // 전역 모달 닫기 함수
    
    // 공통 사용 함수/상태
    handleSavePrompt,
    isLoading,
    initialFolderInfo 
  } = useAppContext();
  
  // 모달 열림 상태 결정 (Props 우선)
  const isOpen = isOpenProp ?? isAddEditModalOpenContext;
  // 편집 모드 결정 (Props 우선)
  const editMode = editModeProp ?? editModeContext;
  // 편집 대상 프롬프트 결정 (Props 우선)
  const initialPrompt = initialPromptProp ?? selectedPromptContext;

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderInfo, setFolderInfo] = useState(null);
  const [tags, setTags] = useState([]);
  const [variables, setVariables] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // 검증 상태
  const [errors, setErrors] = useState({});
  
  // 모달 참조
  const modalRef = useRef(null);
  
  // --- 변경 감지 및 확인 팝업 관련 상태 추가 ---
  const [initialState, setInitialState] = useState(null); // 모달 열릴 때 초기 상태 저장
  const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false); // 확인 팝업 열림 상태
  // --- 변경 감지 및 확인 팝업 관련 상태 추가 끝 ---
  
  // 변경 사항 감지 함수
  const hasUnsavedChanges = useCallback(() => {
    if (!initialState) return false; // 초기 상태 없으면 변경 없음
    
    // 현재 상태 객체 생성
    const currentState = {
      title,
      content,
      folderId: folderInfo?.id,
      tags: tags.map(t => t.name).sort(), // 태그는 이름 배열로 변환 후 정렬하여 비교
      variables: variables.map(({ name, default_value, type }) => ({ name, default_value, type })).sort((a, b) => a.name.localeCompare(b.name)), // 변수 객체 단순화 및 정렬
      isFavorite
    };
    
    // JSON 문자열로 변환하여 비교 (객체/배열 깊은 비교 간소화)
    return JSON.stringify(initialState) !== JSON.stringify(currentState);
  }, [initialState, title, content, folderInfo, tags, variables, isFavorite]);

  // 모달 닫기 시도 함수 (공통 로직)
  const attemptClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      setIsConfirmPopupOpen(true); // 변경사항 있으면 팝업 열기
    } else {
      // 변경사항 없으면 바로 닫기 (Props 우선)
      if (onCloseProp) {
        onCloseProp();
      } else {
        setIsAddEditModalOpen(false);
      }
    }
  }, [hasUnsavedChanges, onCloseProp, setIsAddEditModalOpen]);
  
  // 외부 클릭 감지 (attemptClose 사용)
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target)) {
        event.stopPropagation();
        attemptClose(); // 직접 닫기 대신 attemptClose 호출
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick, true);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
    };
  }, [isOpen, attemptClose]); // attemptClose 의존성 추가

  // ESC 키 입력 감지 (attemptClose 사용)
  useEffect(() => {
    const handleEscKey = (event) => {
      if (isOpen && event.key === 'Escape') {
        event.stopPropagation();
        attemptClose(); // 직접 닫기 대신 attemptClose 호출
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey, true);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isOpen, attemptClose]); // attemptClose 의존성 추가
  
  // 초기 데이터 로드 및 초기 상태 저장
  useEffect(() => {
    // 디버깅 로그는 유지
    console.log('PromptAddEditModal useEffect: initialPrompt =', initialPrompt);
    console.log('PromptAddEditModal useEffect: editMode =', editMode);
    
    let currentTitle = '';
    let currentContent = '';
    let currentFolderInfo = null;
    let currentTags = [];
    let currentVariables = [];
    let currentIsFavorite = false;
    
    if (editMode && initialPrompt) {
      currentTitle = initialPrompt.title || '';
      currentContent = initialPrompt.content || '';
      currentFolderInfo = initialPrompt.folder_id ? {
        id: initialPrompt.folder_id,
        name: initialPrompt.folder
      } : null;
      currentTags = initialPrompt.tags || [];
      currentVariables = initialPrompt.variables || [];
      currentIsFavorite = !!initialPrompt.is_favorite;
    } else {
      currentFolderInfo = initialFolderInfo || null;
    }
    
    // 폼 상태 업데이트
    setTitle(currentTitle);
    setContent(currentContent);
    setFolderInfo(currentFolderInfo);
    setTags(currentTags);
    setVariables(currentVariables);
    setIsFavorite(currentIsFavorite);
    
    // 초기 상태 저장 (변경 감지용)
    setInitialState({
      title: currentTitle,
      content: currentContent,
      folderId: currentFolderInfo?.id,
      tags: currentTags.map(t => t.name).sort(),
      variables: currentVariables.map(({ name, default_value, type }) => ({ name, default_value, type })).sort((a, b) => a.name.localeCompare(b.name)),
      isFavorite: currentIsFavorite
    });
    
    // 모달 열릴 때 팝업 닫기 (혹시 열려있었다면)
    setIsConfirmPopupOpen(false);
    
  }, [editMode, initialPrompt, initialFolderInfo, isOpen]); // isOpen 추가: 모달이 다시 열릴 때마다 초기 상태 재설정
  
  // 내용 변경 시 변수 자동 추출
  const handleContentChange = (newContent) => {
    setContent(newContent);
    
    // 내용에서 변수 추출
    const extractedVariables = extractVariablesFromContent(newContent);
    
    // 기존 변수 정보 유지하면서 새 변수 추가
    const updatedVariables = [...variables];
    
    extractedVariables.forEach(newVar => {
      // 이미 같은 이름의 변수가 있는지 확인
      const existingVarIndex = updatedVariables.findIndex(v => v.name === newVar.name);
      
      if (existingVarIndex === -1) {
        // 없으면 추가
        updatedVariables.push(newVar);
      }
    });
    
    // 내용에 없는 변수 제거 (수동으로 추가한 변수는 유지)
    const contentVariableNames = extractedVariables.map(v => v.name);
    const finalVariables = updatedVariables.filter(v => 
      contentVariableNames.includes(v.name) || v.name === ''
    );
    
    setVariables(finalVariables);
  };
  
  // 폼 검증
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!title.trim()) {
      newErrors.title = '제목을 입력해주세요.';
    }
    
    if (!content.trim()) {
      newErrors.content = '내용을 입력해주세요.';
    }
    
    // 빈 변수명 검사
    if (variables.some(v => v.name.trim() === '')) {
      newErrors.variables = '변수명을 모두 입력해주세요.';
    }
    
    // 중복 변수명 검사
    const varNames = variables.map(v => v.name.trim());
    const uniqueVarNames = new Set(varNames);
    if (varNames.length !== uniqueVarNames.size) {
      newErrors.variables = '중복된 변수명이 있습니다.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, content, variables]);
  
  // 저장 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const promptData = {
        title,
        content,
        folder_id: folderInfo?.id,
        tags,
        variables,
        is_favorite: isFavorite
      };
      
      // editMode와 initialPrompt.id를 사용하여 저장/업데이트 구분
      // promptIdToUpdate 결정: 편집 모드이고 initialPrompt가 존재하면 그 ID 사용
      const promptIdToUpdate = editMode && initialPrompt ? initialPrompt.id : null;
      // 디버깅: handleSavePrompt 호출 전 ID와 데이터 확인
      console.log('PromptAddEditModal handleSubmit: promptIdToUpdate =', promptIdToUpdate);
      console.log('PromptAddEditModal handleSubmit: initialPrompt =', initialPrompt);
      await handleSavePrompt(promptData, promptIdToUpdate);
      
      // 저장 성공 시 초기 상태 업데이트 (다음 변경 감지 위함)
      setInitialState({
        title,
        content,
        folderId: folderInfo?.id,
        tags: tags.map(t => t.name).sort(),
        variables: variables.map(({ name, default_value, type }) => ({ name, default_value, type })).sort((a, b) => a.name.localeCompare(b.name)),
        isFavorite
      });
      setIsConfirmPopupOpen(false); // 팝업 닫기
      
    } catch (error) {
      console.error('프롬프트 저장 오류:', error);
      // 에러 발생 시 모달을 닫지 않고 사용자에게 피드백을 줄 수 있음 (선택사항)
    }
  };
  
  // 모달이 열려있지 않으면 렌더링하지 않음
  if (!isOpen) return null;
  
  return (
    // 오버레이 스타일 적용
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      // onClick 핸들러는 유지하되, 모달 내부 클릭 시 버블링 막기
    >
      {/* 모달 컨텐츠 영역, 외부 클릭 방지 */}
      <div 
        ref={modalRef} 
        className="bg-white rounded-lg shadow-xl w-10/12 max-w-5xl h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // 모달 내부 클릭 시 이벤트 전파 중단
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-6 py-4 flex-shrink-0">
          <h2 className="text-xl font-semibold">
            {/* editMode (Props/Context 통합) 사용 */}
            {editMode ? '프롬프트 편집' : '새 프롬프트 추가'}
          </h2>
          <button 
            // onClick 핸들러 수정: attemptClose 호출
            onClick={attemptClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* 모달 콘텐츠 */}
        <div className="flex-1 p-6 overflow-y-auto">
          <form onSubmit={handleSubmit}>
            {/* 제목 입력 */}
            <div className="mb-4">
              <label htmlFor="title" className="block font-medium text-gray-700 mb-1">
                제목
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="프롬프트 제목을 입력하세요"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <AlertTriangle size={14} className="mr-1" />
                  {errors.title}
                </p>
              )}
            </div>
            
            {/* 내용 입력 */}
            <div className="mb-4">
              <label htmlFor="content" className="block font-medium text-gray-700 mb-1">
                내용
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={10}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  errors.content ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="프롬프트 내용을 입력하세요. {변수명} 형태로 변수를 추가할 수 있습니다."
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <AlertTriangle size={14} className="mr-1" />
                  {errors.content}
                </p>
              )}
            </div>
            
            {/* 변수 하이라이팅 */}
            {content && (
              <div className="mb-4">
                <label className="block font-medium text-gray-700 mb-1">
                  변수 미리보기
                </label>
                <VariableHighlighter content={content} />
              </div>
            )}
            
            {/* 변수 관리 */}
            <VariableList 
              variables={variables} 
              setVariables={setVariables} 
            />
            {errors.variables && (
              <p className="mt-1 mb-4 text-sm text-red-500 flex items-center">
                <AlertTriangle size={14} className="mr-1" />
                {errors.variables}
              </p>
            )}
            
            {/* 폴더 선택 */}
            <FolderSelector 
              selectedFolder={folderInfo} 
              setSelectedFolder={setFolderInfo} 
            />
            
            {/* 태그 선택 */}
            <TagSelector 
              selectedTags={tags} 
              setSelectedTags={setTags} 
            />
            
            {/* 즐겨찾기 토글 */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">즐겨찾기에 추가</span>
              </label>
            </div>
          </form>
        </div>
        
        {/* 모달 푸터 */}
        <div className="flex justify-end border-t px-6 py-4 space-x-2">
          <button
            type="button"
            // onClick 핸들러 수정: attemptClose 호출
            onClick={attemptClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {editMode ? '업데이트' : '저장'}
          </button>
        </div>
      </div>
      
      {/* 확인 팝업 렌더링 */}
      <UnsavedChangesPopup 
        isOpen={isConfirmPopupOpen}
        onCancel={() => setIsConfirmPopupOpen(false)} // 팝업 닫기
        onDiscard={() => { // 저장 없이 닫기
          setIsConfirmPopupOpen(false);
          if (onCloseProp) {
            onCloseProp();
          } else {
            setIsAddEditModalOpen(false);
          }
        }}
        onSaveAndClose={async () => { // 저장 후 닫기
          setIsConfirmPopupOpen(false);
          // handleSubmit 로직 직접 호출 (event 객체 없이)
          if (!validateForm()) {
            return; // 유효성 검사 실패 시 중단
          }
          try {
            const promptData = {
              title,
              content,
              folder_id: folderInfo?.id,
              tags,
              variables,
              is_favorite: isFavorite
            };
            const promptIdToUpdate = editMode && initialPrompt ? initialPrompt.id : null;
            await handleSavePrompt(promptData, promptIdToUpdate);
            // 저장 성공 후 실제 닫기 로직은 handleSavePrompt 내부에서 처리됨 (Props/Context 분기 포함)
            // 여기서는 추가적인 닫기 호출 불필요 (onCloseProp 등)
            if (onCloseProp) {
              onCloseProp();
            }
          } catch (error) {
            console.error('팝업에서 저장 오류:', error);
            // 에러 발생 시 사용자 알림 등 추가 처리 가능
          }
        }}
      />
    </div>
  );
};

export default PromptAddEditModal;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import VariableList from '../components/variables/VariableList';
import VariableHighlighter, { extractVariablesFromContent } from '../components/variables/VariableHighlighter';
import TagSelector from '../components/tags/TagSelector';
import FolderSelector from '../components/folders/FolderSelector';

const PromptAddEditModal = () => {
  const { 
    editMode, 
    selectedPrompt, 
    setIsAddEditModalOpen,
    handleSavePrompt,
    isLoading,
    initialFolderInfo
  } = useAppContext();
  
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
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsAddEditModalOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [setIsAddEditModalOpen]);

  // ESC 키 입력 감지
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setIsAddEditModalOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [setIsAddEditModalOpen]);
  
  // 초기 데이터 로드
  useEffect(() => {
    if (editMode && selectedPrompt) {
      setTitle(selectedPrompt.title || '');
      setContent(selectedPrompt.content || '');
      setFolderInfo(selectedPrompt.folder_id ? {
        id: selectedPrompt.folder_id,
        name: selectedPrompt.folder
      } : null);
      setTags(selectedPrompt.tags || []);
      setVariables(selectedPrompt.variables || []);
      setIsFavorite(!!selectedPrompt.is_favorite);
    } else {
      // 새 프롬프트 기본값
      setTitle('');
      setContent('');
      // initialFolderInfo가 있으면 해당 값을 사용하고, 없으면 null 설정
      setFolderInfo(initialFolderInfo || null);
      setTags([]);
      setVariables([]);
      setIsFavorite(false);
    }
  }, [editMode, selectedPrompt, initialFolderInfo]);
  
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
      
      await handleSavePrompt(promptData);
    } catch (error) {
      console.error('프롬프트 저장 오류:', error);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-3/4 max-w-4xl max-h-screen flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-semibold">
            {editMode ? '프롬프트 편집' : '새 프롬프트 추가'}
          </h2>
          <button 
            onClick={() => setIsAddEditModalOpen(false)}
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
                rows={8}
                className={`w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 ${
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
            onClick={() => setIsAddEditModalOpen(false)}
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
    </div>
  );
};

export default PromptAddEditModal;
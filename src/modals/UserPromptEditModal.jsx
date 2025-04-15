// 사용자 추가 프롬프트를 편집하는 모달

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, AlertTriangle } from 'lucide-react';
import VariableList from '../components/variables/VariableList';
import VariableHighlighter, { extractVariablesFromContent } from '../components/variables/VariableHighlighter';
import TagSelector from '../components/tags/TagSelector';
import FolderSelector from '../components/folders/FolderSelector';

// UnsavedChangesPopup 임포트
import UnsavedChangesPopup from '../components/common/UnsavedChangesPopup';

const UserPromptEditModal = ({ isOpen, onClose, prompt, onUpdate }) => {
  const { updatePromptItem } = useAppContext();
  
  // 편집 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [memo, setMemo] = useState('');
  const [folderInfo, setFolderInfo] = useState(null);
  const [tags, setTags] = useState([]);
  const [variables, setVariables] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // 검증 상태
  const [errors, setErrors] = useState({});
  
  // 모달 참조
  const modalRef = useRef(null);
  
  // --- 변경 감지 및 확인 팝업 관련 상태 추가 ---
  const [initialState, setInitialState] = useState(null); // 초기 상태 저장
  const [isConfirmPopupOpen, setIsConfirmPopupOpen] = useState(false); // 확인 팝업 열림 상태
  // --- 변경 감지 및 확인 팝업 관련 상태 추가 끝 ---
  
  // 변경 사항 감지 함수 (PromptAddEditModal과 유사하게 구현)
  const hasUnsavedChanges = useCallback(() => {
    if (!initialState) return false;
    const currentState = {
      title,
      content,
      memo,
      folderId: folderInfo?.id,
      tags: tags.map(t => t.name).sort(),
      variables: variables.map(({ name, default_value, type }) => ({ name, default_value, type })).sort((a, b) => a.name.localeCompare(b.name)),
      isFavorite
    };
    return JSON.stringify(initialState) !== JSON.stringify(currentState);
  }, [initialState, title, content, memo, folderInfo, tags, variables, isFavorite]);
  
  // 모달 닫기 시도 함수
  const attemptClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      setIsConfirmPopupOpen(true);
    } else {
      onClose(); // 변경 없으면 바로 닫기
    }
  }, [hasUnsavedChanges, onClose]);
  
  // 초기 데이터 로드 및 초기 상태 저장
  useEffect(() => {
    if (isOpen && prompt) {
      const currentTitle = prompt.title || '';
      const currentContent = prompt.content || '';
      const currentMemo = prompt.memo || '';
      const currentVariables = prompt.variables || [];
      const currentTags = prompt.tags || [];
      const currentFolderInfo = prompt.folder_id ? {
        id: prompt.folder_id,
        name: prompt.folder
      } : null;
      const currentIsFavorite = !!prompt.is_favorite;
      
      setTitle(currentTitle);
      setContent(currentContent);
      setMemo(currentMemo);
      setVariables(currentVariables);
      setTags(currentTags);
      setFolderInfo(currentFolderInfo);
      setIsFavorite(currentIsFavorite);
      
      // 초기 상태 저장
      setInitialState({
        title: currentTitle,
        content: currentContent,
        memo: currentMemo,
        folderId: currentFolderInfo?.id,
        tags: currentTags.map(t => t.name).sort(),
        variables: currentVariables.map(({ name, default_value, type }) => ({ name, default_value, type })).sort((a, b) => a.name.localeCompare(b.name)),
        isFavorite: currentIsFavorite
      });
      
      // 팝업 초기화
      setIsConfirmPopupOpen(false);
      
    } else {
      // 모달 닫힐 때 상태 초기화 (팝업 상태 포함)
      setTitle('');
      setContent('');
      setMemo('');
      setVariables([]);
      setTags([]);
      setFolderInfo(null);
      setIsFavorite(false);
      setInitialState(null);
      setIsConfirmPopupOpen(false);
    }
  }, [isOpen, prompt]);
  
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
  const validateForm = () => {
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
  };
  
  // 메모 변경 핸들러
  const handleMemoChange = (e) => {
    setMemo(e.target.value);
  };
  
  // 취소 핸들러 (attemptClose 사용)
  const handleCancel = () => {
    attemptClose();
  };
  
  // 업데이트 핸들러 (성공 시 초기 상태 업데이트 추가)
  const handleUpdate = async () => {
    if (!prompt) return;
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // 수정된 데이터
      const updatedPrompt = {
        ...prompt,
        title,
        content,
        memo,
        variables,
        tags,
        folder_id: folderInfo?.id,
        folder: folderInfo?.name,
        is_favorite: isFavorite,
        updated_at: new Date().toISOString()
      };
      
      // 업데이트 콜백 호출
      if (onUpdate) {
        await onUpdate(updatedPrompt);
      }
      
      // 저장 성공 시 초기 상태 업데이트
      setInitialState({
        title,
        content,
        memo,
        folderId: folderInfo?.id,
        tags: tags.map(t => t.name).sort(),
        variables: variables.map(({ name, default_value, type }) => ({ name, default_value, type })).sort((a, b) => a.name.localeCompare(b.name)),
        isFavorite
      });
      setIsConfirmPopupOpen(false); // 팝업 닫기
      
      // 저장 성공 후 모달 닫기
      onClose();
      
    } catch (error) {
      console.error('업데이트 오류:', error);
      alert('프롬프트 업데이트에 실패했습니다.');
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef} 
        className="bg-white rounded-lg shadow-xl w-10/12 max-w-5xl h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-5 py-3 flex-shrink-0">
          <h2 className="text-lg font-semibold">
            프롬프트 편집 {prompt?.is_user_added && <span className="text-blue-500 text-sm">(사용자 추가)</span>}
          </h2>
          <button 
            onClick={attemptClose}
            className="text-gray-400 hover:text-gray-600"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* 모달 콘텐츠 - 스크롤 가능한 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* 제목 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="프롬프트 제목"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <AlertTriangle size={14} className="mr-1" />
                  {errors.title}
                </p>
              )}
            </div>
            
            {/* 내용 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                내용
              </label>
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.content ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="프롬프트 내용. {변수명} 형태로 변수를 추가할 수 있습니다."
                rows={10}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">즐겨찾기에 추가</span>
              </label>
            </div>
            
            {/* 메모 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                메모
              </label>
              <textarea
                value={memo}
                onChange={handleMemoChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="메모"
                rows={3}
              />
            </div>
            
            {/* 원본 프롬프트 정보 (사용자 추가 프롬프트의 경우) */}
            {prompt?.parent_id && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <h3 className="text-sm font-medium text-gray-700 mb-2">원본 프롬프트 정보</h3>
                <p className="text-sm text-gray-600">
                  {prompt.parent_title || prompt.parent_id || '원본 정보 없음'}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* 버튼 영역 */}
        <div className="border-t p-4 flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            저장
          </button>
        </div>
      </div>
      
      {/* 확인 팝업 렌더링 */}
      <UnsavedChangesPopup 
        isOpen={isConfirmPopupOpen}
        onCancel={() => setIsConfirmPopupOpen(false)} // 팝업 닫기
        onDiscard={() => { // 저장 없이 닫기
          setIsConfirmPopupOpen(false);
          onClose(); // 실제 모달 닫기
        }}
        onSaveAndClose={async () => { // 저장 후 닫기
          setIsConfirmPopupOpen(false);
          // handleUpdate 로직 직접 호출
          if (!prompt) return;
          if (!validateForm()) {
            return;
          }
          try {
            const updatedPrompt = {
              ...prompt,
              title,
              content,
              memo,
              variables,
              tags,
              folder_id: folderInfo?.id,
              folder: folderInfo?.name,
              is_favorite: isFavorite,
              updated_at: new Date().toISOString()
            };
            if (onUpdate) {
              await onUpdate(updatedPrompt);
            } 
            // 성공 시 초기 상태 업데이트 및 닫기 로직은 handleUpdate 내부에 포함됨
            // (하지만 위에서 onClose() 호출을 주석처리했으므로, onUpdate 콜백 내에서 닫도록 유도하거나 여기서 직접 닫아야 함)
            // 임시로 여기서 닫도록 추가
            onClose(); 
          } catch (error) {
            console.error('팝업에서 업데이트 오류:', error);
            alert('프롬프트 업데이트에 실패했습니다.');
          }
        }}
      />
    </div>
  );
};

export default UserPromptEditModal; 
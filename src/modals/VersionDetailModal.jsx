// 버전 관리 탭에서 특정 버전 프롬프트의 상세 정보를 표시하는 모달

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { applyVariables, extractVariables, splitContentByVariables } from '../utils/variableParser';
import { copyToClipboard } from '../utils/clipboard';
import { Maximize2 } from 'lucide-react';
import PromptExpandView from '../components/common/PromptExpandView';
// import VariableEditor from '../components/variables/VariableEditor';
import { updateVariableDefaultValue, updatePromptMemo } from '../api/promptApi';
// import { Link } from 'react-router-dom';
// import MemoExpandModal from '../components/common/MemoExpandModal';

// 변수가 적용된 내용을 하이라이트하는 컴포넌트
const HighlightedContent = ({ content, variableValues }) => {
  if (!content) return <div className="text-gray-400">내용이 없습니다.</div>;
  
  // 변수값이 없으면 빈 객체로 초기화
  const safeVariableValues = variableValues || {};
  
  // 원본 프롬프트에서 모든 변수 추출
  const templateVariables = extractVariables(content);
  
  // 사용자가 입력한 변수명 목록
  const userVariableNames = Object.keys(safeVariableValues);
  
  // 프롬프트를 텍스트와 변수로 분리
  const parts = splitContentByVariables(content);
  
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'variable') {
          // 변수명 그대로 찾기
          const value = safeVariableValues[part.name] || '';
          const hasValue = value && value.trim() !== '';
          
          // 값이 있으면 적용된 값 표시, 없으면 원래 변수 표시
          return (
            <span 
              key={index} 
              className={hasValue 
                ? "bg-green-100 text-green-800 px-1 rounded" 
                : "bg-yellow-100 text-yellow-800 px-1 rounded"}
              title={hasValue ? `원래 변수: {${part.name}}` : '값이 적용되지 않음'}
            >
              {hasValue ? value : part.content}
            </span>
          );
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </div>
  );
};

const VersionDetailModal = ({ isOpen, onClose, prompt }) => {
  const { 
    handleToggleFavorite,
    handleEditPrompt,
    handleRecordUsage,
    getTagColorClasses,
    updatePromptItem,
    handleUpdateVariableDefaultValue
  } = useAppContext();
  
  const [variableValues, setVariableValues] = useState({});
  const [copyStatus, setCopyStatus] = useState('idle');
  const modalRef = useRef(null);
  
  // 텍스트 에디터 관련 상태 추가
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [textEditorValue, setTextEditorValue] = useState('');
  const textEditorRef = useRef(null);

  // 메모 관련 상태 추가
  const [memo, setMemo] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const memoTimerRef = useRef(null);
  const autoSaveDelay = 1000;

  // 확대 보기 관련 상태 추가
  const [isExpandViewOpen, setIsExpandViewOpen] = useState(false);
  const [expandViewContent, setExpandViewContent] = useState('');
  const [expandViewTitle, setExpandViewTitle] = useState('');

  // 누락된 savingStates 선언 추가
  const [savingStates, setSavingStates] = useState({});

  // 모달이 열릴 때 prompt에서 데이터 초기화
  useEffect(() => {
    if (isOpen && prompt) {
      // 변수 기본값 설정
      if (prompt.variables && Array.isArray(prompt.variables) && prompt.variables.length > 0) {
        const initialValues = {};
        const initialSavingStates = {};
        prompt.variables.forEach(variable => {
          if (variable && variable.name) {
            initialValues[variable.name] = variable.default_value || '';
            initialSavingStates[variable.name] = 'idle';
          }
        });
        setVariableValues(initialValues);
        setSavingStates(initialSavingStates);
      } else {
        // 변수가 없는 경우 기본 설정
        setVariableValues({});
        setSavingStates({});
      }
      // 메모 초기화
      setMemo(prompt.memo || '');
      setSavingMemo(false);
      // 확대 보기 초기화
      setIsExpandViewOpen(false);
    } else {
      // 모달이 닫히거나 prompt가 없는 경우 상태 초기화
      setVariableValues({});
      setSavingStates({});
      setMemo('');
      setSavingMemo(false);
      setIsExpandViewOpen(false);
    }
  }, [isOpen, prompt]);
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target)) {
        event.stopPropagation();
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick, true);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
    };
  }, [isOpen, onClose]);

  // ESC 키 입력 감지
  useEffect(() => {
    const handleEscKey = (event) => {
      if (isOpen && event.key === 'Escape') {
        if (isExpandViewOpen) {
          handleCloseExpandView();
        } else if (isTextEditorOpen) {
          closeTextEditor();
        } else {
          // 메모 자동 저장 로직 추가 (PromptDetailModal 참고)
          if (memoTimerRef.current) {
            clearTimeout(memoTimerRef.current);
            memoTimerRef.current = null;
          }
          // 변경 사항이 있으면 저장 시도 (간단 버전)
          if (prompt && memo !== prompt.memo) {
            // autoSaveMemo(memo); // autoSaveMemo 함수 필요
            console.log('[VersionDetailModal] Closing with unsaved memo changes (save logic needed).');
          }
          onClose();
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey, true);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isOpen, onClose, isTextEditorOpen, isExpandViewOpen, memo, prompt]);

  // 텍스트 에디터 외부 클릭 감지 추가
  useEffect(() => {
    const handleTextEditorOutsideClick = (event) => {
      if (isTextEditorOpen && textEditorRef.current && !textEditorRef.current.contains(event.target)) {
        closeTextEditor();
      }
    };
    
    if (isTextEditorOpen) {
      document.addEventListener('mousedown', handleTextEditorOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleTextEditorOutsideClick);
    };
  }, [isTextEditorOpen]);

  // 클립보드 복사 핸들러
  const handleCopyToClipboard = async () => {
    if (!prompt?.content) return;
    
    setCopyStatus('copying');
    
    try {
      // 변수가 적용된 내용 복사
      const contentToCopy = applyVariables(prompt.content, variableValues);
      await copyToClipboard(contentToCopy);
      
      // 사용 기록 업데이트 - 사용자 추가 프롬프트('user-added-'로 시작하는 ID)는 API 호출하지 않음
      if (handleRecordUsage && prompt?.id && !(typeof prompt.id === 'string' && prompt.id.startsWith('user-added-'))) {
        await handleRecordUsage(prompt.id);
      }
      
      setCopyStatus('copied');
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('클립보드 복사 오류:', error);
      setCopyStatus('error');
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    }
  };
  
  // 변수 값 변경 핸들러
  const handleVariableChange = (name, value) => {
    setVariableValues(prev => ({
      ...prev,
      [name]: value
    }));
    setSavingStates(prev => ({ ...prev, [name]: 'idle' }));
  };
  
  // 편집 핸들러
  const handleEdit = () => {
    if (handleEditPrompt && prompt) {
      handleEditPrompt(prompt);
      onClose();
    }
  };
  
  // 즐겨찾기 토글 핸들러
  const handleFavoriteToggle = async () => {
    if (handleToggleFavorite && prompt?.id) {
      await handleToggleFavorite(prompt.id);
    }
  };
  
  // 변수 값이 있는지 확인
  const hasVariables = prompt && prompt.variables && 
    Array.isArray(prompt.variables) && 
    prompt.variables.length > 0;

  // 텍스트 에디터 관련 함수 추가
  const openTextEditor = (variable) => {
    setEditingVariable(variable);
    setTextEditorValue(variableValues[variable.name] || '');
    setIsTextEditorOpen(true);
  };

  const closeTextEditor = () => {
    setIsTextEditorOpen(false);
    setEditingVariable(null);
    setTextEditorValue('');
  };

  // 버전 모달에서는 저장 기능 없이 적용만 함
  const saveTextEditorValue = () => {
    if (editingVariable) {
      handleVariableChange(editingVariable.name, textEditorValue);
    }
    closeTextEditor();
  };

  // 변수 기본값 저장 핸들러 (PromptDetailModal 로직 가져오기)
  const handleSaveVariableDefaultValue = async (variableName) => {
    if (!prompt?.id || !variableName || !handleUpdateVariableDefaultValue) return;

    const variable = prompt.variables.find(v => v.name === variableName);
    if (!variable) return;

    const currentValue = variableValues[variableName] || '';

    // 현재 값과 기본값이 다를 경우에만 저장 시도
    if (currentValue !== variable.default_value) {
      setSavingStates(prev => ({ ...prev, [variableName]: 'saving' }));
      try {
        await handleUpdateVariableDefaultValue(prompt.id, variable.id, currentValue);
        setSavingStates(prev => ({ ...prev, [variableName]: 'saved' }));
        // AppContext에서 updatePromptItem을 통해 로컬 상태 업데이트 가정
        setTimeout(() => {
          setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
        }, 2000);
      } catch (error) {
        console.error('변수 기본값 저장 오류:', error);
        setSavingStates(prev => ({ ...prev, [variableName]: 'error' }));
        setTimeout(() => {
          setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
        }, 3000);
      }
    } else {
      // 이미 기본값과 동일함을 알림 (간단히 콘솔 로그)
      console.log(`Variable '${variableName}' is already set to its default value.`);
      setSavingStates(prev => ({ ...prev, [variableName]: 'saved' })); // 즉시 saved 상태로 변경
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
      }, 1500);
    }
  };

  // 메모 변경 및 자동 저장 핸들러 (PromptDetailModal 로직 가져오기)
  const handleMemoChange = (e) => {
    const newMemo = e.target.value;
    setMemo(newMemo);
    if (memoTimerRef.current) {
      clearTimeout(memoTimerRef.current);
    }
    memoTimerRef.current = setTimeout(() => {
      autoSaveMemo(newMemo);
    }, autoSaveDelay);
  };

  const autoSaveMemo = async (memoToSave) => {
    if (!prompt || memoToSave === prompt.memo) return;
    setSavingMemo(true);
    try {
      await updatePromptMemo(prompt.id, memoToSave);
      if (updatePromptItem) {
        updatePromptItem(prompt.id, { ...prompt, memo: memoToSave });
      }
    } catch (error) {
      console.error('메모 자동 저장 오류:', error);
    } finally {
      setSavingMemo(false);
    }
  };

  useEffect(() => {
    return () => {
      if (memoTimerRef.current) {
        clearTimeout(memoTimerRef.current);
      }
    };
  }, []);

  // 확대 보기 핸들러 추가
  const handleOpenExpandView = (content, title) => {
    setExpandViewContent(content);
    setExpandViewTitle(title);
    setIsExpandViewOpen(true);
  };

  const handleCloseExpandView = () => {
    setIsExpandViewOpen(false);
  };

  const processedContent = hasVariables ? applyVariables(prompt.content, variableValues) : prompt.content;

  if (!isOpen || !prompt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef} 
        className="bg-white rounded-lg shadow-xl w-10/12 max-w-5xl h-[67vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-5 py-3 flex-shrink-0">
          <h2 className="text-lg font-semibold">
            {prompt.title} {prompt.is_current_version && <span className="text-blue-500 text-sm">(현재 버전)</span>}
          </h2>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleFavoriteToggle}
              className="text-gray-400 hover:text-yellow-500"
              title={prompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
            >
              <span className={prompt.is_favorite ? 'text-yellow-400' : ''}>★</span>
            </button>
            <button 
              onClick={handleEdit}
              className="text-gray-400 hover:text-blue-600"
              title="편집"
            >
              <span>✎</span>
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              title="닫기"
            >
              <span>✕</span>
            </button>
          </div>
        </div>
        
        {/* 모달 콘텐츠 - 스크롤 가능한 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* 변수 입력 영역 수정 */}
            {hasVariables && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-2">변수 입력</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {prompt.variables.map((variable, index) => (
                    <div key={`${variable.id || variable.name}-${index}`} className="border rounded-md p-2 bg-white">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {variable.name}
                        {variable.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="flex w-full">
                        <input
                          type="text"
                          value={variableValues[variable.name] || ''}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={`{${variable.name}} 값 입력...`}
                        />
                        {/* 기본값 저장 버튼 (PromptDetailModal 로직 사용) */}
                        {savingStates[variable.name] === 'idle' ? (
                          <button
                            onClick={() => handleSaveVariableDefaultValue(variable.name)}
                            title="기본값으로 저장"
                            className="ml-1 px-2 py-1 border rounded-md hover:bg-blue-50 group"
                          >
                            <span className="text-gray-500 group-hover:text-blue-500">💾</span>
                          </button>
                        ) : savingStates[variable.name] === 'saving' ? (
                          <button disabled className="ml-1 px-2 py-1 border rounded-md bg-gray-50">
                            <span className="text-blue-500 animate-pulse">⏳</span>
                          </button>
                        ) : savingStates[variable.name] === 'saved' ? (
                          <button disabled className="ml-1 px-2 py-1 border rounded-md bg-green-50">
                            <span className="text-green-500">✓</span>
                          </button>
                        ) : (
                          <button disabled className="ml-1 px-2 py-1 border rounded-md bg-red-50">
                            <span className="text-red-500">✕</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openTextEditor(variable)}
                          className="px-2 py-1 border border-l-0 rounded-r-md bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs"
                          title="텍스트 에디터 열기"
                        >
                          <span>📝</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 원본/적용 프롬프트 영역 (UserPromptDetailModal과 동일하게 + 확대 버튼) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* 원본 프롬프트 */}
               <div className="border rounded-lg p-3">
                 <div className="flex justify-between items-center mb-2">
                   <h3 className="text-sm font-medium text-gray-700">원본 프롬프트</h3>
                   {/* --- 상단 확대 보기 버튼 제거 --- */}
                   {/* <button ... /> */}
                 </div>
                 <div className="relative border rounded-md p-2 bg-gray-50 whitespace-pre-wrap text-xs h-44 overflow-y-auto">
                   {prompt.content || '내용이 없습니다.'}
                   {/* 확대 버튼 위치 재조정 */}
                    <button
                      onClick={() => handleOpenExpandView(prompt.content, '원본 프롬프트')}
                      className="absolute bottom-2 right-2 p-1 bg-white/70 hover:bg-white rounded-md border border-gray-200 shadow-sm text-gray-500 hover:text-blue-500"
                      title="확대 보기"
                    >
                      <Maximize2 size={16} />
                    </button>
                 </div>
               </div>

               {/* 변수가 적용된 프롬프트 */}
               <div className="border rounded-lg p-3">
                 <div className="flex justify-between items-center mb-2">
                   <h3 className="text-sm font-medium text-gray-700">변수가 적용된 프롬프트</h3>
                   <div className="flex items-center space-x-2">
                     {/* --- 상단 확대 보기 버튼 제거 --- */}
                     {/* <button ... /> */}
                     <button
                       onClick={handleCopyToClipboard}
                       className={`px-2 py-1 rounded text-xs transition ${
                         copyStatus === 'idle' ? 'bg-blue-500 text-white' :
                         copyStatus === 'copying' ? 'bg-blue-600 text-white' :
                         copyStatus === 'copied' ? 'bg-green-500 text-white' :
                         'bg-red-500 text-white'
                       }`}
                       disabled={copyStatus !== 'idle'}
                     >
                       {copyStatus === 'idle' ? '복사하기' :
                        copyStatus === 'copying' ? '복사 중...' :
                        copyStatus === 'copied' ? '복사됨!' :
                        '오류 발생'}
                     </button>
                   </div>
                 </div>
                 <div className="relative border rounded-md p-2 bg-gray-50 text-xs h-44 overflow-y-auto">
                   {hasVariables ? (
                     <HighlightedContent
                       content={prompt.content}
                       variableValues={variableValues}
                     />
                   ) : (
                     <div className="whitespace-pre-wrap">{prompt.content || '내용이 없습니다.'}</div>
                   )}
                    {/* 확대 버튼 위치 재조정 */}
                     <button
                       onClick={() => handleOpenExpandView(processedContent, '변수가 적용된 프롬프트')}
                       className="absolute bottom-2 right-2 p-1 bg-white/70 hover:bg-white rounded-md border border-gray-200 shadow-sm text-gray-500 hover:text-blue-500"
                       title="확대 보기"
                     >
                       <Maximize2 size={16} />
                     </button>
                 </div>
               </div>
             </div>
            
            {/* 메모 영역 */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-gray-800 flex items-center">
                  <span className="mr-2">📝</span> 메모
                </h3>
                {savingMemo && (
                  <span className="text-xs text-blue-500">저장 중...</span>
                )}
              </div>
              <textarea
                value={memo}
                onChange={handleMemoChange}
                onBlur={() => { // 포커스 잃을 때도 저장
                  if (memoTimerRef.current) {
                    clearTimeout(memoTimerRef.current);
                    memoTimerRef.current = null;
                  }
                  autoSaveMemo(memo);
                }}
                className="w-full flex-1 resize-none border rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
                placeholder="메모를 입력하세요..."
              />
            </div>
            
            {/* 메타 정보 - 한 줄로 표시 */}
            <div className="border rounded-lg p-3">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {/* 태그 */}
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">태그:</span>
                  <div className="flex flex-wrap gap-1">
                    {prompt.tags && prompt.tags.length > 0 ? (
                      prompt.tags.map(tag => (
                        <span 
                          key={tag.id} 
                          className={`px-1.5 py-0.5 rounded-full text-xs ${getTagColorClasses(tag.color)}`}
                        >
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">태그 없음</span>
                    )}
                  </div>
                </div>
                
                {/* 폴더 */}
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">폴더:</span>
                  {prompt.folder ? (
                    <span>{prompt.folder}</span>
                  ) : (
                    <span className="text-gray-400">폴더 없음</span>
                  )}
                </div>
                
                {/* 생성 일자 */}
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">생성일:</span>
                  <span>
                    {prompt.created_at ? new Date(prompt.created_at).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </div>
                
                {/* 마지막 수정일 */}
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">마지막 수정일:</span>
                  <span>
                    {prompt.updated_at ? new Date(prompt.updated_at).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 텍스트 에디터 모달 추가 */}
        {isTextEditorOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60">
            <div ref={textEditorRef} className="bg-white rounded-lg shadow-xl w-2/3 max-w-2xl flex flex-col">
              <div className="flex justify-between items-center border-b px-4 py-2">
                <h3 className="font-medium">
                  "{editingVariable?.name}" 변수 편집
                </h3>
                <button 
                  onClick={closeTextEditor}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span>✕</span>
                </button>
              </div>
              
              <div className="p-4">
                <textarea
                  value={textEditorValue}
                  onChange={(e) => setTextEditorValue(e.target.value)}
                  className="w-full h-56 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="내용을 입력하세요..."
                />
              </div>
              
              <div className="border-t p-3 flex justify-end space-x-2">
                <button
                  onClick={closeTextEditor}
                  className="px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={saveTextEditorValue}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                >
                  적용 (현재 모달에만)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 확대 보기 모달 렌더링 */}
        <PromptExpandView
          isOpen={isExpandViewOpen}
          onClose={handleCloseExpandView}
          title={expandViewTitle}
          content={expandViewContent}
        />
      </div>
    </div>
  );
};

export default VersionDetailModal; 
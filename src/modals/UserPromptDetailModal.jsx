import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { applyVariables, extractVariables, splitContentByVariables } from '../utils/variableParser';
import { copyToClipboard } from '../utils/clipboard';

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

const UserPromptDetailModal = ({ isOpen, onClose, prompt }) => {
  const { 
    handleToggleFavorite,
    handleEditPrompt,
    handleRecordUsage,
    handleUpdateUserAddedPrompt
  } = useAppContext();
  
  const [variableValues, setVariableValues] = useState({});
  const [copyStatus, setCopyStatus] = useState('idle');
  const modalRef = useRef(null);
  
  // 텍스트 에디터 관련 상태 추가
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [textEditorValue, setTextEditorValue] = useState('');
  const textEditorRef = useRef(null);
  
  // 변수 저장 상태 추가
  const [savingStates, setSavingStates] = useState({});

  // 모달 열릴 때 savingStates 초기화 추가
  useEffect(() => {
    if (isOpen && prompt) {
      if (prompt.variables && Array.isArray(prompt.variables) && prompt.variables.length > 0) {
        const initialValues = {};
        const initialSavingStates = {};
        prompt.variables.forEach(variable => {
          if (variable && variable.name) {
            initialValues[variable.name] = variable.default_value || '';
            initialSavingStates[variable.name] = 'idle'; // 'idle', 'saving', 'saved', 'error'
          }
        });
        setVariableValues(initialValues);
        setSavingStates(initialSavingStates);
      } else {
        setVariableValues({});
        setSavingStates({});
      }
    } else {
      setVariableValues({});
      setSavingStates({});
    }
  }, [isOpen, prompt]);

  // ESC 키 입력 감지 (텍스트 에디터 닫기 로직 추가)
  useEffect(() => {
    const handleEscKey = (event) => {
      if (isOpen && event.key === 'Escape') {
        if (isTextEditorOpen) {
          closeTextEditor();
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose, isTextEditorOpen]);

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
      
      // 사용 기록 업데이트
      if (handleRecordUsage && prompt?.id) {
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
  
  // 변수 값 변경 핸들러 (savingStates 업데이트 추가)
  const handleVariableChange = (name, value) => {
    setVariableValues(prev => ({
      ...prev,
      [name]: value
    }));
    // 값이 변경되면 저장 상태 초기화
    setSavingStates(prev => ({
      ...prev,
      [name]: 'idle'
    }));
  };
  
  // 변수 값 저장 핸들러 (사용자 추가 프롬프트용)
  const handleSaveVariableValue = async (variableName) => {
    if (!prompt?.id || !variableName) return;

    setSavingStates(prev => ({ ...prev, [variableName]: 'saving' }));

    try {
      // 현재 프롬프트 데이터 복사
      const updatedPromptData = { ...prompt };
      
      // 변수 배열 업데이트 시도
      if (!updatedPromptData.variables) {
        updatedPromptData.variables = [];
      }
      
      const variableIndex = updatedPromptData.variables.findIndex(v => v.name === variableName);
      const currentValue = variableValues[variableName] || '';

      if (variableIndex > -1) {
        // 기존 변수 업데이트 (default_value 대신 현재 값을 저장하는 개념)
        updatedPromptData.variables[variableIndex] = {
           ...updatedPromptData.variables[variableIndex],
           default_value: currentValue // default_value 필드를 업데이트 
        };
      } else {
        // 새 변수 추가 (실제로는 이 경우는 거의 없음)
        updatedPromptData.variables.push({ name: variableName, default_value: currentValue });
      }

      // API 호출하여 업데이트
      await handleUpdateUserAddedPrompt(prompt.id, { variables: updatedPromptData.variables });

      setSavingStates(prev => ({ ...prev, [variableName]: 'saved' }));
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
      }, 3000);

    } catch (error) {
      console.error('사용자 추가 프롬프트 변수 값 저장 오류:', error);
      setSavingStates(prev => ({ ...prev, [variableName]: 'error' }));
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
      }, 3000);
    }
  };

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

  const saveTextEditorValue = () => {
    if (editingVariable) {
      handleVariableChange(editingVariable.name, textEditorValue);
    }
    closeTextEditor();
  };
  
  // 텍스트 에디터에서 값 저장 버튼 핸들러
  const saveTextEditorValueAndStore = async () => {
    if (!editingVariable || !prompt) return;
    try {
      handleVariableChange(editingVariable.name, textEditorValue);
      await handleSaveVariableValue(editingVariable.name);
      closeTextEditor();
    } catch (error) {
      console.error('텍스트 에디터에서 변수 저장 오류:', error);
    }
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

  if (!isOpen || !prompt) return null;

  return (
    // 배경 div: mousedown 이벤트 처리 수정
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onMouseDown={(e) => {
        // 클릭 대상이 배경 div 자신일 경우 자식 모달 닫기
        if (e.target === e.currentTarget) {
          // console.log('[Child Modal] Background directly clicked. Closing child modal and stopping propagation.');
          onClose(); 
        }
        // 배경 또는 그 내부에서 시작된 mousedown 이벤트는 항상 전파 중단
        e.stopPropagation();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-10/12 max-w-5xl h-[67vh] flex flex-col"
        // 이벤트 버블링을 막기 위해 onClick 핸들러 추가 (Click 이벤트 용도, mousedown과 별개)
        onClick={(e) => e.stopPropagation()}
        // 자식 모달 식별을 위한 data-id 추가
        data-id="user-prompt-detail-modal"
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-5 py-3 flex-shrink-0">
          <h2 className="text-lg font-semibold">
            {prompt.title} {prompt.is_user_added && <span className="text-blue-500 text-sm">(사용자 추가)</span>}
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
              onClick={(e) => { // 이벤트 객체 e를 받도록 수정
                e.stopPropagation(); // 이벤트 전파 중단 추가
                onClose();
              }}
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
                        {/* required 표시가 필요하면 추가 */}
                      </label>
                      <div className="flex w-full">
                        <input
                          type="text"
                          value={variableValues[variable.name] || ''}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={`{${variable.name}} 값 입력...`}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveVariableValue(variable.name)} // 저장 함수 연결
                          className={`px-2 py-1 border border-l-0 rounded-none text-xs 
                            ${savingStates[variable.name] === 'saved' ? 'bg-green-50 text-green-600' : 
                              savingStates[variable.name] === 'error' ? 'bg-red-50 text-red-600' : 
                              savingStates[variable.name] === 'saving' ? 'bg-blue-50 text-blue-400' : 
                              'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
                          title="현재 값 저장"
                          disabled={savingStates[variable.name] === 'saving'}
                        >
                          {/* 아이콘 및 상태 표시 */} 
                          {savingStates[variable.name] === 'saved' ? (
                            <span>✓</span>
                          ) : savingStates[variable.name] === 'saving' ? (
                            <div className="w-3 h-3 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                          ) : (
                            <span>💾</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openTextEditor(variable)} // 에디터 열기 함수 연결
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
            
            {/* 원본 프롬프트와 변수가 적용된 프롬프트 - 2열 레이아웃 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 원본 프롬프트 */}
              <div className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">원본 프롬프트</h3>
                </div>
                <div className="border rounded-md p-2 bg-gray-50 whitespace-pre-wrap text-xs h-44 overflow-y-auto">
                  {prompt.content || '내용이 없습니다.'}
                </div>
              </div>
              
              {/* 변수가 적용된 프롬프트 */}
              <div className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">변수가 적용된 프롬프트</h3>
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
                <div className="border rounded-md p-2 bg-gray-50 text-xs h-44 overflow-y-auto">
                  {hasVariables ? (
                    <HighlightedContent 
                      content={prompt.content} 
                      variableValues={variableValues} 
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{prompt.content || '내용이 없습니다.'}</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 메모 영역 */}
            <div className="border rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">메모</h3>
              <div className="border rounded-md p-2 bg-gray-50 text-xs whitespace-pre-wrap h-32 overflow-y-auto">
                {prompt.memo || '이 프롬프트에 대한 메모가 없습니다.'}
              </div>
            </div>
            
            {/* 메타 정보 - 한 줄로 표시 */}
            <div className="border rounded-lg p-3">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {/* 부모 프롬프트 */}
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">원본 프롬프트:</span>
                  <span className="text-blue-600">
                    {prompt.parent_title || prompt.parent_id || '-'}
                  </span>
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
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60"> {/* z-index 상향 조정 */} 
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
                  onClick={saveTextEditorValueAndStore} // 저장 후 스토리지 업데이트
                  className="px-3 py-1.5 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  저장
                </button>
                <button
                  onClick={saveTextEditorValue}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                >
                  적용 (현재만)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPromptDetailModal; 
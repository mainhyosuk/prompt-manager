// 일반 프롬프트의 상세 정보를 표시하는 오버레이 모달 (AppContext에서 관리)


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { applyVariables, extractVariables, splitContentByVariables } from '../utils/variableParser';
import { copyToClipboard } from '../utils/clipboard';
import { updatePromptMemo } from '../api/promptApi';
import { Maximize2 } from 'lucide-react';
import PromptExpandView from '../components/common/PromptExpandView';

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
          // 매칭되는 사용자 변수 찾기 (변수 파서와 동일한 로직)
          const matchedVarName = findMatchingVariable(part.name, userVariableNames);
          const value = matchedVarName ? safeVariableValues[matchedVarName] : '';
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

// 매칭되는 변수 찾기 (variableParser.js의 함수와 유사)
const findMatchingVariable = (templateVarName, userVarNames) => {
  // 동일한 변수명이 있으면 그것을 사용
  if (userVarNames.includes(templateVarName)) {
    return templateVarName;
  }
  
  // 하드코딩된 매핑 (프로젝트 고유 매핑)
  const hardcodedMapping = {
    'v1.345 버전': '버전 기록',
    'v1.455': '버전 기록',
    '버전': '버전 기록',
    '2025-04-07 월': '일자',
    '날짜': '일자',
    '주요 개선사항': '개선사항'
  };
  
  if (hardcodedMapping[templateVarName] && userVarNames.includes(hardcodedMapping[templateVarName])) {
    return hardcodedMapping[templateVarName];
  }
  
  return null;
};

const PromptOverlayModal = ({ isOpen, onClose, prompt }) => {
  const { 
    handleToggleFavorite,
    handleEditPrompt,
    handleRecordUsage,
    getTagColorClasses,
    handleUpdateVariableDefaultValue,
    updatePromptItem
  } = useAppContext();
  
  const [variableValues, setVariableValues] = useState({});
  const [processedContent, setProcessedContent] = useState('');
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle', 'copying', 'copied', 'error'
  const modalRef = useRef(null);
  
  // 텍스트 에디터 모달 상태
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [textEditorValue, setTextEditorValue] = useState('');
  const textEditorRef = useRef(null);
  
  // 변수 저장 상태 관리
  const [savingStates, setSavingStates] = useState({});
  
  // 메모 관련 상태
  const [memo, setMemo] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const memoTimerRef = useRef(null);
  const autoSaveDelay = 1000; // 1초 후 자동 저장

  // 확대 보기 관련 상태
  const [isExpandViewOpen, setIsExpandViewOpen] = useState(false);
  const [expandViewContent, setExpandViewContent] = useState('');
  const [expandViewTitle, setExpandViewTitle] = useState('');

  // 모달이 열릴 때 prompt에서 데이터 초기화
  useEffect(() => {
    if (isOpen && prompt) {
      // 메모 설정
      setMemo(prompt.memo || '');
      
      // 변수 기본값 설정
      if (prompt.variables && Array.isArray(prompt.variables) && prompt.variables.length > 0) {
        const initialValues = {};
        prompt.variables.forEach(variable => {
          if (variable && variable.name) {
            initialValues[variable.name] = variable.default_value || '';
          }
        });
        setVariableValues(initialValues);
        
        // 초기 프롬프트 내용을 변수 적용 버전으로 설정
        const initialProcessed = applyVariables(prompt.content || '', initialValues);
        setProcessedContent(initialProcessed);
        
        // 저장 상태 초기화
        const initialSavingStates = {};
        prompt.variables.forEach(variable => {
          if (variable && variable.name) {
            initialSavingStates[variable.name] = 'idle'; // 'idle', 'saving', 'saved', 'error'
          }
        });
        setSavingStates(initialSavingStates);
      } else {
        // 변수가 없는 경우 기본 설정
        setProcessedContent(prompt.content || '');
        setVariableValues({});
        setSavingStates({});
      }
      setIsExpandViewOpen(false); // 모달 열릴 때 초기화
    } else {
      // 모달이 닫히거나 prompt가 없는 경우 상태 초기화
      setMemo('');
      setProcessedContent('');
      setVariableValues({});
      setSavingStates({});
      setIsExpandViewOpen(false); // 모달 닫힐 때 초기화
    }
  }, [isOpen, prompt]);
  
  // 변수값이 변경될 때마다 프롬프트 내용 업데이트
  const updateProcessedContent = useCallback(() => {
    if (prompt && prompt.content) {
      const processed = applyVariables(prompt.content, variableValues || {});
      setProcessedContent(processed);
    }
  }, [prompt, variableValues]);
  
  // 변수값이 변경되면 프롬프트 내용 업데이트
  useEffect(() => {
    updateProcessedContent();
  }, [updateProcessedContent]);
  
  // 외부 클릭 감지 - 캡처링 단계에서만 이벤트 처리하여 이벤트 버블링 문제 방지
  useEffect(() => {
    const handleOutsideClick = async (event) => {
      if (isOpen && !isTextEditorOpen && modalRef.current && !modalRef.current.contains(event.target)) {
        // 이벤트를 여기서 중지해서 외부로 전파되지 않도록 함
        event.preventDefault();
        event.stopPropagation();
        
        // 모달을 닫기 전에 메모가 저장되도록 함
        if (memoTimerRef.current) {
          clearTimeout(memoTimerRef.current);
          memoTimerRef.current = null;
        }
        
        // 메모에 변경 사항이 있으면 저장
        if (prompt && memo !== prompt.memo) {
          try {
            await updatePromptMemo(prompt.id, memo);
            updatePromptItem(prompt.id, { ...prompt, memo });
          } catch (error) {
            console.error('모달 닫기 전 메모 저장 오류:', error);
          }
        }
        
        // 모달 닫기
        onClose();
      }
    };
    
    if (isOpen) {
      // true를 추가하여 캡처링 단계에서 이벤트를 처리 (버블링보다 먼저 실행)
      document.addEventListener('mousedown', handleOutsideClick, true);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
    };
  }, [isOpen, isTextEditorOpen, onClose, memo, prompt, updatePromptItem]);

  // ESC 키 입력 감지 - 마찬가지로 캡처링 단계에서 처리
  useEffect(() => {
    const handleEscKey = async (event) => {
      if (event.key === 'Escape' && isOpen) {
        // 이벤트를 여기서 중지해서 외부로 전파되지 않도록 함
        event.preventDefault();
        event.stopPropagation();
        if (event.nativeEvent) {
          event.nativeEvent.stopImmediatePropagation();
        }
        
        // 우선순위 처리: 확장 뷰 -> 텍스트 에디터 -> 모달
        if (isExpandViewOpen) {
          // 확장 뷰가 열려있으면 확장 뷰만 닫음
          handleCloseExpandView();
          return;
        }
        
        if (isTextEditorOpen) {
          // 텍스트 에디터가 열려있으면 텍스트 에디터만 닫음
          closeTextEditor();
          return;
        }
        
        // 위 조건에 해당하지 않을 때만 모달 닫기 처리
        // 모달을 닫기 전에 메모가 저장되도록 함
        if (memoTimerRef.current) {
          clearTimeout(memoTimerRef.current);
          memoTimerRef.current = null;
        }
        
        // 메모에 변경 사항이 있으면 저장
        if (prompt && memo !== prompt.memo) {
          try {
            await updatePromptMemo(prompt.id, memo);
            updatePromptItem(prompt.id, { ...prompt, memo });
          } catch (error) {
            console.error('모달 닫기 전 메모 저장 오류:', error);
          }
        }
        
        // 모달 닫기
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey, true);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isOpen, isTextEditorOpen, isExpandViewOpen, onClose, memo, prompt, updatePromptItem]);

  // 클립보드에 복사
  const handleCopyToClipboard = async () => {
    try {
      setCopyStatus('copying');
      await copyToClipboard(processedContent);
      setCopyStatus('copied');
      
      // 복사 카운트 기록
      handleRecordUsage(prompt.id);
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    } catch (error) {
      setCopyStatus('error');
      console.error('클립보드 복사 오류:', error);
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    }
  };

  // 메모 변경 처리
  const handleMemoChange = (e) => {
    setMemo(e.target.value);
    
    // 이전 타이머가 있으면 취소
    if (memoTimerRef.current) {
      clearTimeout(memoTimerRef.current);
    }
    
    // 새 타이머 설정
    memoTimerRef.current = setTimeout(() => {
      autoSaveMemo(e.target.value);
    }, autoSaveDelay);
  };
  
  // 메모 자동 저장
  const autoSaveMemo = async (memoText) => {
    if (!prompt) return;
    
    // 변경사항이 없으면 저장하지 않음
    if (memoText === prompt.memo) return;
    
    setSavingMemo(true);
    
    try {
      await updatePromptMemo(prompt.id, memoText);
      updatePromptItem(prompt.id, { ...prompt, memo: memoText });
    } catch (error) {
      console.error('메모 저장 오류:', error);
    } finally {
      setSavingMemo(false);
    }
  };

  // 변수 기본값 저장 핸들러 추가 (UserPromptDetailModal 로직 기반, 서버 API 사용)
  const handleSaveVariableValue = useCallback(async (variableName, explicitValue = null) => {
    if (!prompt?.id || !variableName || !prompt.variables) {
      console.error('저장에 필요한 정보 부족');
      return;
    }
    const variableIndex = prompt.variables.findIndex(v => v.name === variableName);
    if (variableIndex === -1) {
      console.error(`변수 '${variableName}'을 찾을 수 없습니다.`);
      return;
    }
    const newValue = explicitValue !== null ? explicitValue : (variableValues[variableName] || '');

    // 변경된 경우에만 업데이트
    if (newValue !== prompt.variables[variableIndex].default_value) {
      setSavingStates(prev => ({ ...prev, [variableName]: 'saving' }));
      try {
        // 1. 서버 API 호출하여 기본값 업데이트 (AppContext 함수 사용)
        await handleUpdateVariableDefaultValue(prompt.id, variableName, newValue);

        // 2. AppContext 상태 업데이트 (변경된 default_value 포함)
        const updatedVariables = prompt.variables.map((v, index) => {
          if (index === variableIndex) {
            return { ...v, default_value: newValue };
          }
          return v;
        });
        updatePromptItem(prompt.id, { variables: updatedVariables });

        // 3. 로컬 상태 업데이트 (variableValues)
        setVariableValues(prev => ({ ...prev, [variableName]: newValue }));

        setSavingStates(prev => ({ ...prev, [variableName]: 'saved' }));
        setTimeout(() => {
          setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
        }, 2000);

      } catch (error) {
        console.error('일반 프롬프트 변수 기본값 저장 오류:', error);
        setSavingStates(prev => ({ ...prev, [variableName]: 'error' }));
        setTimeout(() => {
          setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
        }, 3000);
      }
    } else {
      // 이미 동일하면 UI 피드백만 제공
      setSavingStates(prev => ({ ...prev, [variableName]: 'saved' }));
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
      }, 1500);
    }
  }, [prompt, variableValues, handleUpdateVariableDefaultValue, updatePromptItem]);

  // 변수 값 변경 핸들러 (UserPromptDetailModal과 동일)
  const handleVariableChange = (name, value) => {
    setVariableValues(prev => ({
      ...prev,
      [name]: value
    }));
    setSavingStates(prev => ({
      ...prev,
      [name]: 'idle'
    }));
  };

  // 텍스트 에디터 열기
  const openTextEditor = (variable) => {
    setEditingVariable(variable);
    setTextEditorValue(variableValues[variable.name] || '');
    setIsTextEditorOpen(true);
  };
  
  // 텍스트 에디터 닫기
  const closeTextEditor = (e) => {
    if (e) e.stopPropagation();
    setIsTextEditorOpen(false);
    setEditingVariable(null);
    setTextEditorValue('');
  };
  
  // 텍스트 에디터 '적용' 버튼 (현재만 적용)
  const saveTextEditorValue = (e) => {
    if (e) e.stopPropagation();
    if (editingVariable) {
      handleVariableChange(editingVariable.name, textEditorValue);
    }
    closeTextEditor();
  };
  
  // 텍스트 에디터 '기본값으로 저장' 버튼 수정
  const saveTextEditorValueAsDefault = async (e) => {
    if (e) e.stopPropagation();
    if (!editingVariable || !prompt) return;
    try {
      // handleSaveVariableValue 호출 시 textEditorValue 전달
      await handleSaveVariableValue(editingVariable.name, textEditorValue);
      closeTextEditor();
    } catch (error) {
      console.error('텍스트 에디터에서 기본값 저장 오류:', error);
    }
  };

  // 확대 보기 핸들러
  const handleOpenExpandView = (content, title) => {
    setExpandViewContent(content);
    setExpandViewTitle(title);
    setIsExpandViewOpen(true);
  };

  const handleCloseExpandView = () => {
    setIsExpandViewOpen(false);
  };

  if (!isOpen || !prompt) return null;

  // 변수가 유효한지 검사하는 함수
  const hasValidVariables = 
    prompt.variables && 
    Array.isArray(prompt.variables) && 
    prompt.variables.length > 0 && 
    prompt.variables.some(v => v && v.name);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-modal="prompt-overlay"
      onClick={(e) => {
        // 배경 클릭 시 이벤트 전파 중지 및 닫기
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef} 
        className="bg-white rounded-lg shadow-xl w-10/12 max-w-5xl h-[70vh] flex flex-col"
        onClick={(e) => {
          // 이벤트 전파 중지를 강화하여 부모 모달까지 이벤트가 전파되지 않도록 함
          e.preventDefault();
          e.stopPropagation();
          // 네이티브 이벤트의 즉시 전파 중지 (더 강력한 전파 방지)
          e.nativeEvent.stopImmediatePropagation();
        }}
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-5 py-2 flex-shrink-0">
          <h2 className="text-xl font-semibold">{prompt?.title}</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (prompt) handleToggleFavorite(prompt.id);
              }}
              className="text-gray-400 hover:text-yellow-500"
              title={prompt?.is_favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
            >
              <span className={prompt?.is_favorite ? 'text-yellow-400' : ''}>★</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // 최신 프롬프트 데이터를 전달
                handleEditPrompt(prompt);
              }}
              className="text-gray-400 hover:text-blue-600"
              title="편집"
            >
              <span>✎</span>
            </button>
            <button 
              onClick={(e) => {
                // 버블링 방지 강화
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                
                // DetailModal이 닫히지 않고 OverlayModal만 닫히도록
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600"
              title="닫기"
            >
              <span>✕</span>
            </button>
          </div>
        </div>
        
        {/* 모달 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 변수 입력 영역 - 상단에 고정, 변수가 있을 때만 표시 */}
          {hasValidVariables && (
            <div className="flex-shrink-0 border-b">
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-800 mb-1">변수 입력</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {prompt.variables.map((variable, index) => (
                    <div key={`${variable.id || variable.name}-${index}`} className="border rounded-md p-2 bg-white">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {variable.name}
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
                          onClick={() => handleSaveVariableValue(variable.name)}
                          className={`px-2 py-1 border border-l-0 rounded-none text-xs 
                            ${savingStates[variable.name] === 'saved' ? 'bg-green-50 text-green-600' : 
                              savingStates[variable.name] === 'error' ? 'bg-red-50 text-red-600' : 
                              savingStates[variable.name] === 'saving' ? 'bg-blue-50 text-blue-400' : 
                              'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
                          title="기본값으로 저장"
                          disabled={savingStates[variable.name] === 'saving'}
                        >
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
            </div>
          )}
          
          {/* 프롬프트 내용 및 메타데이터 영역 - 스크롤 가능 */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            {/* 프롬프트 내용 영역 - 가로 배치, 변수가 없을 때 더 큰 공간 할당 */}
            <div className={`flex flex-col md:flex-row gap-3 ${prompt.variables && prompt.variables.length > 0 ? 'h-2/5' : 'h-3/5'}`}>
              {/* 왼쪽 컬럼: 원본 내용 */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-800">원본 프롬프트</h3>
                </div>
                <div className="flex-1 bg-gray-50 p-2 rounded-lg border text-base whitespace-pre-wrap overflow-y-auto relative">
                  {prompt?.content}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenExpandView(prompt?.content, '원본 프롬프트');
                    }}
                    className="absolute bottom-2 right-2 p-1 bg-white/70 hover:bg-white rounded-md border border-gray-200 shadow-sm text-gray-500 hover:text-blue-500"
                    title="확대 보기"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
              
              {/* 오른쪽 컬럼: 변수 적용된 내용 */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-800">변수가 적용된 프롬프트</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 이벤트 버블링 방지
                      handleCopyToClipboard();
                    }}
                    disabled={copyStatus === 'copying'}
                    className={`px-2 py-0.5 rounded flex items-center text-xs
                      ${copyStatus === 'copied' 
                        ? 'bg-green-50 text-green-600' 
                        : copyStatus === 'error'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                  >
                    <span className="mr-1">📋</span>
                    {copyStatus === 'copying' 
                      ? '복사 중...' 
                      : copyStatus === 'copied' 
                      ? '복사됨!' 
                      : copyStatus === 'error'
                      ? '복사 실패' 
                      : '클립보드에 복사'}
                  </button>
                </div>
                <div className="flex-1 bg-white border rounded-lg overflow-y-auto relative">
                  <div className="p-2 text-base whitespace-pre-wrap">
                    <HighlightedContent 
                      content={prompt?.content}
                      variableValues={variableValues}
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenExpandView(processedContent, '변수가 적용된 프롬프트');
                    }}
                    className="absolute bottom-2 right-2 p-1 bg-white/70 hover:bg-white rounded-md border border-gray-200 shadow-sm text-gray-500 hover:text-blue-500"
                    title="확대 보기"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* 메모장 컴포넌트 - 전체 너비 사용, 남은 공간 차지 */}
            <div className="w-full mt-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-gray-800 flex items-center">
                  <span className="mr-2">📝</span>
                  메모
                </h3>
                {savingMemo && (
                  <span className="text-xs text-blue-500">저장 중...</span>
                )}
              </div>
              
              <textarea
                value={memo}
                onChange={(e) => {
                  e.stopPropagation(); // 이벤트 버블링 방지
                  handleMemoChange(e);
                }}
                onBlur={(e) => {
                  e.stopPropagation(); // 이벤트 버블링 방지
                  if (memoTimerRef.current) {
                    clearTimeout(memoTimerRef.current);
                    memoTimerRef.current = null;
                  }
                  autoSaveMemo(memo);
                }}
                onClick={(e) => e.stopPropagation()} // 클릭 시 이벤트 버블링 방지
                className="flex-1 w-full p-2 border rounded-lg bg-gray-50 hover:bg-white focus:bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="메모를 입력하세요..."
                disabled={savingMemo}
              />
            </div>
            
            {/* 메타데이터 - 압축된 레이아웃 */}
            <div className="text-xs text-gray-600 mt-2 flex-shrink-0">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <div className="flex items-center">
                  <span className="mr-1">📁</span>
                  <span>폴더: {prompt?.folder || '없음'}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="mr-1">🕒</span>
                  <span>생성일: {prompt?.created_at ? new Date(prompt.created_at).toLocaleDateString() : '-'}</span>
                </div>
                
                <div className="flex items-center">
                  <span className="mr-1">👤</span>
                  <span>사용 횟수: {prompt?.use_count || 0}회</span>
                </div>
                
                {prompt?.last_used_at && (
                  <div className="flex items-center">
                    <span className="mr-1">🕒</span>
                    <span>마지막 사용: {prompt.last_used}</span>
                  </div>
                )}
              
                <div className="flex items-center">
                  <span className="mr-1">🏷️</span>
                  <span>태그: </span>
                  <div className="flex flex-wrap gap-1 ml-1">
                    {prompt?.tags && prompt.tags.length > 0 ? (
                      prompt.tags.map(tag => (
                        <span 
                          key={tag.id} 
                          className={`px-1.5 py-0.5 rounded-full text-xs ${getTagColorClasses(tag.color)}`}
                        >
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span>없음</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 텍스트 에디터 모달 */}
        {isTextEditorOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60" onClick={closeTextEditor}>
            <div ref={textEditorRef} className="bg-white rounded-lg shadow-xl w-2/3 max-w-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                  onClick={saveTextEditorValueAsDefault} 
                  className="px-3 py-1.5 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  기본값으로 저장 
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

export default PromptOverlayModal; 
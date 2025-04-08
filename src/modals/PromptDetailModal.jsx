import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { applyVariables, extractVariables, splitContentByVariables } from '../utils/variableParser';
import { copyToClipboard } from '../utils/clipboard';
import { updatePromptMemo } from '../api/promptApi';
import PromptPanel from '../components/promptPanel/PromptPanel';

// 변수가 적용된 내용을 하이라이트하는 컴포넌트
const HighlightedContent = ({ content, variableValues }) => {
  if (!content) return null;
  
  // 원본 프롬프트에서 모든 변수 추출
  const templateVariables = extractVariables(content);
  
  // 사용자가 입력한 변수명 목록
  const userVariableNames = Object.keys(variableValues || {});
  
  // 프롬프트를 텍스트와 변수로 분리
  const parts = splitContentByVariables(content);
  
  return (
    <div className="">
      {parts.map((part, index) => {
        if (part.type === 'variable') {
          // 매칭되는 사용자 변수 찾기 (변수 파서와 동일한 로직)
          const matchedVarName = findMatchingVariable(part.name, userVariableNames);
          const value = matchedVarName ? variableValues[matchedVarName] : '';
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

const PromptDetailModal = () => {
  const { 
    selectedPrompt, 
    setSelectedPrompt,
    isDetailModalOpen, 
    setIsDetailModalOpen,
    handleEditPrompt,
    handleToggleFavorite,
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
  
  // 변수 기본값 설정
  useEffect(() => {
    if (selectedPrompt?.variables) {
      const initialValues = {};
      selectedPrompt.variables.forEach(variable => {
        initialValues[variable.name] = variable.default_value || '';
      });
      setVariableValues(initialValues);
      
      // 초기 프롬프트 내용을 변수 적용 버전으로 설정
      const initialProcessed = applyVariables(selectedPrompt.content, initialValues);
      setProcessedContent(initialProcessed);
      
      // 저장 상태 초기화
      const initialSavingStates = {};
      selectedPrompt.variables.forEach(variable => {
        initialSavingStates[variable.name] = 'idle'; // 'idle', 'saving', 'saved', 'error'
      });
      setSavingStates(initialSavingStates);
    }
  }, [selectedPrompt]);
  
  // 변수값이 변경될 때마다 프롬프트 내용 업데이트
  const updateProcessedContent = useCallback(() => {
    if (selectedPrompt) {
      const processed = applyVariables(selectedPrompt.content, variableValues);
      setProcessedContent(processed);
    }
  }, [selectedPrompt, variableValues]);
  
  // 변수값이 변경되면 프롬프트 내용 업데이트
  useEffect(() => {
    updateProcessedContent();
  }, [updateProcessedContent]);
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = async (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // 모달을 닫기 전에 메모가 저장되도록 함
        if (memoTimerRef.current) {
          clearTimeout(memoTimerRef.current);
          memoTimerRef.current = null;
        }
        
        // 메모에 변경 사항이 있으면 저장
        if (selectedPrompt && memo !== selectedPrompt.memo) {
          try {
            await updatePromptMemo(selectedPrompt.id, memo);
            updatePromptItem(selectedPrompt.id, { ...selectedPrompt, memo });
          } catch (error) {
            console.error('모달 닫기 전 메모 저장 오류:', error);
          }
        }
        
        // 모달 닫기
        setIsDetailModalOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [setIsDetailModalOpen, memo, selectedPrompt, updatePromptItem]);

  // 텍스트 에디터 외부 클릭 감지
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

  // ESC 키 입력 감지
  useEffect(() => {
    const handleEscKey = async (event) => {
      if (event.key === 'Escape') {
        if (isTextEditorOpen) {
          closeTextEditor();
        } else {
          // 모달을 닫기 전에 메모가 저장되도록 함
          if (memoTimerRef.current) {
            clearTimeout(memoTimerRef.current);
            memoTimerRef.current = null;
          }
          
          // 메모에 변경 사항이 있으면 저장
          if (selectedPrompt && memo !== selectedPrompt.memo) {
            try {
              await updatePromptMemo(selectedPrompt.id, memo);
              updatePromptItem(selectedPrompt.id, { ...selectedPrompt, memo });
            } catch (error) {
              console.error('모달 닫기 전 메모 저장 오류:', error);
            }
          }
          
          // 모달 닫기
          setIsDetailModalOpen(false);
        }
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [setIsDetailModalOpen, isTextEditorOpen, memo, selectedPrompt, updatePromptItem]);
  
  // 선택된 프롬프트가 변경될 때 메모 값 초기화
  useEffect(() => {
    if (selectedPrompt) {
      setMemo(selectedPrompt.memo || '');
    }
  }, [selectedPrompt]);
  
  // 모달 닫기 전 메모 저장 처리
  const handleCloseModal = async () => {
    // 메모 자동 저장 타이머가 있으면 취소
    if (memoTimerRef.current) {
      clearTimeout(memoTimerRef.current);
      memoTimerRef.current = null;
    }
    
    // 메모에 변경 사항이 있으면 저장
    if (selectedPrompt && memo !== selectedPrompt.memo) {
      try {
        await updatePromptMemo(selectedPrompt.id, memo);
        updatePromptItem(selectedPrompt.id, { ...selectedPrompt, memo });
      } catch (error) {
        console.error('모달 닫기 전 메모 저장 오류:', error);
      }
    }
    
    // 모달 닫기
    setIsDetailModalOpen(false);
  };
  
  if (!selectedPrompt) return null;
  
  // 변수값 업데이트
  const handleVariableChange = (name, value) => {
    setVariableValues(prev => {
      const newValues = {
        ...prev,
        [name]: value
      };
      
      // 즉시 프롬프트 내용 업데이트
      const processed = applyVariables(selectedPrompt.content, newValues);
      setProcessedContent(processed);
      
      return newValues;
    });
    
    // 값이 변경되면 해당 변수의 저장 상태를 idle로 설정
    setSavingStates(prev => ({
      ...prev,
      [name]: 'idle'
    }));
  };
  
  // 변수 기본값 저장
  const handleSaveVariableDefaultValue = async (variableName) => {
    if (!selectedPrompt) return;
    
    // 저장 상태를 'saving'으로 변경
    setSavingStates(prev => ({
      ...prev,
      [variableName]: 'saving'
    }));
    
    try {
      const currentValue = variableValues[variableName] || '';
      
      // API 호출하여 변수 기본값 업데이트
      await handleUpdateVariableDefaultValue(
        selectedPrompt.id,
        variableName,
        currentValue
      );
      
      // 저장 성공 시 상태를 'saved'로 변경
      setSavingStates(prev => ({
        ...prev,
        [variableName]: 'saved'
      }));
      
      // 3초 후에 'idle' 상태로 되돌림
      setTimeout(() => {
        setSavingStates(prev => ({
          ...prev,
          [variableName]: 'idle'
        }));
      }, 3000);
    } catch (error) {
      console.error('변수 기본값 저장 오류:', error);
      
      // 저장 실패 시 상태를 'error'로 변경
      setSavingStates(prev => ({
        ...prev,
        [variableName]: 'error'
      }));
      
      // 3초 후에 'idle' 상태로 되돌림
      setTimeout(() => {
        setSavingStates(prev => ({
          ...prev,
          [variableName]: 'idle'
        }));
      }, 3000);
    }
  };
  
  // 텍스트 에디터 열기
  const openTextEditor = (variable) => {
    setEditingVariable(variable);
    setTextEditorValue(variableValues[variable.name] || '');
    setIsTextEditorOpen(true);
  };
  
  // 텍스트 에디터 닫기
  const closeTextEditor = () => {
    setIsTextEditorOpen(false);
    setEditingVariable(null);
    setTextEditorValue('');
  };
  
  // 텍스트 에디터 저장
  const saveTextEditorValue = () => {
    if (editingVariable) {
      handleVariableChange(editingVariable.name, textEditorValue);
    }
    closeTextEditor();
  };
  
  // 텍스트 에디터에서 기본값 저장 버튼
  const saveTextEditorValueAsDefault = async () => {
    if (!editingVariable || !selectedPrompt) return;
    
    try {
      // 변수 값을 업데이트
      handleVariableChange(editingVariable.name, textEditorValue);
      
      // 저장 프로세스 시작
      await handleSaveVariableDefaultValue(editingVariable.name);
      
      // 에디터 닫기
      closeTextEditor();
    } catch (error) {
      console.error('텍스트 에디터에서 변수 저장 오류:', error);
    }
  };
  
  // 클립보드 복사
  const handleCopyToClipboard = async () => {
    setCopyStatus('copying');
    try {
      await copyToClipboard(processedContent);
      setCopyStatus('copied');
      
      // 프롬프트 사용 기록
      await handleRecordUsage(selectedPrompt.id);
      
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
  
  // 메모 업데이트 처리
  const handleMemoChange = (e) => {
    const newMemo = e.target.value;
    setMemo(newMemo);
    
    // 이전 타이머가 있으면 취소
    if (memoTimerRef.current) {
      clearTimeout(memoTimerRef.current);
    }
    
    // 새 타이머 설정 - 입력 완료 1초 후 자동 저장
    memoTimerRef.current = setTimeout(() => {
      autoSaveMemo(newMemo);
    }, autoSaveDelay);
  };
  
  // 자동 저장 함수
  const autoSaveMemo = async (memoToSave) => {
    if (!selectedPrompt) return;
    if (memoToSave === selectedPrompt.memo) return; // 변경사항이 없으면 저장하지 않음
    
    setSavingMemo(true);
    try {
      await updatePromptMemo(selectedPrompt.id, memoToSave);
      
      // 프롬프트 객체 업데이트 (로컬 상태)
      updatePromptItem(selectedPrompt.id, { ...selectedPrompt, memo: memoToSave });
      
    } catch (error) {
      console.error('메모 자동 저장 오류:', error);
    } finally {
      setSavingMemo(false);
    }
  };
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (memoTimerRef.current) {
        clearTimeout(memoTimerRef.current);
      }
    };
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-10/12 max-w-7xl h-[70vh] flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-5 py-2 flex-shrink-0">
          <h2 className="text-xl font-semibold">{selectedPrompt.title}</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleToggleFavorite(selectedPrompt.id)}
              className="text-gray-400 hover:text-yellow-500"
              title={selectedPrompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
            >
              <span className={selectedPrompt.is_favorite ? 'text-yellow-400' : ''}>★</span>
            </button>
            <button 
              onClick={() => handleEditPrompt(selectedPrompt)}
              className="text-gray-400 hover:text-blue-600"
              title="편집"
            >
              <span>✎</span>
            </button>
            <button 
              onClick={() => handleCloseModal()}
              className="text-gray-400 hover:text-gray-600"
              title="닫기"
            >
              <span>✕</span>
            </button>
          </div>
        </div>
        
        {/* 모달 콘텐츠 - 좌우 분할 레이아웃 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽 영역 - 기존 콘텐츠 (고정 너비) */}
          <div className="w-8/12 flex flex-col overflow-hidden">
            {/* 변수 입력 영역 - 상단에 고정, 변수가 있을 때만 표시 */}
            {selectedPrompt.variables && selectedPrompt.variables.length > 0 && (
              <div className="flex-shrink-0 border-b">
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-800 mb-1">변수 입력</h3>
                    {/* 여기에 필요한 경우 접기/펼치기 버튼을 추가할 수 있음 */}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-2">
                    {selectedPrompt.variables.map((variable, index) => (
                      <div key={`${variable.id || variable.name}-${index}`} className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {variable.name}
                        </label>
                        <div className="flex w-full">
                          <input
                            type="text"
                            value={variableValues[variable.name] || ''}
                            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                            onBlur={(e) => handleVariableChange(variable.name, e.target.value)}
                            placeholder={variable.default_value || `${variable.name} 값 입력`}
                            className="flex-1 px-3 py-1 border rounded-l text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveVariableDefaultValue(variable.name)}
                            className={`px-3 py-1 border border-l-0 rounded-none 
                              ${savingStates[variable.name] === 'saved' ? 'bg-green-50 text-green-600' : 
                                savingStates[variable.name] === 'error' ? 'bg-red-50 text-red-600' : 
                                savingStates[variable.name] === 'saving' ? 'bg-blue-50 text-blue-400' : 
                                'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
                            title="변수값을 기본값으로 저장"
                            disabled={savingStates[variable.name] === 'saving'}
                          >
                            {savingStates[variable.name] === 'saved' ? (
                              <span>✓</span>
                            ) : savingStates[variable.name] === 'saving' ? (
                              <div className="w-4 h-4 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                            ) : (
                              <span>💾</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openTextEditor(variable)}
                            className="px-3 py-1 border border-l-0 rounded-r bg-gray-50 hover:bg-gray-100 text-gray-600"
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
              <div className={`flex flex-col md:flex-row gap-3 ${selectedPrompt.variables && selectedPrompt.variables.length > 0 ? 'h-2/5' : 'h-3/5'}`}>
                {/* 왼쪽 컬럼: 원본 내용 */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-800">원본 프롬프트</h3>
                  </div>
                  <div className="flex-1 bg-gray-50 p-2 rounded-lg border text-base whitespace-pre-wrap overflow-y-auto">
                    {selectedPrompt.content}
                  </div>
                </div>
                
                {/* 오른쪽 컬럼: 변수 적용된 내용 */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-800">변수가 적용된 프롬프트</h3>
                    <button
                      onClick={handleCopyToClipboard}
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
                  <div className="flex-1 bg-white border rounded-lg overflow-y-auto">
                    <div className="p-2 text-base whitespace-pre-wrap">
                      <HighlightedContent 
                        content={selectedPrompt.content}
                        variableValues={variableValues}
                      />
                    </div>
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
                  onChange={handleMemoChange}
                  onBlur={() => {
                    if (memoTimerRef.current) {
                      clearTimeout(memoTimerRef.current);
                      memoTimerRef.current = null;
                    }
                    autoSaveMemo(memo);
                  }}
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
                    <span>폴더: {selectedPrompt.folder || '없음'}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="mr-1">🕒</span>
                    <span>생성일: {new Date(selectedPrompt.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="mr-1">👤</span>
                    <span>사용 횟수: {selectedPrompt.use_count || 0}회</span>
                  </div>
                  
                  {selectedPrompt.last_used_at && (
                    <div className="flex items-center">
                      <span className="mr-1">🕒</span>
                      <span>마지막 사용: {selectedPrompt.last_used}</span>
                    </div>
                  )}
                
                  <div className="flex items-center">
                    <span className="mr-1">🏷️</span>
                    <span>태그: </span>
                    <div className="flex flex-wrap gap-1 ml-1">
                      {selectedPrompt.tags.length > 0 ? (
                        selectedPrompt.tags.map(tag => (
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
          
          {/* 오른쪽 영역 - 프롬프트 패널 (고정 너비) */}
          <div className="w-4/12 border-l overflow-hidden" style={{ width: '33.333%', minWidth: '33.333%', maxWidth: '33.333%' }}>
            <PromptPanel 
              selectedPromptId={selectedPrompt?.id} 
              onPromptSelect={(prompt) => {
                setIsDetailModalOpen(false);
                setTimeout(() => {
                  setSelectedPrompt(prompt);
                  setIsDetailModalOpen(true);
                }, 100);
              }}
              onClose={() => {}} 
            />
          </div>
        </div>
        
        {/* 텍스트 에디터 모달 */}
        {isTextEditorOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                  onClick={saveTextEditorValueAsDefault}
                  className="px-3 py-1.5 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  기본값으로 저장
                </button>
                <button
                  onClick={saveTextEditorValue}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptDetailModal;
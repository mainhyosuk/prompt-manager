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
    <div className="">
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

const VersionEditModal = ({ isOpen, onClose, prompt }) => {
  const { 
    updatePromptItem
  } = useAppContext();
  
  const [variableValues, setVariableValues] = useState({});
  const [processedContent, setProcessedContent] = useState('');
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle', 'copying', 'copied', 'error'
  const [memo, setMemo] = useState('');
  const modalRef = useRef(null);
  
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
      } else {
        // 변수가 없는 경우 기본 설정
        setProcessedContent(prompt.content || '');
        setVariableValues({});
      }
    } else {
      // 모달이 닫히거나 prompt가 없는 경우 상태 초기화
      setMemo('');
      setProcessedContent('');
      setVariableValues({});
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
        event.stopPropagation();
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey, true);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isOpen, onClose]);

  // 클립보드 복사 핸들러
  const handleCopyToClipboard = async () => {
    setCopyStatus('copying');
    
    try {
      await copyToClipboard(processedContent);
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
  
  // 메모 변경 핸들러
  const handleMemoChange = (e) => {
    setMemo(e.target.value);
  };
  
  // 변수 값 변경 핸들러
  const handleVariableChange = (name, value) => {
    setVariableValues(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 변경 사항 저장 핸들러
  const handleSaveChanges = () => {
    if (!prompt) return;
    
    try {
      // 버전 프롬프트 업데이트 (로컬 상태 기준)
      const updatedPrompt = {
        ...prompt,
        memo,
        variables: (prompt.variables || []).map(variable => {
          if (variable && variable.name && variableValues[variable.name] !== undefined) {
            return {
              ...variable,
              default_value: variableValues[variable.name]
            };
          }
          return variable;
        })
      };
      
      // AppContext를 통해 상태 업데이트
      updatePromptItem(prompt.id, updatedPrompt);
      
      // 알림 표시
      alert('변경 사항이 저장되었습니다.');
      
      // 모달 닫기
      onClose();
    } catch (error) {
      console.error('변경 사항 저장 오류:', error);
      alert('변경 사항을 저장하는 중 오류가 발생했습니다.');
    }
  };
  
  // 변수 값이 있는지 확인
  const hasVariables = prompt && prompt.variables && 
    Array.isArray(prompt.variables) && 
    prompt.variables.length > 0;

  if (!isOpen || !prompt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef} 
        className="bg-white rounded-lg shadow-xl w-10/12 max-w-6xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-semibold">
            {prompt.title} <span className="text-gray-500 text-sm">(버전 관리 편집)</span>
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        {/* 모달 콘텐츠 - 좌우 분할 레이아웃 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽 패널 - 변수 입력 및 메모 */}
          <div className="w-1/3 border-r flex flex-col">
            {/* 변수 입력 섹션 */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="font-medium text-gray-700 mb-3">변수 입력</h3>
              
              {hasVariables ? (
                <div className="space-y-4">
                  {prompt.variables.map((variable, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <label className="block font-medium text-sm text-gray-700 mb-1">
                        {variable.name}
                        {variable.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <textarea
                        value={variableValues[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={3}
                        placeholder={`{${variable.name}} 값 입력...`}
                      />
                      {variable.description && (
                        <p className="mt-1 text-xs text-gray-500">{variable.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">이 프롬프트에는 변수가 없습니다.</p>
              )}
            </div>
            
            {/* 메모 섹션 */}
            <div className="border-t p-4">
              <h3 className="font-medium text-gray-700 mb-2">메모</h3>
              <textarea
                value={memo}
                onChange={handleMemoChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={4}
                placeholder="프롬프트에 대한 메모를 입력하세요..."
              />
            </div>
          </div>
          
          {/* 오른쪽 패널 - 원본 및 적용된 프롬프트 */}
          <div className="w-2/3 flex flex-col">
            {/* 원본 프롬프트 */}
            <div className="flex-1 p-4 overflow-y-auto border-b">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-700">원본 프롬프트</h3>
              </div>
              <div className="border rounded-lg p-4 bg-gray-50 whitespace-pre-wrap text-sm">
                {prompt.content || '내용이 없습니다.'}
              </div>
            </div>
            
            {/* 변수가 적용된 프롬프트 */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-700">변수가 적용된 프롬프트</h3>
                <button
                  onClick={handleCopyToClipboard}
                  className={`px-3 py-1 rounded text-sm transition ${
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
              <div className="border rounded-lg p-4 bg-white whitespace-pre-wrap text-sm">
                <HighlightedContent 
                  content={prompt.content} 
                  variableValues={variableValues} 
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* 하단 버튼 영역 */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 mr-2 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSaveChanges}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            변경 사항 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionEditModal; 
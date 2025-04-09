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
    updatePromptItem
  } = useAppContext();
  
  const [variableValues, setVariableValues] = useState({});
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle', 'copying', 'copied', 'error'
  const modalRef = useRef(null);
  
  // 모달이 열릴 때 prompt에서 데이터 초기화
  useEffect(() => {
    if (isOpen && prompt) {
      // 변수 기본값 설정
      if (prompt.variables && Array.isArray(prompt.variables) && prompt.variables.length > 0) {
        const initialValues = {};
        prompt.variables.forEach(variable => {
          if (variable && variable.name) {
            initialValues[variable.name] = variable.default_value || '';
          }
        });
        setVariableValues(initialValues);
      } else {
        // 변수가 없는 경우 기본 설정
        setVariableValues({});
      }
    } else {
      // 모달이 닫히거나 prompt가 없는 경우 상태 초기화
      setVariableValues({});
    }
  }, [isOpen, prompt]);
  
  // ESC 키 입력 감지
  useEffect(() => {
    const handleEscKey = (event) => {
      if (isOpen && event.key === 'Escape') {
        // onClose 호출 전 로그 주석 처리
        // console.log('Closing UserPromptDetailModal due to ESC key.'); 
        // ESC 키는 document 레벨에서 감지되므로 여기서 stopPropagation은 불필요
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

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
  
  // 변수 값 변경 핸들러
  const handleVariableChange = (name, value) => {
    setVariableValues(prev => ({
      ...prev,
      [name]: value
    }));
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
          console.log('[Child Modal] Background directly clicked. Closing child modal and stopping propagation.');
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
            {/* 변수 입력 영역 - 3열 그리드 */}
            {hasVariables && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-2">변수 입력</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {prompt.variables.map((variable, index) => (
                    <div key={index} className="border rounded-md p-2 bg-white">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {variable.name}
                        {variable.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        value={variableValues[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={`{${variable.name}} 값 입력...`}
                      />
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
      </div>
    </div>
  );
};

export default UserPromptDetailModal; 
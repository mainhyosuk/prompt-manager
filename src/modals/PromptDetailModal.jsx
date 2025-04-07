import React, { useState, useEffect, useRef } from 'react';
import { X, Edit, Star, Copy, ChevronRight, Clock, User, Tag, Folder, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { applyVariables, splitContentByVariables } from '../utils/variableParser';
import { copyToClipboard } from '../utils/clipboard';
import VariableHighlighter from '../components/variables/VariableHighlighter';

const PromptDetailModal = () => {
  const { 
    selectedPrompt, 
    setIsDetailModalOpen,
    handleEditPrompt,
    handleToggleFavorite,
    handleRecordUsage,
    getTagColorClasses
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
  
  // 변수 기본값 설정
  useEffect(() => {
    if (selectedPrompt?.variables) {
      const initialValues = {};
      selectedPrompt.variables.forEach(variable => {
        initialValues[variable.name] = variable.default_value || '';
      });
      setVariableValues(initialValues);
    }
  }, [selectedPrompt]);
  
  // 변수 적용한 내용 업데이트
  useEffect(() => {
    if (selectedPrompt) {
      const processed = applyVariables(selectedPrompt.content, variableValues);
      setProcessedContent(processed);
    }
  }, [selectedPrompt, variableValues]);
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsDetailModalOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [setIsDetailModalOpen]);

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
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        if (isTextEditorOpen) {
          closeTextEditor();
        } else {
          setIsDetailModalOpen(false);
        }
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [setIsDetailModalOpen, isTextEditorOpen]);
  
  if (!selectedPrompt) return null;
  
  // 변수값 업데이트
  const handleVariableChange = (name, value) => {
    setVariableValues(prev => ({
      ...prev,
      [name]: value
    }));
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
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-3/4 max-w-4xl max-h-screen flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-semibold">{selectedPrompt.title}</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleToggleFavorite(selectedPrompt.id)}
              className="text-gray-400 hover:text-yellow-500"
              title={selectedPrompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
            >
              <Star size={20} className={selectedPrompt.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''} />
            </button>
            <button 
              onClick={() => handleEditPrompt(selectedPrompt)}
              className="text-gray-400 hover:text-blue-600"
              title="편집"
            >
              <Edit size={20} />
            </button>
            <button 
              onClick={() => setIsDetailModalOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              title="닫기"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* 모달 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 변수 입력 영역 - 상단에 고정 */}
          {selectedPrompt.variables && selectedPrompt.variables.length > 0 && (
            <div className="border-b p-6">
              <h3 className="font-medium text-gray-800 mb-3">변수 입력</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-48 overflow-y-auto">
                {selectedPrompt.variables.map(variable => (
                  <div key={variable.id || variable.name} className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {variable.name}
                    </label>
                    <div className="flex w-full">
                      <input
                        type="text"
                        value={variableValues[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        placeholder={variable.default_value || `${variable.name} 값 입력`}
                        className="flex-1 px-3 py-2 border rounded-l text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <button
                        type="button"
                        onClick={() => openTextEditor(variable)}
                        className="px-3 py-2 border border-l-0 rounded-r bg-gray-50 hover:bg-gray-100 text-gray-600"
                        title="텍스트 에디터 열기"
                      >
                        <FileText size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 프롬프트 내용 및 메타데이터 영역 - 가로 나란히 배치 */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex flex-col md:flex-row gap-6">
              {/* 왼쪽 컬럼: 원본 내용 */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-800">원본 프롬프트</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border mb-4 whitespace-pre-wrap h-64 overflow-y-auto">
                  {selectedPrompt.content}
                </div>
                
                {/* 메타데이터 */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Folder size={16} className="mr-2" />
                    <span>폴더: {selectedPrompt.folder || '없음'}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Tag size={16} className="mr-2" />
                    <span>태그: </span>
                    <div className="flex flex-wrap gap-1 ml-1">
                      {selectedPrompt.tags.length > 0 ? (
                        selectedPrompt.tags.map(tag => (
                          <span 
                            key={tag.id} 
                            className={`px-2 py-0.5 rounded-full text-xs ${getTagColorClasses(tag.color)}`}
                          >
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span>없음</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock size={16} className="mr-2" />
                    <span>생성일: {new Date(selectedPrompt.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <User size={16} className="mr-2" />
                    <span>사용 횟수: {selectedPrompt.use_count || 0}회</span>
                  </div>
                  
                  {selectedPrompt.last_used_at && (
                    <div className="flex items-center">
                      <Clock size={16} className="mr-2" />
                      <span>마지막 사용: {selectedPrompt.last_used}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 오른쪽 컬럼: 변수 적용된 내용 */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-800">변수가 적용된 프롬프트</h3>
                  <button
                    onClick={handleCopyToClipboard}
                    disabled={copyStatus === 'copying'}
                    className={`px-3 py-1 rounded flex items-center text-sm
                      ${copyStatus === 'copied' 
                        ? 'bg-green-50 text-green-600' 
                        : copyStatus === 'error'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                  >
                    <Copy size={14} className="mr-1" />
                    {copyStatus === 'copying' 
                      ? '복사 중...' 
                      : copyStatus === 'copied' 
                      ? '복사됨!' 
                      : copyStatus === 'error'
                      ? '복사 실패' 
                      : '클립보드에 복사'}
                  </button>
                </div>
                <div className="h-64 overflow-y-auto">
                  <HighlightedContent content={processedContent} />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 텍스트 에디터 모달 */}
        {isTextEditorOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div ref={textEditorRef} className="bg-white rounded-lg shadow-xl w-2/3 max-w-2xl flex flex-col">
              <div className="flex justify-between items-center border-b px-4 py-3">
                <h3 className="font-medium">
                  "{editingVariable?.name}" 변수 편집
                </h3>
                <button 
                  onClick={closeTextEditor}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4">
                <textarea
                  value={textEditorValue}
                  onChange={(e) => setTextEditorValue(e.target.value)}
                  className="w-full h-64 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="내용을 입력하세요..."
                />
              </div>
              
              <div className="border-t p-4 flex justify-end space-x-2">
                <button
                  onClick={closeTextEditor}
                  className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={saveTextEditorValue}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 변수가 포함된 내용을 하이라이트하는 컴포넌트
const HighlightedContent = ({ content }) => {
  const regex = /{([^}]+)}/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // 정규식을 사용하여 {변수명} 패턴 찾기
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      // 변수 앞의 일반 텍스트 추가
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index)
      });
    }
    
    // 변수 추가
    parts.push({
      type: 'variable',
      name: match[1],
      content: match[0]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // 마지막 변수 이후의 텍스트 추가
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }
  
  return (
    <div className="bg-white p-4 rounded-lg border whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'variable') {
          return (
            <span key={index} className="bg-yellow-100 text-yellow-800 px-1 rounded">
              {part.content}
            </span>
          );
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </div>
  );
};

export default PromptDetailModal;
import React, { useState, useEffect, useRef } from 'react';
import { X, Edit, Star, Copy, ChevronRight, Clock, User, Tag, Folder } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { applyVariables } from '../utils/variableParser';
import { copyToClipboard } from '../utils/clipboard';

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

  // ESC 키 입력 감지
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setIsDetailModalOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [setIsDetailModalOpen]);
  
  if (!selectedPrompt) return null;
  
  // 변수값 업데이트
  const handleVariableChange = (name, value) => {
    setVariableValues(prev => ({
      ...prev,
      [name]: value
    }));
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
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 왼쪽 컬럼: 원본 내용 및 메타데이터 */}
            <div className="flex-1">
              <h3 className="font-medium text-gray-800 mb-2">원본 프롬프트</h3>
              <div className="bg-gray-50 p-4 rounded-lg border mb-4 whitespace-pre-wrap">
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
            
            {/* 오른쪽 컬럼: 변수 처리 및 복사 기능 */}
            <div className="flex-1">
              {/* 변수 입력 */}
              {selectedPrompt.variables && selectedPrompt.variables.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-800 mb-2">변수 입력</h3>
                  <div className="space-y-2">
                    {selectedPrompt.variables.map(variable => (
                      <div key={variable.id || variable.name} className="flex items-center">
                        <label className="block w-1/3 text-sm text-gray-600">
                          {variable.name}:
                        </label>
                        <input
                          type="text"
                          value={variableValues[variable.name] || ''}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                          placeholder={variable.default_value || `${variable.name} 값 입력`}
                          className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 변수 적용된 내용 */}
              <div className="mb-4">
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
                <div className="bg-white p-4 rounded-lg border whitespace-pre-wrap">
                  {processedContent}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 모달 푸터 */}
        <div className="flex justify-end border-t px-6 py-4 space-x-2">
          <button
            onClick={() => setIsDetailModalOpen(false)}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
          <button
            onClick={handleCopyToClipboard}
            disabled={copyStatus === 'copying'}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center
              ${copyStatus === 'copying' ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Copy size={16} className="mr-2" />
            {copyStatus === 'copying' 
              ? '복사 중...' 
              : copyStatus === 'copied' 
              ? '복사됨!' 
              : '클립보드에 복사'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptDetailModal;
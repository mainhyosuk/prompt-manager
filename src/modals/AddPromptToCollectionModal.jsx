// 특정 프롬프트를 하나 이상의 컬렉션에 추가하는 모달

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Check, Loader } from 'lucide-react';
import { getPrompts } from '../api/promptApi';
import { addPromptToCollection } from '../api/collectionApi';

const AddPromptToCollectionModal = ({ isOpen, onClose, collectionId, collectionName, existingPrompts = [], onPromptAdded }) => {
  const [allPrompts, setAllPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrompts, setSelectedPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const modalRef = useRef(null);
  
  // 모든 프롬프트 불러오기
  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);
  
  // 검색어에 따라 프롬프트 필터링
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPrompts(allPrompts);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = allPrompts.filter(prompt => 
        prompt.title.toLowerCase().includes(term) || 
        prompt.content.toLowerCase().includes(term) ||
        prompt.tags.some(tag => tag.name.toLowerCase().includes(term))
      );
      setFilteredPrompts(filtered);
    }
  }, [searchTerm, allPrompts]);
  
  // 모든 프롬프트 로드
  const loadPrompts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const prompts = await getPrompts();
      
      // 이미 컬렉션에 있는 프롬프트 제외
      const existingPromptIds = existingPrompts.map(p => p.id);
      const availablePrompts = prompts.filter(p => !existingPromptIds.includes(p.id));
      
      setAllPrompts(availablePrompts);
      setFilteredPrompts(availablePrompts);
    } catch (err) {
      console.error('프롬프트 로드 오류:', err);
      setError('프롬프트를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 프롬프트 선택 토글
  const togglePromptSelection = (promptId) => {
    setSelectedPrompts(prev => {
      if (prev.includes(promptId)) {
        return prev.filter(id => id !== promptId);
      } else {
        return [...prev, promptId];
      }
    });
  };
  
  // 선택한 프롬프트 컬렉션에 추가
  const handleAddPrompts = async () => {
    if (selectedPrompts.length === 0) return;
    
    setIsAdding(true);
    
    try {
      // 선택한 각 프롬프트를 컬렉션에 추가
      const addPromises = selectedPrompts.map(promptId => 
        addPromptToCollection(collectionId, promptId)
      );
      
      await Promise.all(addPromises);
      
      // 성공 후 콜백 호출
      if (onPromptAdded) {
        onPromptAdded();
      }
      
      // 모달 닫기
      onClose();
    } catch (err) {
      console.error('프롬프트 추가 오류:', err);
      setError('프롬프트를 컬렉션에 추가하는데 실패했습니다.');
    } finally {
      setIsAdding(false);
    }
  };
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);
  
  // ESC 키 감지
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-medium">
            프롬프트 추가: {collectionName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* 검색 */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="프롬프트 검색 (제목, 내용, 태그)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader size={24} className="animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">
              <p>{error}</p>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? '검색 결과가 없습니다.' : '추가할 수 있는 프롬프트가 없습니다.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPrompts.map(prompt => (
                <div 
                  key={prompt.id}
                  className={`flex items-center border p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPrompts.includes(prompt.id) 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => togglePromptSelection(prompt.id)}
                >
                  <div className="flex-grow">
                    <div className="font-medium">{prompt.title}</div>
                    <p className="text-sm text-gray-600 line-clamp-1">{prompt.content}</p>
                    
                    {prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {prompt.tags.map(tag => (
                          <span 
                            key={tag.id}
                            className="px-2 py-0.5 text-xs rounded-full bg-gray-100"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className={`ml-2 w-6 h-6 flex items-center justify-center rounded-full border ${
                    selectedPrompts.includes(prompt.id) 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'border-gray-300'
                  }`}>
                    {selectedPrompts.includes(prompt.id) && <Check size={14} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 푸터 */}
        <div className="border-t px-4 py-3 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {selectedPrompts.length > 0 ? `${selectedPrompts.length}개 선택됨` : '프롬프트를 선택하세요'}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleAddPrompts}
              disabled={selectedPrompts.length === 0 || isAdding}
              className={`px-4 py-2 rounded-lg flex items-center space-x-1 ${
                selectedPrompts.length === 0 || isAdding
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isAdding ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  <span>추가 중...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>추가하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPromptToCollectionModal; 
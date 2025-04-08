import React, { useState, useEffect } from 'react';
import { getCollections, getCollectionPrompts, addPromptToCollection, removePromptFromCollection, createCollection } from '../../api/collectionApi';
import { getSimilarPrompts, getRecentPrompts } from '../../api/collectionApi';
import { BookOpen, Search, Clock, PlusCircle, ChevronDown, X } from 'lucide-react';
import PromptItemCard from './PromptItemCard';

const PromptPanel = ({ selectedPrompt, onSelectPrompt }) => {
  // 현재 선택된 탭 (0: 맞춤 컬렉션, 1: 유사 프롬프트, 2: 최근 사용 프롬프트)
  const [activeTab, setActiveTab] = useState(0);
  
  // 데이터 상태
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionPrompts, setCollectionPrompts] = useState([]);
  const [similarPrompts, setSimilarPrompts] = useState([]);
  const [recentPrompts, setRecentPrompts] = useState([]);
  
  // 로딩 상태
  const [loading, setLoading] = useState({
    collections: false,
    collectionPrompts: false,
    similarPrompts: false,
    recentPrompts: false,
    createCollection: false
  });
  
  // 오류 상태
  const [error, setError] = useState({
    collections: null,
    collectionPrompts: null,
    similarPrompts: null,
    recentPrompts: null,
    createCollection: null
  });
  
  // 새 컬렉션 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  
  // 컬렉션 목록 불러오기
  const loadCollections = async () => {
    setLoading(prev => ({ ...prev, collections: true }));
    setError(prev => ({ ...prev, collections: null }));
    
    try {
      const data = await getCollections();
      setCollections(data);
      
      // 첫 번째 컬렉션 자동 선택
      if (data.length > 0 && !selectedCollection) {
        setSelectedCollection(data[0].id);
        loadCollectionPrompts(data[0].id);
      }
    } catch (err) {
      setError(prev => ({ ...prev, collections: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, collections: false }));
    }
  };
  
  // 컬렉션 프롬프트 불러오기
  const loadCollectionPrompts = async (collectionId) => {
    if (!collectionId) return;
    
    setLoading(prev => ({ ...prev, collectionPrompts: true }));
    setError(prev => ({ ...prev, collectionPrompts: null }));
    
    try {
      const data = await getCollectionPrompts(collectionId);
      setCollectionPrompts(data);
    } catch (err) {
      setError(prev => ({ ...prev, collectionPrompts: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, collectionPrompts: false }));
    }
  };
  
  // 유사 프롬프트 불러오기
  const loadSimilarPrompts = async () => {
    if (!selectedPrompt) return;
    
    setLoading(prev => ({ ...prev, similarPrompts: true }));
    setError(prev => ({ ...prev, similarPrompts: null }));
    
    try {
      const data = await getSimilarPrompts(selectedPrompt.id);
      setSimilarPrompts(data);
    } catch (err) {
      setError(prev => ({ ...prev, similarPrompts: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, similarPrompts: false }));
    }
  };
  
  // 최근 프롬프트 불러오기
  const loadRecentPrompts = async () => {
    setLoading(prev => ({ ...prev, recentPrompts: true }));
    setError(prev => ({ ...prev, recentPrompts: null }));
    
    try {
      const excludedId = selectedPrompt ? selectedPrompt.id : 0;
      const data = await getRecentPrompts(excludedId, 10);
      setRecentPrompts(data);
    } catch (err) {
      setError(prev => ({ ...prev, recentPrompts: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, recentPrompts: false }));
    }
  };
  
  // 새 컬렉션 생성하기
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    
    setLoading(prev => ({ ...prev, createCollection: true }));
    setError(prev => ({ ...prev, createCollection: null }));
    
    try {
      await createCollection(newCollectionName.trim());
      // 컬렉션 목록 새로고침
      await loadCollections();
      // 모달 닫기
      setIsCreateModalOpen(false);
      setNewCollectionName('');
    } catch (err) {
      setError(prev => ({ ...prev, createCollection: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, createCollection: false }));
    }
  };
  
  // 프롬프트를 컬렉션에 추가
  const handleAddToCollection = async (promptId) => {
    if (!selectedCollection || !promptId) return;
    
    try {
      await addPromptToCollection(selectedCollection, promptId);
      loadCollectionPrompts(selectedCollection);
    } catch (err) {
      console.error('컬렉션에 프롬프트 추가 오류:', err);
    }
  };
  
  // 프롬프트를 컬렉션에서 제거
  const handleRemoveFromCollection = async (promptId) => {
    if (!selectedCollection || !promptId) return;
    
    try {
      await removePromptFromCollection(selectedCollection, promptId);
      loadCollectionPrompts(selectedCollection);
    } catch (err) {
      console.error('컬렉션에서 프롬프트 제거 오류:', err);
    }
  };
  
  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadCollections();
  }, []);
  
  // 현재 프롬프트 변경 시 유사 프롬프트 로드
  useEffect(() => {
    if (selectedPrompt) {
      loadSimilarPrompts();
      loadRecentPrompts();
    }
  }, [selectedPrompt]);
  
  // 선택된 컬렉션 변경 시 해당 컬렉션의 프롬프트 로드
  useEffect(() => {
    if (selectedCollection) {
      loadCollectionPrompts(selectedCollection);
    }
  }, [selectedCollection]);
  
  // 탭 변경 시 필요한 데이터 로드
  useEffect(() => {
    if (activeTab === 0 && collections.length > 0) {
      // 맞춤 컬렉션 탭
      if (!selectedCollection && collections.length > 0) {
        setSelectedCollection(collections[0].id);
        loadCollectionPrompts(collections[0].id);
      }
    } else if (activeTab === 1 && selectedPrompt) {
      // 유사 프롬프트 탭
      loadSimilarPrompts();
    } else if (activeTab === 2) {
      // 최근 사용 프롬프트 탭
      loadRecentPrompts();
    }
  }, [activeTab]);
  
  // 전체 로딩 상태 표시 함수
  const renderLoading = () => (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
  
  // 오류 표시 함수
  const renderError = (message) => (
    <div className="text-center text-red-500 p-4">
      <p className="mb-2">오류가 발생했습니다</p>
      <p className="text-sm">{message}</p>
    </div>
  );
  
  // 빈 데이터 표시 함수
  const renderEmpty = (message) => (
    <div className="text-center text-gray-500 p-4">
      <p>{message}</p>
    </div>
  );
  
  // 현재 탭 내용 렌더링
  const renderTabContent = () => {
    if (activeTab === 0) {
      // 맞춤 컬렉션 탭
      return (
        <div>
          {loading.collections && collections.length === 0 ? (
            renderLoading()
          ) : error.collections ? (
            renderError(error.collections)
          ) : collections.length === 0 ? (
            renderEmpty('저장된 컬렉션이 없습니다')
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">컬렉션 선택</label>
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="ml-auto text-xs text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <PlusCircle size={14} className="mr-1" />
                    새 컬렉션
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={selectedCollection || ''}
                    onChange={(e) => setSelectedCollection(Number(e.target.value))}
                    className="block w-full p-2 pl-3 pr-10 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    {collections.map(collection => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name} ({collection.prompt_count})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              
              {loading.collectionPrompts ? (
                renderLoading()
              ) : error.collectionPrompts ? (
                renderError(error.collectionPrompts)
              ) : collectionPrompts.length === 0 ? (
                renderEmpty('컬렉션에 저장된 프롬프트가 없습니다')
              ) : (
                <div className="space-y-2 mt-2">
                  {collectionPrompts.map(prompt => (
                    <PromptItemCard
                      key={prompt.id}
                      prompt={prompt}
                      collectionId={selectedCollection}
                      onRemoveFromCollection={handleRemoveFromCollection}
                      onClick={onSelectPrompt}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      );
    } else if (activeTab === 1) {
      // 유사 프롬프트 탭
      return (
        <div>
          {loading.similarPrompts ? (
            renderLoading()
          ) : error.similarPrompts ? (
            renderError(error.similarPrompts)
          ) : similarPrompts.length === 0 ? (
            renderEmpty('유사한 프롬프트가 없습니다')
          ) : (
            <div className="space-y-2 mt-2">
              {similarPrompts.map(prompt => (
                <PromptItemCard
                  key={prompt.id}
                  prompt={prompt}
                  onAddToCollection={handleAddToCollection}
                  onClick={onSelectPrompt}
                />
              ))}
            </div>
          )}
        </div>
      );
    } else {
      // 최근 사용 프롬프트 탭
      return (
        <div>
          {loading.recentPrompts ? (
            renderLoading()
          ) : error.recentPrompts ? (
            renderError(error.recentPrompts)
          ) : recentPrompts.length === 0 ? (
            renderEmpty('최근 사용한 프롬프트가 없습니다')
          ) : (
            <div className="space-y-2 mt-2">
              {recentPrompts.map(prompt => (
                <PromptItemCard
                  key={prompt.id}
                  prompt={prompt}
                  onAddToCollection={handleAddToCollection}
                  onClick={onSelectPrompt}
                />
              ))}
            </div>
          )}
        </div>
      );
    }
  };
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 탭 헤더 */}
      <div className="flex border-b">
        <button
          className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
            activeTab === 0
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab(0)}
        >
          <BookOpen size={16} className="mr-1" />
          컬렉션
        </button>
        <button
          className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
            activeTab === 1
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab(1)}
        >
          <Search size={16} className="mr-1" />
          유사 항목
        </button>
        <button
          className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
            activeTab === 2
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab(2)}
        >
          <Clock size={16} className="mr-1" />
          최근 사용
        </button>
      </div>
      
      {/* 탭 내용 영역 */}
      <div className="flex-1 overflow-y-auto p-3">
        {renderTabContent()}
      </div>
      
      {/* 새 컬렉션 생성 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">새 컬렉션 만들기</h3>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewCollectionName('');
                  setError(prev => ({ ...prev, createCollection: null }));
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                컬렉션 이름
              </label>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="컬렉션 이름을 입력하세요"
                autoFocus
              />
              {error.createCollection && (
                <p className="mt-1 text-sm text-red-600">{error.createCollection}</p>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewCollectionName('');
                  setError(prev => ({ ...prev, createCollection: null }));
                }}
                className="px-4 py-2 border rounded bg-white hover:bg-gray-50 text-sm"
              >
                취소
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || loading.createCollection}
                className={`px-4 py-2 rounded text-white text-sm ${
                  !newCollectionName.trim() || loading.createCollection
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading.createCollection ? (
                  <span className="flex items-center">
                    <span className="w-4 h-4 mr-2 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></span>
                    생성 중...
                  </span>
                ) : (
                  '생성'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptPanel;

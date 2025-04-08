import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import PromptItemCard from './PromptItemCard';
import { Plus } from 'lucide-react';
import { getCollections, createCollection, deleteCollection, addPromptToCollection, removePromptFromCollection, renameCollection, reorderCollections } from '../../api/collectionApi';
import { getCollectionPrompts, getSimilarPrompts, getRecentPrompts } from '../../api/collectionApi';
import AddPromptToCollectionModal from '../../modals/AddPromptToCollectionModal';

const PromptPanel = ({ 
  selectedPromptId = null, 
  onPromptSelect, 
  onClose
}) => {
  // 탭과 데이터 상태
  const [activeTab, setActiveTab] = useState('collections');
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 컬렉션 관리 상태
  const [collectionNameInput, setCollectionNameInput] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  
  // 프롬프트 추가 모달 상태
  const [isAddPromptModalOpen, setIsAddPromptModalOpen] = useState(false);
  
  // 컨텍스트 가져오기
  const { handleToggleFavorite, handleEditPrompt, handleRecordUsage } = useAppContext();
  
  // 컬렉션 이름 가져오기
  const getSelectedCollectionName = () => {
    const collection = collections.find(c => c.id === selectedCollectionId);
    return collection ? collection.name : '';
  };
  
  // 컬렉션 로드
  const loadCollections = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getCollections();
      setCollections(response);
      
      // 컬렉션이 있으면 첫 번째 컬렉션 선택
      if (response.length > 0 && !selectedCollectionId) {
        setSelectedCollectionId(response[0].id);
      } else if (response.length === 0) {
        setSelectedCollectionId(null);
      }
    } catch (err) {
      console.error('컬렉션 로드 오류:', err);
      setError('컬렉션을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 컬렉션 프롬프트 로드
  const loadCollectionPrompts = async (collectionId) => {
    if (!collectionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getCollectionPrompts(collectionId);
      setPrompts(response);
    } catch (err) {
      console.error('컬렉션 프롬프트 로드 오류:', err);
      setError('프롬프트를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 유사 프롬프트 로드
  const loadSimilarPrompts = async () => {
    if (!selectedPromptId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getSimilarPrompts(selectedPromptId);
      setPrompts(response);
    } catch (err) {
      console.error('유사 프롬프트 로드 오류:', err);
      setError('유사한 프롬프트를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 최근 프롬프트 로드
  const loadRecentPrompts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getRecentPrompts();
      setPrompts(response);
    } catch (err) {
      console.error('최근 프롬프트 로드 오류:', err);
      setError('최근 프롬프트를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 새 컬렉션 생성
  const handleCreateCollection = async () => {
    if (!collectionNameInput.trim()) return;
    
    setIsCreatingCollection(true);
    
    try {
      const newCollection = await createCollection(collectionNameInput.trim());
      setCollections(prev => [...prev, newCollection]);
      setSelectedCollectionId(newCollection.id);
      setCollectionNameInput('');
    } catch (err) {
      alert('컬렉션 생성에 실패했습니다.');
    } finally {
      setIsCreatingCollection(false);
    }
  };
  
  // 컬렉션 삭제
  const handleDeleteCollection = async (collectionId) => {
    if (!collectionId) return;
    
    if (!confirm('정말로 이 컬렉션을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      await deleteCollection(collectionId);
      
      // 상태 업데이트
      setCollections(prev => prev.filter(c => c.id !== collectionId));
      
      // 삭제된 컬렉션이 선택된 경우, 다른 컬렉션 선택
      if (selectedCollectionId === collectionId) {
        const remaining = collections.filter(c => c.id !== collectionId);
        if (remaining.length > 0) {
          setSelectedCollectionId(remaining[0].id);
        } else {
          setSelectedCollectionId(null);
          setPrompts([]);  // 컬렉션이 없으면 프롬프트도 비우기
        }
      }
    } catch (err) {
      alert('컬렉션 삭제에 실패했습니다.');
    }
  };
  
  // 컬렉션 이름 변경 시작
  const handleStartRenaming = () => {
    setNewCollectionName(getSelectedCollectionName());
    setIsRenaming(true);
  };
  
  // 컬렉션 이름 변경 취소
  const handleCancelRenaming = () => {
    setIsRenaming(false);
    setNewCollectionName('');
  };
  
  // 컬렉션 이름 변경 적용
  const handleRenameCollection = async () => {
    if (!selectedCollectionId || !newCollectionName.trim()) return;
    
    try {
      await renameCollection(selectedCollectionId, newCollectionName.trim());
      
      // 상태 업데이트
      setCollections(prev => 
        prev.map(c => 
          c.id === selectedCollectionId 
            ? { ...c, name: newCollectionName.trim() } 
            : c
        )
      );
      setIsRenaming(false);
      setNewCollectionName('');
    } catch (err) {
      alert('컬렉션 이름 변경에 실패했습니다.');
    }
  };
  
  // 프롬프트 추가 모달 열기
  const handleOpenAddPromptModal = () => {
    if (!selectedCollectionId) return;
    setIsAddPromptModalOpen(true);
  };
  
  // 프롬프트 추가 완료 후 콜백
  const handlePromptAdded = () => {
    // 컬렉션 프롬프트 다시 로드
    if (selectedCollectionId) {
      loadCollectionPrompts(selectedCollectionId);
    }
  };
  
  // 프롬프트를 컬렉션에서 제거
  const handleRemovePromptFromCollection = async (promptId) => {
    if (!selectedCollectionId || !promptId) return;
    
    try {
      await removePromptFromCollection(selectedCollectionId, promptId);
      
      // 컬렉션 탭에서만 목록 업데이트
      if (activeTab === 'collections') {
        setPrompts(prev => prev.filter(p => p.id !== promptId));
      }
    } catch (err) {
      alert('프롬프트를 컬렉션에서 제거하는데 실패했습니다.');
    }
  };
  
  // 초기 데이터 로드
  useEffect(() => {
    loadCollections();
  }, []);
  
  // 탭 변경 시 데이터 로드
  useEffect(() => {
    switch (activeTab) {
      case 'collections':
        if (selectedCollectionId) {
          loadCollectionPrompts(selectedCollectionId);
        } else {
          setPrompts([]);
        }
        break;
      case 'similar':
        loadSimilarPrompts();
        break;
      case 'recent':
        loadRecentPrompts();
        break;
    }
  }, [activeTab, selectedCollectionId]);
  
  // 로딩 상태 표시
  const renderLoading = () => (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  // 오류 메시지 표시
  const renderError = () => (
    <div className="text-red-500 p-4 text-center">
      <p>{error}</p>
    </div>
  );
  
  // 빈 상태 표시
  const renderEmpty = (message) => (
    <div className="text-center py-6">
      <p className="text-gray-500">{message}</p>
    </div>
  );
  
  return (
    <div className="h-full flex flex-col">
      {/* 탭 네비게이션 */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 text-sm ${
            activeTab === 'collections'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('collections')}
        >
          내 컬렉션
        </button>
        
        <button
          className={`px-4 py-2 text-sm ${
            activeTab === 'similar'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('similar')}
          disabled={!selectedPromptId}
        >
          유사 프롬프트
        </button>
        
        <button
          className={`px-4 py-2 text-sm ${
            activeTab === 'recent'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('recent')}
        >
          최근 사용
        </button>
      </div>
      
      {/* 패널 내용 */}
      <div className="p-4 overflow-y-auto flex-1">
        {isLoading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : activeTab === 'collections' ? (
          <>
            {/* 컬렉션 선택기 */}
            <div className="mb-4">
              {collections.length > 0 ? (
                <select
                  className="w-full p-2 border rounded mb-2"
                  value={selectedCollectionId || ''}
                  onChange={(e) => setSelectedCollectionId(e.target.value)}
                >
                  <option value="" disabled>컬렉션 선택</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : null}
              
              <div className="flex mb-2">
                <input 
                  type="text"
                  className="flex-1 p-2 border rounded-l"
                  placeholder="새 컬렉션"
                  value={collectionNameInput}
                  onChange={(e) => setCollectionNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                />
                <button
                  className="bg-blue-500 text-white px-3 rounded-r"
                  onClick={handleCreateCollection}
                  disabled={isCreatingCollection || !collectionNameInput.trim()}
                >
                  +
                </button>
              </div>
              
              {selectedCollectionId && (
                <div className="flex justify-between w-full">
                  {isRenaming ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        className="flex-1 p-1 border rounded text-sm"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameCollection()}
                      />
                      <button
                        onClick={handleRenameCollection}
                        className="text-sm text-green-600 hover:text-green-800"
                      >
                        저장
                      </button>
                      <button
                        onClick={handleCancelRenaming}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartRenaming}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      이름 변경
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCollection(selectedCollectionId)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    컬렉션 삭제
                  </button>
                </div>
              )}
            </div>
            
            {/* 프롬프트 추가 버튼 */}
            {selectedCollectionId && (
              <div className="mb-4">
                <button
                  onClick={handleOpenAddPromptModal}
                  className="w-full p-2 rounded-lg border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 flex items-center justify-center"
                >
                  <Plus size={18} className="mr-1" />
                  <span>프롬프트 추가</span>
                </button>
              </div>
            )}
            
            {/* 컬렉션 프롬프트 */}
            {collections.length === 0 ? (
              renderEmpty('컬렉션이 없습니다. 새 컬렉션을 추가해 보세요.')
            ) : !selectedCollectionId ? (
              renderEmpty('컬렉션을 선택하세요')
            ) : prompts.length === 0 ? (
              renderEmpty('이 컬렉션에 프롬프트가 없습니다')
            ) : (
              <div className="space-y-2">
                {prompts.map(prompt => (
                  <PromptItemCard
                    key={prompt.id}
                    prompt={prompt}
                    onRemoveFromCollection={handleRemovePromptFromCollection}
                    onClick={onPromptSelect}
                  />
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'similar' ? (
          <>
            <h3 className="font-medium mb-3">유사 프롬프트</h3>
            {!selectedPromptId ? (
              renderEmpty('선택된 프롬프트가 없습니다')
            ) : prompts.length === 0 ? (
              renderEmpty('유사한 프롬프트가 없습니다')
            ) : (
              <div className="space-y-2">
                {prompts.map(prompt => (
                  <PromptItemCard
                    key={prompt.id}
                    prompt={prompt}
                    onClick={onPromptSelect}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="font-medium mb-3">최근 사용</h3>
            {prompts.length === 0 ? (
              renderEmpty('최근 사용한 프롬프트가 없습니다')
            ) : (
              <div className="space-y-2">
                {prompts.map(prompt => (
                  <PromptItemCard
                    key={prompt.id}
                    prompt={prompt}
                    onClick={onPromptSelect}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* 프롬프트 추가 모달 */}
      <AddPromptToCollectionModal
        isOpen={isAddPromptModalOpen}
        onClose={() => setIsAddPromptModalOpen(false)}
        collectionId={selectedCollectionId}
        collectionName={getSelectedCollectionName()}
        existingPrompts={prompts}
        onPromptAdded={handlePromptAdded}
      />
    </div>
  );
};

export default PromptPanel;

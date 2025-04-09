import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import PromptItemCard from './PromptItemCard';
import { Plus } from 'lucide-react';
import { getCollections, createCollection, deleteCollection, addPromptToCollection, removePromptFromCollection, renameCollection, reorderCollections } from '../../api/collectionApi';
import { getCollectionPrompts, getSimilarPrompts, getRecentPrompts } from '../../api/collectionApi';
import AddPromptToCollectionModal from '../../modals/AddPromptToCollectionModal';
import CollectionsList from './CollectionsList';
import SimilarPromptsList from './SimilarPromptsList';
import RecentPromptsList from './RecentPromptsList';

// 버전 관리 탭 컴포넌트 추가
const VersionManagementList = ({ selectedPromptId, onPromptSelect }) => {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newVersionTitle, setNewVersionTitle] = useState('');
  
  // 현재 선택된 프롬프트 정보를 가져오기 위한 컨텍스트 접근
  const { selectedPrompt } = useAppContext();
  
  // 버전 데이터 로드 (실제는 선택된 프롬프트의 버전만 가져와야 함)
  useEffect(() => {
    const loadVersions = async () => {
      if (!selectedPromptId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // 임시 로직: 현재 직접적인 버전 API가 없으므로, 로컬 상태만 관리
        // 초기 로드 시 비워서 시작 (외부 프롬프트 연동하지 않음)
        setVersions([]);
        
        // 현재 선택된 프롬프트가 있으면 첫 요소로 추가
        // (실제로는 API에서 관리될 부분)
        if (selectedPrompt) {
          setVersions([{
            ...selectedPrompt,
            title: `${selectedPrompt.title} (현재 버전)`,
            is_current_version: true
          }]);
        }
      } catch (err) {
        console.error('버전 목록 로드 오류:', err);
        setError('버전 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVersions();
  }, [selectedPromptId, selectedPrompt]);
  
  // 새 버전 프롬프트 생성 핸들러
  const handleCreateNewVersion = async () => {
    if (!selectedPrompt) return;
    
    try {
      // 새 버전 생성을 위한 데이터 준비
      const newVersionData = {
        ...selectedPrompt,
        id: `version-${Date.now()}`, // 임시 ID 생성 (실제로는 서버에서 생성된 ID를 사용)
        title: newVersionTitle.trim() || `${selectedPrompt.title} (복제본)`,
        created_at: new Date().toISOString(),
        is_version: true, // 버전 플래그 추가
      };
      
      // 현재는 로컬 상태에만 추가 (실제로는 API 호출로 저장)
      setVersions(prev => [newVersionData, ...prev]);
      
      // 입력 필드 초기화
      setNewVersionTitle('');
      
    } catch (err) {
      console.error('새 버전 생성 오류:', err);
      alert('새 버전을 생성하는데 실패했습니다.');
    }
  };
  
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
      {/* 버전 생성 입력 영역 */}
      <div className="p-4 border-b flex items-center space-x-2">
        <input
          type="text"
          value={newVersionTitle}
          onChange={(e) => setNewVersionTitle(e.target.value)}
          placeholder="새 버전 제목 입력 (선택사항)"
          className="flex-1 p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={!selectedPromptId}
        />
        <button
          onClick={handleCreateNewVersion}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={!selectedPromptId}
        >
          복제 생성
        </button>
      </div>
      
      {/* 버전 목록 영역 */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : !selectedPromptId ? (
          renderEmpty('선택된 프롬프트가 없습니다')
        ) : versions.length === 0 ? (
          renderEmpty('관리 중인 버전이 없습니다')
        ) : (
          <div className="space-y-2">
            {versions.map(version => (
              <PromptItemCard
                key={version.id}
                prompt={version}
                onClick={onPromptSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PromptPanel = ({ 
  selectedPromptId = null, 
  onPromptSelect, 
  onClose
}) => {
  // 탭과 데이터 상태
  const [activeTab, setActiveTab] = useState('version');  // 기본 탭을 버전 관리로 변경
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
  const { 
    handleToggleFavorite, 
    handleEditPrompt, 
    handleRecordUsage, 
    collections: contextCollections, 
    selectedPrompt,
    openOverlayModal: openOverlayModalContext
  } = useAppContext();
  
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
  
  // 기본 탭을 설정하는 로직
  useEffect(() => {
    // 기본적으로 버전 관리 탭을 보여줌
    // 다른 탭으로 변경되는 로직은 제거
  }, []);
  
  // 탭 변경 시 데이터 로드
  useEffect(() => {
    switch (activeTab) {
      case 'version':
        // 버전 관리 탭은 컴포넌트 내부에서 데이터를 로드하므로 여기서는 처리하지 않음
        break;
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
  
  // 오버레이 모달 열기 함수
  const openOverlayModal = (prompt) => {
    // 이벤트 버블링 중지가 필요한 경우가 있어 래핑 함수를 통해 호출
    if (!prompt) return;
    
    // onPromptSelect 프롭이 제공된 경우 사용 (커스텀 처리를 위해)
    if (onPromptSelect && typeof onPromptSelect === 'function') {
      onPromptSelect(prompt);
    } else {
      // 기본 동작: 컨텍스트의 오버레이 모달 열기 함수 호출
      // 약간의 지연을 두어 이벤트 충돌 방지
      setTimeout(() => {
        handleOpenOverlayModal(prompt);
      }, 50);
    }
  };

  // 오버레이 모달 열기 핸들러 (컨텍스트 함수 호출)
  const handleOpenOverlayModal = (prompt) => {
    if (openOverlayModalContext && prompt) {
      openOverlayModalContext(prompt);
    }
  };
  
  // 탭 컨텐츠를 렌더링하는 함수
  const renderTabContent = () => {
    switch (activeTab) {
      case 'version':
        return (
          <VersionManagementList
            selectedPromptId={selectedPromptId}
            onPromptSelect={(prompt) => {
              // 이벤트 버블링을 방지하고 오버레이 모달을 열도록 수정
              if (prompt) {
                openOverlayModal(prompt);
              }
            }}
          />
        );
      case 'similar':
        return (
          <SimilarPromptsList 
            selectedPromptId={selectedPromptId}
            onPromptSelect={(prompt) => {
              // 이벤트 버블링을 방지하고 오버레이 모달을 열도록 수정
              if (prompt) {
                openOverlayModal(prompt);
              }
            }}
          />
        );
      case 'collections':
        return (
          <CollectionsList 
            selectedPromptId={selectedPromptId}
            onPromptSelect={(prompt) => {
              // 이벤트 버블링을 방지하고 오버레이 모달을 열도록 수정
              if (prompt) {
                openOverlayModal(prompt);
              }
            }}
          />
        );
      case 'recent':
        return (
          <RecentPromptsList 
            selectedPromptId={selectedPromptId}
            onPromptSelect={(prompt) => {
              // 이벤트 버블링을 방지하고 오버레이 모달을 열도록 수정
              if (prompt) {
                openOverlayModal(prompt);
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  const handleEscKey = async (event) => {
    if (event.key === 'Escape' && isAddPromptModalOpen) {
      event.stopPropagation(); // 이벤트 버블링 방지
      setIsAddPromptModalOpen(false);
    }
  };

  // 캡처링 단계에서 이벤트 처리
  document.addEventListener('keydown', handleEscKey, true);

  return (
    <div className="bg-white rounded-lg shadow-md h-full max-h-full flex flex-col overflow-hidden">
      {/* 탭 선택기와 닫기 버튼 */}
      <div className="flex border-b items-center">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'version' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('version')}
        >
          버전 관리
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'similar' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('similar')}
        >
          유사한 프롬프트
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'collections' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('collections')}
        >
          컬렉션
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'recent' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('recent')}
        >
          최근 사용
        </button>
        <div className="ml-auto mr-2">
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
      
      {/* 콜렉션 추가 프롬프트 모달 */}
      {isAddPromptModalOpen && selectedPromptId && (
        <AddPromptToCollectionModal
          promptId={selectedPromptId}
          onClose={() => setIsAddPromptModalOpen(false)}
          onPromptAdded={handlePromptAdded}
        />
      )}
    </div>
  );
};

export default PromptPanel;

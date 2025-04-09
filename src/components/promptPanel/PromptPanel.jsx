import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import PromptItemCard from './PromptItemCard';
import { Plus } from 'lucide-react';
import { getCollections, createCollection, deleteCollection, addPromptToCollection, removePromptFromCollection, renameCollection, reorderCollections } from '../../api/collectionApi';
import { getCollectionPrompts, getSimilarPrompts, getRecentPrompts } from '../../api/collectionApi';
import { getPromptVersions, createPromptVersion, updatePromptVersion, setAsLatestVersion, deletePromptVersion } from '../../api/versionApi';
import { getUserAddedPrompts, createUserAddedPrompt, updateUserAddedPrompt, deleteUserAddedPrompt } from '../../api/userPromptApi';
import AddPromptToCollectionModal from '../../modals/AddPromptToCollectionModal';
import CollectionsList from './CollectionsList';
import SimilarPromptsList from './SimilarPromptsList';
import RecentPromptsList from './RecentPromptsList';
import VersionDetailModal from '../../modals/VersionDetailModal';
import VersionEditModal from '../../modals/VersionEditModal';
import UserPromptEditModal from '../../modals/UserPromptEditModal';
import ImportPromptModal from '../../modals/ImportPromptModal';

// 버전 관리 탭 컴포넌트 추가
const VersionManagementList = ({ selectedPromptId, onPromptSelect }) => {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newVersionTitle, setNewVersionTitle] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 현재 선택된 프롬프트 정보를 가져오기 위한 컨텍스트 접근
  const { selectedPrompt, updatePromptItem } = useAppContext();
  
  // 버전 데이터 로드 (실제는 선택된 프롬프트의 버전만 가져와야 함)
  const loadVersions = async () => {
    if (!selectedPromptId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let versionsList = [];
      
      // 현재 선택된 프롬프트가 있으면
      if (selectedPrompt) {
        // 1. 현재 버전을 목록에 추가
        const currentVersion = {
          ...selectedPrompt,
          title: `${selectedPrompt.title} (현재 버전)`,
          is_current_version: true,
          parent_id: selectedPrompt.id // 부모 ID 추가
        };
        
        versionsList.push(currentVersion);
        
        // 2. DB에서 기존 버전 히스토리 가져오기
        try {
          const versionHistory = await getPromptVersions(selectedPrompt.id);
          
          // 버전 히스토리가 있으면 목록에 추가 (최신순 정렬)
          if (versionHistory && Array.isArray(versionHistory) && versionHistory.length > 0) {
            // 현재 버전을 제외하고 날짜순으로 정렬하여 추가
            const sortedVersions = versionHistory
              .filter(v => v.id !== selectedPrompt.id) // 현재 버전 제외
              .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)); // 최신순 정렬
            
            versionsList = [...versionsList, ...sortedVersions];
          }
        } catch (versionErr) {
          console.error('버전 히스토리 로드 오류:', versionErr);
          // 버전 히스토리 로드 실패 시에도 현재 버전은 표시
        }
      }
      
      setVersions(versionsList);
    } catch (err) {
      console.error('버전 목록 로드 오류:', err);
      setError('버전 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 새 버전 프롬프트 생성 핸들러
  const handleCreateNewVersion = async () => {
    if (!selectedPrompt) return;
    
    try {
      // 새 버전 생성을 위한 데이터 준비
      const newVersionData = {
        parent_id: selectedPrompt.id,
        title: newVersionTitle.trim() || `${selectedPrompt.title} (복제본)`,
        content: selectedPrompt.content,
        variables: selectedPrompt.variables || [],
        tags: selectedPrompt.tags || [],
        folder_id: selectedPrompt.folder_id,
        folder: selectedPrompt.folder,
        memo: selectedPrompt.memo || '',
        is_version: true,
        is_favorite: false,
        created_at: new Date().toISOString()
      };
      
      // API를 통해 새 버전 생성 및 저장
      const createdVersion = await createPromptVersion(newVersionData);
      
      // 응답 받은 버전을 목록에 추가
      setVersions(prev => [createdVersion, ...prev]);
      
      // 입력 필드 초기화
      setNewVersionTitle('');
      
    } catch (err) {
      console.error('새 버전 생성 오류:', err);
      alert('새 버전을 생성하는데 실패했습니다.');
    }
  };
  
  // 버전 삭제 핸들러
  const handleVersionDelete = async (prompt, e) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    
    if (!prompt || prompt.is_current_version) return;
    
    if (window.confirm(`정말로 "${prompt.title}" 버전을 삭제하시겠습니까?`)) {
      try {
        setIsDeleting(true);
        await deletePromptVersion(prompt.id);
        
        // 버전 목록에서 해당 버전 제거
        setVersions(prev => prev.filter(v => v.id !== prompt.id));
        
        // 상세 모달이나 편집 모달이 열려있고, 삭제한 버전과 같은 버전이면 모달 닫기
        if (isDetailModalOpen && editingPrompt && editingPrompt.id === prompt.id) {
          setIsDetailModalOpen(false);
          setEditingPrompt(null);
        }
        
        if (isEditModalOpen && editingPrompt && editingPrompt.id === prompt.id) {
          setIsEditModalOpen(false);
          setEditingPrompt(null);
        }
        
      } catch (error) {
        console.error('버전 삭제 오류:', error);
        alert('버전 삭제에 실패했습니다.');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  // 프롬프트 편집 핸들러 (버전 편집 모달 열기)
  const handleVersionEdit = (prompt) => {
    setEditingPrompt(prompt);
    setIsEditModalOpen(true);
    setIsDetailModalOpen(false); // 상세 모달이 열려있다면 닫기
  };
  
  // 버전 편집 모달 닫기
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPrompt(null);
  };
  
  // 버전 업데이트 핸들러
  const handleVersionUpdate = async (updatedPrompt) => {
    try {
      // API를 통해 버전 업데이트
      const updatedVersion = await updatePromptVersion(updatedPrompt.id, updatedPrompt);
      
      // 버전 목록에서 해당 프롬프트 업데이트
      setVersions(prev => 
        prev.map(version => 
          version.id === updatedVersion.id ? updatedVersion : version
        )
      );
    } catch (error) {
      console.error('버전 업데이트 오류:', error);
      alert('버전 업데이트에 실패했습니다.');
    }
  };
  
  // 최신 버전으로 등록 핸들러
  const handleSetAsLatest = async (updatedPrompt) => {
    if (!updatedPrompt || !updatedPrompt.parent_id) return;
    
    try {
      // 1. 부모 프롬프트 찾기
      const parentPrompt = selectedPrompt;
      
      if (!parentPrompt) {
        console.error('부모 프롬프트를 찾을 수 없습니다.');
        return;
      }
      
      // 2. 기존 부모 프롬프트의 스냅샷 생성 (히스토리에 보존)
      const parentSnapshotData = {
        parent_id: parentPrompt.id,
        title: `${parentPrompt.title} (이전 버전)`,
        content: parentPrompt.content,
        variables: parentPrompt.variables || [],
        tags: parentPrompt.tags || [],
        folder_id: parentPrompt.folder_id,
        folder: parentPrompt.folder,
        memo: parentPrompt.memo || '',
        is_version: true,
        is_history: true,
        is_favorite: false,
        created_at: parentPrompt.updated_at || parentPrompt.created_at,
        updated_at: new Date().toISOString()
      };
      
      // 3. API를 통해 스냅샷 저장 (중복 방지를 위해 히스토리 플래그 추가)
      await createPromptVersion(parentSnapshotData);
      
      // 4. 부모 프롬프트의 내용 업데이트
      const updatedParentPrompt = {
        ...parentPrompt,
        title: updatedPrompt.title,
        content: updatedPrompt.content,
        memo: updatedPrompt.memo || '',
        variables: updatedPrompt.variables || [],
        tags: updatedPrompt.tags || [],
        folder_id: updatedPrompt.folder_id,
        folder: updatedPrompt.folder,
        is_favorite: updatedPrompt.is_favorite !== undefined ? updatedPrompt.is_favorite : parentPrompt.is_favorite,
        updated_at: new Date().toISOString()
      };
      
      // 5. API를 통해 최신 버전으로 설정 (복제본 ID를 전달)
      await setAsLatestVersion(parentPrompt.id, updatedPrompt.id);
      
      // 6. AppContext를 통해 부모 프롬프트 업데이트
      updatePromptItem(parentPrompt.id, updatedParentPrompt);
      
      // 7. 버전 목록 새로 로드 (중복 방지를 위해 목록을 직접 조작하는 대신 다시 로드)
      const loadVersions = async () => {
        if (!selectedPromptId) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
          let versionsList = [];
          
          // 현재 선택된 프롬프트가 있으면
          if (selectedPrompt) {
            // 1. 현재 버전을 목록에 추가
            const currentVersion = {
              ...updatedParentPrompt,
              title: `${updatedParentPrompt.title} (현재 버전)`,
              is_current_version: true,
              parent_id: selectedPrompt.id // 부모 ID 추가
            };
            
            versionsList.push(currentVersion);
            
            // 2. DB에서 기존 버전 히스토리 가져오기
            try {
              const versionHistory = await getPromptVersions(selectedPrompt.id);
              
              // 버전 히스토리가 있으면 목록에 추가 (최신순 정렬)
              if (versionHistory && Array.isArray(versionHistory) && versionHistory.length > 0) {
                // 현재 버전을 제외하고 날짜순으로 정렬하여 추가
                const sortedVersions = versionHistory
                  .filter(v => v.id !== selectedPrompt.id && v.id !== updatedPrompt.id) // 현재 버전 및 복제본 제외
                  .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)); // 최신순 정렬
                
                versionsList = [...versionsList, ...sortedVersions];
              }
            } catch (versionErr) {
              console.error('버전 히스토리 로드 오류:', versionErr);
              // 버전 히스토리 로드 실패 시에도 현재 버전은 표시
            }
          }
          
          setVersions(versionsList);
        } catch (err) {
          console.error('버전 목록 로드 오류:', err);
          setError('버전 목록을 불러오는데 실패했습니다.');
        } finally {
          setIsLoading(false);
        }
      };
      
      await loadVersions();
      
      alert('최신 버전으로 등록되었습니다. 이전 버전이 히스토리에 저장되었습니다.');
    } catch (error) {
      console.error('최신 버전 등록 오류:', error);
      alert('최신 버전 등록에 실패했습니다.');
    }
  };
  
  // 카드 클릭 핸들러 (상세 모달 표시)
  const handleCardClick = (prompt) => {
    setEditingPrompt(prompt);
    setIsDetailModalOpen(true);
    setIsEditModalOpen(false); // 편집 모달이 열려있다면 닫기
  };
  
  // 버전 상세 모달 닫기
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setEditingPrompt(null);
  };
  
  // 버전 관리 탭 내에서 편집 버튼 클릭 시 호출될 핸들러
  const handleEditButtonClick = (prompt, e) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 중지
    handleVersionEdit(prompt);
  };
  
  // 프롬프트 카드용 커스텀 렌더링 함수 (버전 관리용 오버라이드)
  const renderPromptItemCard = (prompt) => {
    return (
      <PromptItemCard
        key={prompt.id}
        prompt={prompt}
        onClick={handleCardClick}
        customEditHandler={(e) => handleEditButtonClick(prompt, e)}
        customDeleteHandler={(e) => handleVersionDelete(prompt, e)}
        isVersionTab={true}
      />
    );
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
  
  // useEffect 추가 - 프롬프트가 변경되거나 컴포넌트 마운트될 때 버전 목록 로드
  useEffect(() => {
    loadVersions();
  }, [selectedPromptId, selectedPrompt]);
  
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
            {versions.map(version => renderPromptItemCard(version))}
          </div>
        )}
      </div>
      
      {/* 버전 상세 모달 */}
      {isDetailModalOpen && editingPrompt && (
        <VersionDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          prompt={editingPrompt}
        />
      )}
      
      {/* 버전 편집 모달 */}
      {isEditModalOpen && editingPrompt && (
        <VersionEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          prompt={editingPrompt}
          onUpdate={handleVersionUpdate}
          onSetAsLatest={handleSetAsLatest}
        />
      )}
    </div>
  );
};

// 사용자 추가 프롬프트 관리 컴포넌트
const UserAddedPromptsList = ({ selectedPromptId, onPromptSelect }) => {
  const [userPrompts, setUserPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // 현재 선택된 프롬프트 정보를 가져오기 위한 컨텍스트 접근
  const { selectedPrompt, updatePromptItem, openOverlayModal: contextOpenOverlayModal, userPromptUpdateTimestamp, setUserPromptUpdateTimestamp } = useAppContext();
  
  // 사용자 추가 프롬프트 데이터 로드
  const loadUserPrompts = useCallback(async () => {
    if (!selectedPromptId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // API를 통해 사용자 추가 프롬프트 목록 가져오기
      const response = await getUserAddedPrompts(selectedPromptId);
      setUserPrompts(response);
    } catch (err) {
      console.error('사용자 추가 프롬프트 로드 오류:', err);
      setError('사용자 추가 프롬프트를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPromptId]);
  
  // 새 사용자 프롬프트 생성 핸들러
  const handleCreateNewPrompt = async () => {
    if (!selectedPrompt) return;
    
    try {
      // 새 프롬프트 생성을 위한 데이터 준비
      const newPromptData = {
        parent_id: selectedPrompt.id,
        parent_title: selectedPrompt.title, // 부모 프롬프트 제목 추가
        title: newPromptTitle.trim() || `${selectedPrompt.title}의 사용자 추가 프롬프트`,
        content: "", // 기본 내용은 비워둡니다
        variables: [], // 기본 변수는 비워둡니다
        tags: [],
        is_user_added: true, // 사용자 추가 프롬프트 플래그
        created_at: new Date().toISOString()
      };
      
      // API를 통해 새 프롬프트 생성 및 저장
      const createdPrompt = await createUserAddedPrompt(newPromptData);
      
      // 응답 받은 프롬프트를 목록에 추가
      setUserPrompts(prev => [createdPrompt, ...prev]);
      
      // 입력 필드 초기화
      setNewPromptTitle('');
      
    } catch (err) {
      console.error('사용자 추가 프롬프트 생성 오류:', err);
      alert('사용자 추가 프롬프트를 생성하는데 실패했습니다.');
    }
  };
  
  // 프롬프트 삭제 핸들러
  const handlePromptDelete = async (prompt, e) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    
    if (!prompt) return;
    
    if (window.confirm(`정말로 "${prompt.title}" 프롬프트를 삭제하시겠습니까?`)) {
      try {
        setIsDeleting(true);
        
        // API를 통해 프롬프트 삭제
        await deleteUserAddedPrompt(prompt.id);
        
        // 프롬프트 목록에서 해당 프롬프트 제거
        setUserPrompts(prev => prev.filter(p => p.id !== prompt.id));
        
        // 편집 모달이 열려있고, 삭제한 프롬프트와 같은 프롬프트이면 모달 닫기
        if (isEditModalOpen && editingPrompt && editingPrompt.id === prompt.id) {
          setIsEditModalOpen(false);
          setEditingPrompt(null);
        }
        
      } catch (error) {
        console.error('프롬프트 삭제 오류:', error);
        alert('프롬프트 삭제에 실패했습니다.');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  // 프롬프트 업데이트 핸들러
  const handlePromptUpdate = useCallback(async (updatedPrompt) => {
    try {
      // API를 통해 프롬프트 업데이트
      const updatedData = await updateUserAddedPrompt(updatedPrompt.id, updatedPrompt);
      
      // 프롬프트 목록에서 해당 프롬프트 업데이트
      setUserPrompts(prev => 
        prev.map(prompt => 
          prompt.id === updatedData.id ? updatedData : prompt
        )
      );
    } catch (error) {
      console.error('프롬프트 업데이트 오류:', error);
      alert('프롬프트 업데이트에 실패했습니다.');
    }
  }, []);
  
  // 프롬프트 편집 핸들러
  const handlePromptEdit = useCallback((prompt, e) => {
    e.stopPropagation(); // 클릭 이벤트 버블링 방지
    setEditingPrompt(prompt);
    setIsEditModalOpen(true);
  }, []);
  
  // 카드 클릭 핸들러 (오버레이 모달 표시)
  const handleCardClick = useCallback((prompt) => {
    // 오버레이 모달을 열기 위해 onPromptSelect 콜백 사용
    if (onPromptSelect && prompt) {
      onPromptSelect(prompt);
    } else if (contextOpenOverlayModal && prompt) {
      // 콜백이 없는 경우 컨텍스트의 오버레이 모달 열기 함수 직접 호출
      contextOpenOverlayModal(prompt);
    }
  }, [onPromptSelect, contextOpenOverlayModal]);
  
  // 편집 모달 닫기
  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingPrompt(null);
  }, []);
  
  // 프롬프트 불러오기 핸들러 (모달 열기)
  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
  };

  // 프롬프트 불러오기 완료 핸들러 (모달 닫고 프롬프트 생성)
  const handleImportPrompt = async (importedPrompt) => {
    if (!selectedPromptId || !importedPrompt) return;
    
    try {
      // 1. 불러온 프롬프트 데이터 기반으로 새 사용자 프롬프트 데이터 준비
      const newPromptData = {
        parent_id: selectedPromptId, 
        parent_title: selectedPrompt?.title, // 현재 패널의 부모 정보 사용
        title: `${importedPrompt.title} (불러옴)`, // 제목 구분
        content: importedPrompt.content,
        variables: importedPrompt.variables || [],
        tags: importedPrompt.tags || [], // 태그도 가져올 수 있음 (선택사항)
        memo: importedPrompt.memo || '',
        is_user_added: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // 원본 ID 저장 (선택사항)
        // original_prompt_id: importedPrompt.id 
      };

      // 2. createUserAddedPrompt API 호출하여 저장
      await createUserAddedPrompt(newPromptData);

      // 3. 타임스탬프 업데이트하여 목록 새로고침
      setUserPromptUpdateTimestamp(Date.now());

      setIsImportModalOpen(false); // 모달 닫기
      
    } catch (err) {
      console.error('프롬프트 불러오기 오류:', err);
      alert('프롬프트를 불러오는 중 오류가 발생했습니다.');
      setIsImportModalOpen(false); // 오류 시에도 모달 닫기
    }
  };
  
  // 프롬프트 카드용 커스텀 렌더링 함수
  const renderPromptItemCard = useCallback((prompt) => {
    return (
      <PromptItemCard
        key={prompt.id}
        prompt={prompt}
        onClick={handleCardClick}
        customEditHandler={(e) => handlePromptEdit(prompt, e)}
        customDeleteHandler={(e) => handlePromptDelete(prompt, e)}
        isVersionTab={true} // 같은 아이콘 스타일 사용
      />
    );
  }, [handleCardClick, handlePromptEdit, handlePromptDelete]);
  
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
  
  // useEffect - 프롬프트가 변경되거나 컴포넌트 마운트될 때 프롬프트 목록 로드
  useEffect(() => {
    loadUserPrompts();
  }, [loadUserPrompts, userPromptUpdateTimestamp]);
  
  return (
    <div className="h-full flex flex-col">
      {/* 프롬프트 생성 입력 영역 */}
      <div className="p-4 border-b flex items-center space-x-2">
        <input
          type="text"
          value={newPromptTitle}
          onChange={(e) => setNewPromptTitle(e.target.value)}
          placeholder="새 프롬프트 제목 입력"
          className="flex-1 p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={!selectedPromptId}
        />
        <button
          onClick={handleCreateNewPrompt}
          className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          disabled={!selectedPromptId}
        >
          추가
        </button>
        {/* 불러오기 버튼 추가 */}
        <button
          onClick={handleOpenImportModal} 
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          disabled={!selectedPromptId} 
          title="기존 프롬프트 불러오기"
        >
          불러오기
        </button>
      </div>
      
      {/* 프롬프트 목록 영역 */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : !selectedPromptId ? (
          renderEmpty('선택된 프롬프트가 없습니다')
        ) : userPrompts.length === 0 ? (
          renderEmpty('추가된 사용자 프롬프트가 없습니다')
        ) : (
          <div className="space-y-2">
            {userPrompts.map(prompt => renderPromptItemCard(prompt))}
          </div>
        )}
      </div>
      
      {/* 편집 모달 */}
      {isEditModalOpen && editingPrompt && (
        <UserPromptEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          prompt={editingPrompt}
          onUpdate={handlePromptUpdate}
        />
      )}

      {/* 불러오기 모달 추가 */}
      {isImportModalOpen && (
        <ImportPromptModal 
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportPrompt} // 임포트 핸들러 전달
        />
      )}
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
      case 'user-added':
        // 사용자 추가 탭은 컴포넌트 내부에서 데이터를 로드하므로 여기서는 처리하지 않음
        break;
      case 'collections':
        if (selectedCollectionId) {
          loadCollectionPrompts(selectedCollectionId);
        } else {
          setPrompts([]);
        }
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
              // 버전 관리 탭에서는 onPromptSelect가 필요하지 않음
              // 카드 클릭 시 자체적으로 편집 모달을 표시
            }}
          />
        );
      case 'user-added':
        return (
          <UserAddedPromptsList
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
            activeTab === 'user-added' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('user-added')}
        >
          사용자 추가
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


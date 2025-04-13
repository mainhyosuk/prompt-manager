import React, { useEffect, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import PromptGrid from '../components/prompts/PromptGrid';
import PromptList from '../components/prompts/PromptList';
import { useAppContext } from '../context/AppContext';
import { useMultiSelect } from '../hooks/useMultiSelect';
import { Trash2, Folder } from 'lucide-react';
import FolderSelectModal from '../components/modals/FolderSelectModal';

const Dashboard = () => {
  const { 
    viewMode, 
    getFilteredPrompts, 
    selectedFolder,
    isLoading,
    error,
    loadData,
    handleViewPrompt,
    handleDeleteMultiplePrompts,
    handleMoveMultiplePrompts
  } = useAppContext();
  
  // 필터링된 프롬프트 목록 가져오기
  const filteredPrompts = getFilteredPrompts();
  
  // 다중 선택 모드 상태 추가
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Use the multi-select hook
  const {
    selectedIds,
    setSelectedIds,
    toggleSelection,
    deselectAll,
    hasSelections,
    allSelected,
    selectAll,
  } = useMultiSelect(filteredPrompts);

  // 폴더 선택 모달 상태 추가
  const [isFolderSelectModalOpen, setIsFolderSelectModalOpen] = useState(false);

  // Batch delete function
  const handleDeleteSelected = async () => {
    // 0개 선택 시 알림은 유지
    if (selectedIds.length === 0) {
      alert('삭제할 프롬프트를 선택해주세요.');
      return;
    }
    
    // AppContext의 handleDeleteMultiplePrompts 호출 (사용자 확인은 해당 함수 내에서 처리)
    try {
      await handleDeleteMultiplePrompts(selectedIds);
      // 성공 알림 (선택 사항 - handleDeleteMultiplePrompts 내부에서 처리하거나 여기서 추가)
      // alert('선택한 프롬프트가 삭제되었습니다.'); 
      setSelectedIds([]); // 삭제 후 로컬 선택 상태 초기화
    } catch (error) {
      // 오류 알림 (선택 사항 - handleDeleteMultiplePrompts 내부에서 에러 상태 설정)
      console.error('벌크 삭제 처리 중 오류 발생:', error);
      // alert('프롬프트 삭제 중 오류가 발생했습니다.');
    }
    
    // 기존 console.log 및 alert 제거
    // if (window.confirm(...)) { ... }
  };

  // Move function
  const handleMoveSelected = () => {
    // 0개 선택 시 알림
    if (selectedIds.length === 0) {
      alert('이동할 프롬프트를 선택해주세요.');
      return;
    }
    // 폴더 선택 모달 열기
    setIsFolderSelectModalOpen(true);
    // 기존 console.log 및 alert 제거
  };

  // 폴더 선택 완료 핸들러
  const handleFolderSelectConfirm = async (targetFolderId) => {
    try {
      await handleMoveMultiplePrompts(selectedIds, targetFolderId);
      // 성공 알림 (선택 사항)
      alert('선택한 프롬프트를 지정된 폴더로 이동했습니다.');
      setSelectedIds([]); // 선택 초기화
      setIsMultiSelectMode(false); // 다중 선택 모드 종료
    } catch (error) {
      // 오류 알림 (선택 사항)
      console.error('폴더 이동 처리 중 오류:', error);
      alert('프롬프트 이동 중 오류가 발생했습니다.');
    }
    // 모달은 FolderSelectModal 내부에서 닫힘
  };

  // 처음 마운트될 때 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 다중 선택 모드 해제 시 선택 초기화
  useEffect(() => {
    if (!isMultiSelectMode) {
      deselectAll();
    }
  }, [isMultiSelectMode, deselectAll]);
  
  // 로딩 상태 표시
  if (isLoading && !filteredPrompts.length) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }
  
  // 오류 메시지 표시
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }
  
  // 전체 선택 토글 로직은 useMultiSelect 훅에서 가져온 allSelected 상태를 사용해야 함
  const handleSelectAllToggle = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }

  // 다중 선택 모드 토글 함수
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(prev => !prev);
  };

  // 다중 선택 모드 취소 함수 (액션바의 취소 버튼용)
  const cancelMultiSelectMode = () => {
    setIsMultiSelectMode(false);
    // deselectAll은 isMultiSelectMode 변경 useEffect에서 처리
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 좌측 사이드바 */}
      <Sidebar />
      
      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 상단 헤더 */}
        <Header />
        
        {/* 프롬프트 목록 영역 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-between items-center mb-4 h-10">
            <h1 className="text-2xl font-bold truncate">{selectedFolder}</h1>
            {/* 다중 선택 버튼 또는 빈 공간 */}
            {!isMultiSelectMode ? (
              <button
                onClick={toggleMultiSelectMode}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                다중 선택
              </button>
            ) : (
              // 다중 선택 모드일 때 버튼 대신 같은 높이의 빈 공간 유지 (또는 다른 UI)
              <div className="w-24 h-10"></div> // 버튼 크기에 맞춰 조정
            )}
          </div>

          {/* Multi-Select Action Bar */}
          {isMultiSelectMode && (
            <div className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm mb-4 p-3 border rounded-lg shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* 전체 선택 체크박스 */}
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAllToggle}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  id="select-all-checkbox"
                />
                {/* 체크박스 레이블 추가 */}
                <label 
                  htmlFor="select-all-checkbox" 
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  {allSelected ? '전체 해제' : '전체 선택'}
                </label>
                {/* 선택된 개수 표시 텍스트 */}
                <span className="text-sm font-medium text-gray-700 ml-2">
                  ({selectedIds.length}개 선택됨)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 rounded-md transition"
                  title="선택 삭제"
                >
                  <Trash2 size={16} className="mr-1" />
                  삭제
                </button>
                <button
                  onClick={handleMoveSelected}
                  className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-md transition"
                  title="선택한 항목 폴더 이동"
                >
                  <Folder size={16} className="mr-1" />
                  폴더 이동
                </button>
                <button
                  onClick={cancelMultiSelectMode}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition ml-2"
                  title="다중 선택 취소"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {viewMode === 'grid' ? (
            <PromptGrid
              prompts={filteredPrompts}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              onCardClick={handleViewPrompt}
              isMultiSelectMode={isMultiSelectMode}
            />
          ) : (
            <PromptList
              prompts={filteredPrompts}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
              onCardClick={handleViewPrompt}
              isMultiSelectMode={isMultiSelectMode}
            />
          )}
        </div>
      </div>
      
      {/* 폴더 선택 모달 렌더링 */}
      <FolderSelectModal 
        isOpen={isFolderSelectModalOpen}
        onClose={() => setIsFolderSelectModalOpen(false)}
        onFolderSelect={handleFolderSelectConfirm}
      />
    </div>
  );
};

export default Dashboard;
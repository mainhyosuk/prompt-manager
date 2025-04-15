import React, { useEffect, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { useAppContext } from '../context/AppContext';
import { useMultiSelect } from '../hooks/useMultiSelect';
import { RotateCcw, Trash2 } from 'lucide-react';
import { getTrashedPrompts, restorePrompt, permanentDeletePrompt } from '../api/trashApi';

// 휴지통 페이지 컴포넌트
const TrashPage = () => {
  const { 
    viewMode, 
    isLoading,
    error,
    loadData
  } = useAppContext();
  
  // 삭제된 프롬프트 목록 상태
  const [trashedPrompts, setTrashedPrompts] = useState([]);
  const [isLoadingTrash, setIsLoadingTrash] = useState(true);
  const [trashError, setTrashError] = useState(null);

  // 다중 선택 모드 상태
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // 다중 선택 훅 사용
  const {
    selectedIds,
    setSelectedIds,
    toggleSelection,
    deselectAll,
    hasSelections,
    allSelected,
    selectAll,
  } = useMultiSelect(trashedPrompts);

  // 휴지통 데이터 로드 함수
  const loadTrashData = async () => {
    setIsLoadingTrash(true);
    setTrashError(null);
    
    try {
      const data = await getTrashedPrompts();
      setTrashedPrompts(data);
    } catch (error) {
      console.error('휴지통 데이터 로드 오류:', error);
      setTrashError('휴지통 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingTrash(false);
    }
  };

  // 복구 함수
  const handleRestore = async (promptId) => {
    try {
      await restorePrompt(promptId);
      // 목록에서 해당 항목 제거
      setTrashedPrompts(prev => prev.filter(p => p.id !== promptId));
      alert('프롬프트가 복구되었습니다. 기본 폴더에서 확인하세요.');
    } catch (error) {
      console.error('프롬프트 복구 오류:', error);
      alert('프롬프트 복구 중 오류가 발생했습니다.');
    }
  };

  // 영구 삭제 함수
  const handlePermanentDelete = async (promptId) => {
    if (!window.confirm('이 프롬프트를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    try {
      await permanentDeletePrompt(promptId);
      // 목록에서 해당 항목 제거
      setTrashedPrompts(prev => prev.filter(p => p.id !== promptId));
      alert('프롬프트가 영구적으로 삭제되었습니다.');
    } catch (error) {
      console.error('프롬프트 영구 삭제 오류:', error);
      alert('프롬프트 영구 삭제 중 오류가 발생했습니다.');
    }
  };

  // 선택한 항목 일괄 복구
  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) {
      alert('복구할 프롬프트를 선택해주세요.');
      return;
    }
    
    try {
      // 선택된 모든 프롬프트에 대해 복구 API 호출
      await Promise.all(
        selectedIds.map(id => restorePrompt(id))
      );
      
      // 목록에서 복구된 항목 제거
      setTrashedPrompts(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      alert('선택한 프롬프트가 복구되었습니다. 기본 폴더에서 확인하세요.');
    } catch (error) {
      console.error('일괄 복구 오류:', error);
      alert('일부 프롬프트 복구 중 오류가 발생했습니다.');
    }
  };

  // 선택한 항목 일괄 영구 삭제
  const handlePermanentDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 프롬프트를 선택해주세요.');
      return;
    }
    
    if (!window.confirm(`선택한 ${selectedIds.length}개 프롬프트를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    
    try {
      // 선택된 모든 프롬프트에 대해 영구 삭제 API 호출
      await Promise.all(
        selectedIds.map(id => permanentDeletePrompt(id))
      );
      
      // 목록에서 삭제된 항목 제거
      setTrashedPrompts(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      alert('선택한 프롬프트가 영구적으로 삭제되었습니다.');
    } catch (error) {
      console.error('일괄 영구 삭제 오류:', error);
      alert('일부 프롬프트 삭제 중 오류가 발생했습니다.');
    }
  };

  // 전체 선택 토글
  const handleSelectAllToggle = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  // 다중 선택 모드 토글
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(prev => !prev);
  };

  // 다중 선택 모드 취소
  const cancelMultiSelectMode = () => {
    setIsMultiSelectMode(false);
  };

  // 처음 마운트될 때 휴지통 데이터 로드
  useEffect(() => {
    loadTrashData();
  }, []);

  // 다중 선택 모드 해제 시 선택 초기화
  useEffect(() => {
    if (!isMultiSelectMode) {
      deselectAll();
    }
  }, [isMultiSelectMode, deselectAll]);

  // 로딩 상태 표시
  if (isLoadingTrash) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">휴지통 데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }
  
  // 오류 메시지 표시
  if (trashError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{trashError}</p>
          <button 
            onClick={loadTrashData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }
  
  // 목록이 비어있을 때 메시지
  const EmptyTrashMessage = () => (
    <div className="flex flex-col items-center justify-center mt-16 p-6 bg-white rounded-lg shadow-sm border">
      <Trash2 size={48} className="text-gray-400 mb-4" />
      <h3 className="text-xl font-medium text-gray-700 mb-2">휴지통이 비어 있습니다</h3>
      <p className="text-gray-500 text-center mb-4">삭제된 프롬프트가 이곳에 표시됩니다.</p>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* 좌측 사이드바 */}
      <Sidebar />
      
      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 상단 헤더 */}
        <Header />
        
        {/* 휴지통 목록 영역 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-between items-center mb-4 h-10">
            <h1 className="text-2xl font-bold truncate dark:text-gray-200">휴지통</h1>
            {/* 다중 선택 버튼 */}
            {!isMultiSelectMode ? (
              <button
                onClick={toggleMultiSelectMode}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                다중 선택
              </button>
            ) : (
              <div className="w-24 h-10"></div>
            )}
          </div>

          {/* 다중 선택 액션 바 */}
          {isMultiSelectMode && (
            <div className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm mb-4 p-3 border rounded-lg shadow-sm flex items-center justify-between dark:bg-gray-800/90 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {/* 전체 선택 체크박스 */}
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAllToggle}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  id="select-all-checkbox"
                />
                <label htmlFor="select-all-checkbox" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  전체 선택 ({selectedIds.length}/{trashedPrompts.length})
                </label>
              </div>
              
              <div className="flex gap-2">
                {/* 복구 버튼 */}
                <button
                  onClick={handleRestoreSelected}
                  disabled={!hasSelections}
                  className={`flex items-center px-3 py-1.5 text-sm rounded-lg ${
                    hasSelections 
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' 
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                  }`}
                >
                  <RotateCcw size={16} className="mr-1" />
                  복구
                </button>
                
                {/* 영구 삭제 버튼 */}
                <button
                  onClick={handlePermanentDeleteSelected}
                  disabled={!hasSelections}
                  className={`flex items-center px-3 py-1.5 text-sm rounded-lg ${
                    hasSelections 
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50' 
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                  }`}
                >
                  <Trash2 size={16} className="mr-1" />
                  영구 삭제
                </button>
                
                {/* 취소 버튼 */}
                <button
                  onClick={cancelMultiSelectMode}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  취소
                </button>
              </div>
            </div>
          )}
          
          {/* 휴지통이 비어있을 때 메시지 */}
          {trashedPrompts.length === 0 ? (
            <EmptyTrashMessage />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {trashedPrompts.map(prompt => (
                <div 
                  key={prompt.id}
                  className={`relative bg-white rounded-lg border p-4 hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700 ${
                    isMultiSelectMode && selectedIds.includes(prompt.id) 
                      ? 'ring-2 ring-blue-500 border-blue-500' 
                      : ''
                  }`}
                  onClick={() => isMultiSelectMode && toggleSelection(prompt.id)}
                >
                  {/* 체크박스 (다중 선택 모드일 때) */}
                  {isMultiSelectMode && (
                    <div className="absolute top-3 right-3 z-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(prompt.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelection(prompt.id);
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  )}
                  
                  {/* 프롬프트 내용 */}
                  <h3 className="text-lg font-medium mb-2 pr-7 truncate dark:text-gray-200">{prompt.title}</h3>
                  <p className="text-gray-500 text-sm mb-3 dark:text-gray-400">
                    삭제일: {new Date(prompt.deletedAt).toLocaleDateString()}
                  </p>
                  <p className="text-gray-700 mb-4 line-clamp-3 text-sm dark:text-gray-300">
                    {prompt.content}
                  </p>
                  
                  {/* 액션 버튼 (다중 선택 모드가 아닐 때) */}
                  {!isMultiSelectMode && (
                    <div className="flex justify-end mt-2 space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(prompt.id);
                        }}
                        className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                      >
                        복구
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePermanentDelete(prompt.id);
                        }}
                        className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                      >
                        영구 삭제
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrashPage; 
import React, { useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import PromptGrid from '../components/prompts/PromptGrid';
import PromptList from '../components/prompts/PromptList';
import { useAppContext } from '../context/AppContext';

const Dashboard = () => {
  const { 
    viewMode, 
    getFilteredPrompts, 
    selectedFolder,
    isLoading,
    error,
    loadData
  } = useAppContext();
  
  // 필터링된 프롬프트 목록 가져오기
  const filteredPrompts = getFilteredPrompts();
  
  // 처음 마운트될 때 데이터 로드
  useEffect(() => {
    loadData();
  }, [loadData]);
  
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
          <h1 className="text-2xl font-bold mb-4 truncate">{selectedFolder}</h1>
          
          {viewMode === 'grid' ? (
            <PromptGrid prompts={filteredPrompts} />
          ) : (
            <PromptList prompts={filteredPrompts} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
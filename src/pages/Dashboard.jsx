import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import PromptGrid from '../components/prompts/PromptGrid';
import PromptList from '../components/prompts/PromptList';
import { useAppContext } from '../context/AppContext';

const Dashboard = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFolder, setSelectedFolder] = useState('모든 프롬프트');
  const { prompts } = useAppContext();
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 좌측 사이드바 */}
      <Sidebar 
        selectedFolder={selectedFolder} 
        setSelectedFolder={setSelectedFolder} 
      />
      
      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <Header 
          viewMode={viewMode} 
          setViewMode={setViewMode} 
        />
        
        {/* 프롬프트 목록 영역 */}
        <div className="flex-1 overflow-auto p-6">
          <h1 className="text-2xl font-bold mb-4">{selectedFolder}</h1>
          
          {viewMode === 'grid' ? (
            <PromptGrid prompts={prompts} />
          ) : (
            <PromptList prompts={prompts} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import TrashPage from './pages/TrashPage';
import PromptAddEditModal from './modals/PromptAddEditModal';
import PromptDetailModal from './modals/PromptDetailModal';
import { useAppContext } from './context/AppContext';

const App = () => {
  const { 
    isAddEditModalOpen,
    isDetailModalOpen
  } = useAppContext();

  return (
    <div className="h-screen">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* 모달은 라우트 외부에 위치시켜 모든 페이지에서 표시되도록 함 */}
      {isAddEditModalOpen && <PromptAddEditModal />}
      {isDetailModalOpen && <PromptDetailModal />}
    </div>
  );
};

export default App;
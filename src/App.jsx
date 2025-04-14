import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import PromptAddEditModal from './modals/PromptAddEditModal';
import PromptDetailModal from './modals/PromptDetailModal';
import { useAppContext } from './context/AppContext';

const App = () => {
  const { 
    currentScreen, 
    isAddEditModalOpen,
    isDetailModalOpen,
    selectedPrompt
  } = useAppContext();

  return (
    <div className="h-screen">
      {currentScreen === 'main' && (
        <>
          <Dashboard />
          
          {isAddEditModalOpen && (
            <PromptAddEditModal />
          )}
          
          {isDetailModalOpen && (
            <PromptDetailModal />
          )}
        </>
      )}
      
      {currentScreen === 'settings' && (
        <Settings />
      )}
    </div>
  );
};

export default App;
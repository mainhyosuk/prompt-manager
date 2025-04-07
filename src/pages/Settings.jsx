import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Settings = () => {
  const { goToDashboard } = useAppContext();
  
  return (
    <div className="bg-white min-h-screen">
      {/* 헤더 */}
      <header className="bg-blue-600 text-white px-6 py-4 flex items-center">
        <button 
          onClick={goToDashboard}
          className="mr-4 hover:bg-blue-700 p-1 rounded"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">설정</h1>
      </header>
      
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">설정 페이지</h2>
        <p>이곳에 설정 내용이 표시됩니다.</p>
      </div>
    </div>
  );
};

export default Settings;
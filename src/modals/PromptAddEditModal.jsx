import React from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const PromptAddEditModal = () => {
  const { 
    editMode, 
    selectedPrompt, 
    setIsAddEditModalOpen 
  } = useAppContext();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-3/4 max-w-4xl max-h-screen flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-semibold">
            {editMode ? '프롬프트 편집' : '새 프롬프트 추가'}
          </h2>
          <button 
            onClick={() => setIsAddEditModalOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* 모달 콘텐츠 */}
        <div className="flex-1 p-6 overflow-y-auto">
          <p>프롬프트 추가/편집 모달 콘텐츠가 여기에 표시됩니다.</p>
        </div>
        
        {/* 모달 푸터 */}
        <div className="flex justify-end border-t px-6 py-4 space-x-2">
          <button
            onClick={() => setIsAddEditModalOpen(false)}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptAddEditModal;
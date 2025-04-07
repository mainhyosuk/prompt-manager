import React from 'react';
import { X, Edit, Star } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const PromptDetailModal = () => {
  const { 
    selectedPrompt, 
    setIsDetailModalOpen,
    handleEditPrompt
  } = useAppContext();
  
  if (!selectedPrompt) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-3/4 max-w-4xl max-h-screen flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-semibold">{selectedPrompt.title}</h2>
          <div className="flex items-center space-x-2">
            <button 
              className="text-gray-400 hover:text-yellow-500"
              title="즐겨찾기에 추가/제거"
            >
              <Star size={20} className={selectedPrompt.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''} />
            </button>
            <button 
              onClick={() => handleEditPrompt(selectedPrompt)}
              className="text-gray-400 hover:text-blue-600"
              title="편집"
            >
              <Edit size={20} />
            </button>
            <button 
              onClick={() => setIsDetailModalOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              title="닫기"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* 모달 콘텐츠 */}
        <div className="flex-1 p-6 overflow-y-auto">
          <p>프롬프트 상세보기 모달 콘텐츠가 여기에 표시됩니다.</p>
        </div>
        
        {/* 모달 푸터 */}
        <div className="flex justify-end border-t px-6 py-4 space-x-2">
          <button
            onClick={() => setIsDetailModalOpen(false)}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptDetailModal;
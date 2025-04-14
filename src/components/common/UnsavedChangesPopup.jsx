import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const UnsavedChangesPopup = ({ isOpen, onCancel, onDiscard, onSaveAndClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100]" // 높은 z-index 설정
      // 배경 클릭 방지 (팝업 내부에서만 상호작용)
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <AlertTriangle className="text-yellow-500 mr-2" size={20} />
            <h2 className="text-lg font-semibold">변경사항 확인</h2>
          </div>
          <button 
            onClick={onCancel} // X 버튼은 취소와 동일하게 동작
            className="text-gray-400 hover:text-gray-600"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 본문 */}
        <p className="text-gray-600 mb-6">
          수정사항이 저장되지 않았습니다. 정말로 종료하시겠습니까?
        </p>

        {/* 버튼 영역 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            취소
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2 border rounded-md text-red-600 border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            종료 (저장 안 함)
          </button>
          <button
            onClick={onSaveAndClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            변경사항 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesPopup; 
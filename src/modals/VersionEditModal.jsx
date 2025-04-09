import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

const VersionEditModal = ({ isOpen, onClose, prompt, onUpdate, onSetAsLatest }) => {
  const { updatePromptItem } = useAppContext();
  
  // 편집 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [memo, setMemo] = useState('');
  
  // 모달 참조
  const modalRef = useRef(null);
  
  // 초기 데이터 로드
  useEffect(() => {
    if (isOpen && prompt) {
      setTitle(prompt.title || '');
      setContent(prompt.content || '');
      setMemo(prompt.memo || '');
    } else {
      // 모달이 닫히거나 prompt가 없는 경우 상태 초기화
      setTitle('');
      setContent('');
      setMemo('');
    }
  }, [isOpen, prompt]);
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target)) {
        event.stopPropagation();
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick, true);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
    };
  }, [isOpen, onClose]);

  // ESC 키 입력 감지
  useEffect(() => {
    const handleEscKey = (event) => {
      if (isOpen && event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey, true);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isOpen, onClose]);
  
  // 메모 변경 핸들러
  const handleMemoChange = (e) => {
    setMemo(e.target.value);
  };
  
  // 취소 핸들러
  const handleCancel = () => {
    onClose();
  };
  
  // 업데이트 핸들러
  const handleUpdate = async () => {
    if (!prompt) return;
    
    try {
      // 수정된 데이터
      const updatedPrompt = {
        ...prompt,
        title,
        content,
        memo,
        updated_at: new Date().toISOString()
      };
      
      // 현재 버전인 경우 (부모 프롬프트)
      if (prompt.is_current_version) {
        // 현재 버전(부모 프롬프트)은 일반 updatePromptItem을 사용하여 직접 업데이트
        // 원본 prompt.id를 사용하여 업데이트 (parent_id가 아닌 실제 id 사용)
        const realPromptId = prompt.parent_id === prompt.id ? prompt.id : prompt.parent_id;
        updatePromptItem(realPromptId, {
          ...updatedPrompt,
          id: realPromptId // ID를 명시적으로 설정
        });
        alert('현재 버전이 업데이트되었습니다.');
      } else {
        // 버전 프롬프트는 API를 통해 업데이트
        // 업데이트 콜백 호출
        if (onUpdate) {
          await onUpdate(updatedPrompt);
        }
        alert('버전이 업데이트되었습니다.');
      }
      
      // 모달 닫기
      onClose();
    } catch (error) {
      console.error('업데이트 오류:', error);
      alert('업데이트에 실패했습니다.');
    }
  };
  
  // 최신 버전 등록 핸들러
  const handleSetAsLatest = () => {
    if (!prompt) return;
    
    // 이미 현재 버전인 경우는 처리하지 않음
    if (prompt.is_current_version) {
      alert('이미 현재 버전입니다.');
      return;
    }
    
    // 수정된 데이터
    const updatedPrompt = {
      ...prompt,
      title,
      content,
      memo,
      updated_at: new Date().toISOString()
    };
    
    // 최신 버전 등록 콜백 호출
    if (onSetAsLatest) {
      onSetAsLatest(updatedPrompt);
    }
    
    // 모달 닫기
    onClose();
  };
  
  if (!isOpen || !prompt) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef} 
        className="bg-white rounded-lg shadow-xl w-10/12 max-w-5xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-5 py-3 flex-shrink-0">
          <h2 className="text-lg font-semibold">
            프롬프트 편집 {prompt.is_current_version && <span className="text-blue-500 text-sm">(현재 버전)</span>}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="닫기"
          >
            <span>✕</span>
          </button>
        </div>
        
        {/* 모달 콘텐츠 - 스크롤 가능한 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* 제목 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="프롬프트 제목"
              />
            </div>
            
            {/* 내용 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                내용
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="프롬프트 내용"
                rows={15}
              />
            </div>
            
            {/* 메모 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                메모
              </label>
              <textarea
                value={memo}
                onChange={handleMemoChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="메모"
                rows={3}
              />
            </div>
          </div>
        </div>
        
        {/* 버튼 영역 */}
        <div className="border-t p-4 flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            업데이트
          </button>
          <button
            onClick={handleSetAsLatest}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            최신 버전 등록
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionEditModal; 
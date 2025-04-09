import React, { useState, useRef, useEffect } from 'react';
import { FolderPlus, X, Plus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import FolderTree from '../folders/FolderTree';
import TagList from '../tags/TagList';

// 사이드바 설정 관련 상수
const SIDEBAR_WIDTH_KEY = 'prompt-manager-sidebar-width';
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;

const Sidebar = () => {
  const {
    tags,
    isLoading,
    loadData,
    folders,
    isFolderModalOpen,
    openFolderModal,
    closeFolderModal,
    handleCreateFolder,
    newFolderName,
    setNewFolderName,
    parentFolderId,
    setParentFolderId,
    folderError,
    setFolderError
  } = useAppContext();
  const [width, setWidth] = useState(() => {
    // 로컬 스토리지에서 너비 불러오기
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return savedWidth ? parseInt(savedWidth, 10) : DEFAULT_WIDTH;
  });
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef(null);
  const modalRef = useRef(null);
  const nameInputRef = useRef(null);
  
  // 마우스 드래그 이벤트 핸들러
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    // 드래그 중일 때 텍스트 선택 방지
    document.body.classList.add('select-none');
  };
  
  // 마우스 이동 이벤트 처리
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      // 최소, 최대 너비 제한
      const newWidth = Math.max(MIN_WIDTH, Math.min(e.clientX, MAX_WIDTH));
      setWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      // 드래그 종료 시 텍스트 선택 방지 제거
      document.body.classList.remove('select-none');
      
      // 로컬 스토리지에 너비 저장
      localStorage.setItem(SIDEBAR_WIDTH_KEY, width.toString());
    };
    
    // 이벤트 리스너 등록
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // 드래그 중 커서 스타일 변경
      document.body.style.cursor = 'ew-resize';
    }
    
    // 이벤트 리스너 정리
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // 커서 스타일 초기화
      if (isDragging) {
        document.body.style.cursor = '';
      }
    };
  }, [isDragging, width]);
  
  // 너비가 변경될 때마다 로컬 스토리지 업데이트
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, width.toString());
    }
  }, [width, isDragging]);
  
  // 외부 클릭 감지 (모달 닫기)
  useEffect(() => {
    if (!isFolderModalOpen) return;
    
    const handleOutsideClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeFolderModal();
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isFolderModalOpen, closeFolderModal]);

  // ESC 키 입력 감지 (모달 닫기)
  useEffect(() => {
    if (!isFolderModalOpen) return;
    
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        closeFolderModal();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isFolderModalOpen, closeFolderModal]);
  
  // 모달 열릴 때 이름 입력란에 포커스
  useEffect(() => {
    if (isFolderModalOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isFolderModalOpen]);
  
  // 키 입력 이벤트 핸들러 (Enter 키로 폴더 생성, 한글 입력 문제 해결)
  const handleKeyDown = (e) => {
    // 한글 입력 중에는 Enter 키 무시 (IME composition)
    if (e.nativeEvent.isComposing) return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateFolder(); // AppContext의 함수 호출
    }
  };
  
  // 폴더 생성 모달 렌더링
  const renderFolderModal = () => {
    if (!isFolderModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div 
          ref={modalRef} 
          className="bg-white rounded-lg shadow-xl w-80 p-4 dark:bg-gray-800"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold dark:text-gray-200">새 폴더 만들기</h3>
            <button 
              onClick={closeFolderModal} // AppContext의 함수 호출
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              폴더 이름
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)} // AppContext의 상태 업데이트
              onKeyDown={handleKeyDown} // 수정된 핸들러 사용
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="폴더 이름을 입력하세요"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              상위 폴더
            </label>
            <select
              value={parentFolderId || ''}
              onChange={(e) => setParentFolderId(e.target.value ? Number(e.target.value) : null)} // AppContext의 상태 업데이트
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="" className="dark:text-gray-400">최상위 폴더</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id} className="dark:text-white">
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          
          {folderError && (
            <div className="mb-4 text-sm text-red-600 dark:text-red-400">
              {folderError}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={closeFolderModal} // AppContext의 함수 호출
              className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
            >
              취소
            </button>
            <button
              onClick={handleCreateFolder} // AppContext의 함수 호출
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              생성
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div 
      ref={sidebarRef}
      className="relative bg-white border-r p-4 overflow-y-auto dark:bg-gray-800 dark:border-gray-700"
      style={{ width: `${width}px` }}
    >
      <h2 className="text-xl font-bold mb-4 dark:text-gray-200">프롬프트 관리</h2>
      
      {/* 폴더 섹션 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">폴더</h3>
          <button 
            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            onClick={() => openFolderModal()} // AppContext의 함수 호출, 최상위 폴더 생성
            title="새 폴더 만들기"
          >
            <FolderPlus size={16} />
          </button>
        </div>
        <FolderTree />
      </div>
      
      {/* 태그 섹션 */}
      <div>
        <h3 className="font-medium text-gray-700 mb-2 dark:text-gray-300">태그</h3>
        {isLoading && tags.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            태그 정보를 불러오는 중...
          </div>
        ) : (
          <TagList tags={tags} />
        )}
      </div>
      
      {/* 크기 조절 핸들 */}
      <div 
        className={`absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-gray-300 transition-colors dark:hover:bg-gray-600
          ${isDragging ? 'bg-blue-500 dark:bg-blue-400' : 'bg-transparent'}`}
        onMouseDown={handleMouseDown}
        title="사이드바 크기 조절"
      />
      
      {/* 폴더 생성 모달 */}
      {renderFolderModal()}
    </div>
  );
};

export default Sidebar;
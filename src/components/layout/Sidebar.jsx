import React, { useState, useRef, useEffect } from 'react';
import { FolderPlus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import FolderTree from '../folders/FolderTree';
import TagList from '../tags/TagList';

// 사이드바 설정 관련 상수
const SIDEBAR_WIDTH_KEY = 'prompt-manager-sidebar-width';
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;

const Sidebar = () => {
  const { tags, isLoading } = useAppContext();
  const [width, setWidth] = useState(() => {
    // 로컬 스토리지에서 너비 불러오기
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return savedWidth ? parseInt(savedWidth, 10) : DEFAULT_WIDTH;
  });
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef(null);
  
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
  
  return (
    <div 
      ref={sidebarRef}
      className="relative bg-white border-r p-4 overflow-y-auto"
      style={{ width: `${width}px` }}
    >
      <h2 className="text-xl font-bold mb-4">프롬프트 관리</h2>
      
      {/* 폴더 섹션 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-gray-700">폴더</h3>
          <button className="text-gray-500 hover:text-blue-600">
            <FolderPlus size={16} />
          </button>
        </div>
        <FolderTree />
      </div>
      
      {/* 태그 섹션 */}
      <div>
        <h3 className="font-medium text-gray-700 mb-2">태그</h3>
        {isLoading && tags.length === 0 ? (
          <div className="text-sm text-gray-500">
            태그 정보를 불러오는 중...
          </div>
        ) : (
          <TagList tags={tags} />
        )}
      </div>
      
      {/* 크기 조절 핸들 */}
      <div 
        className={`absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-gray-300 transition-colors
          ${isDragging ? 'bg-blue-500' : 'bg-transparent'}`}
        onMouseDown={handleMouseDown}
        title="사이드바 크기 조절"
      />
    </div>
  );
};

export default Sidebar;
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Star, Folder, FolderOpen, Package, Edit, Trash2, ArrowUp, ArrowDown, FilePlus, FolderPlus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { updateFolder, deleteFolder, reorderFolder } from '../../api/folderApi';
import { useNavigate } from 'react-router-dom';

// 쓰로틀링 함수 추가
const throttle = (func, delay) => {
  let lastCall = 0;
  return function(...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return func(...args);
  };
};

// 폴더 계층 구조에서 특정 폴더가 다른 폴더의 하위 폴더인지 확인하는 함수
const isDescendant = (folder, targetId) => {
  // 자식 폴더가 없으면 false
  if (!folder.children || folder.children.length === 0) {
    return false;
  }
  
  // 직접적인 자식인지 확인
  if (folder.children.some(child => child.id === targetId)) {
    return true;
  }
  
  // 자식 폴더들에 대해 재귀적으로 확인
  return folder.children.some(child => isDescendant(child, targetId));
};

// 계층 구조에서 폴더를 ID로 찾는 함수
const findFolderById = (folderList, id) => {
  for (const folder of folderList) {
    if (folder.id === id) return folder;
    if (folder.children && folder.children.length) {
      const found = findFolderById(folder.children, id);
      if (found) return found;
    }
  }
  return null;
};

// 폴더 ID를 키로 하고 자식 폴더 배열을 값으로 하는 맵을 생성하는 함수
const buildFolderMap = (folders) => {
  const folderMap = {};
  folders.forEach(folder => {
    if (folder.parent_id !== null) {
      if (!folderMap[folder.parent_id]) {
        folderMap[folder.parent_id] = [];
      }
      folderMap[folder.parent_id].push(folder);
    }
  });
  
  // 각 자식 배열을 position 기준으로 정렬
  for (const parentId in folderMap) {
    folderMap[parentId].sort((a, b) => {
      const posA = a.position === null ? Infinity : a.position;
      const posB = b.position === null ? Infinity : b.position;
      return posA - posB;
    });
  }
  
  return folderMap;
};

// 커스텀 훅: 컨텍스트 메뉴 위치 계산
const useContextMenuPosition = (x, y) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ x, y });
  
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedX = x;
      let adjustedY = y;
      
      // 화면 경계 확인 및 조정
      if (x + menuRect.width > viewportWidth) {
        adjustedX = Math.max(0, x - menuRect.width);
      }
      
      if (y + menuRect.height > viewportHeight) {
        adjustedY = Math.max(0, y - menuRect.height);
      }
      
      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);
  
  return { menuRef, position };
};

// 컨텍스트 메뉴 컴포넌트
const ContextMenu = ({ x, y, folder, onClose, onRename, onDelete, onMove, onAddPrompt, onAddFolder }) => {
  const isDefaultFolder = ['모든 프롬프트', '즐겨찾기'].includes(folder.name);
  const { menuRef, position } = useContextMenuPosition(x, y);
  
  // 메뉴 아이템 클릭 처리
  const handleMenuItemClick = (action) => {
    if (action === 'addFolder') onAddFolder();
    if (action === 'addPrompt') onAddPrompt();
    if (action === 'rename') onRename();
    if (action === 'delete') onDelete();
    if (action === 'moveUp') onMove('up');
    if (action === 'moveDown') onMove('down');
    onClose();
  };
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !e.target.closest('.folder-item')) {
        onClose();
      }
    };
    
    const events = ['mousedown', 'contextmenu'];
    events.forEach(event => document.addEventListener(event, handleOutsideClick));
    
    return () => {
      events.forEach(event => document.removeEventListener(event, handleOutsideClick));
    };
  }, [onClose]);
  
  return (
    <div 
      ref={menuRef}
      className="fixed bg-white shadow-lg border rounded-lg py-1 z-[9999] contextMenu dark:bg-gray-800 dark:border-gray-700"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        minWidth: '180px',
        maxWidth: '250px'
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* 폴더 추가 옵션 */}
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => handleMenuItemClick('addFolder')}
      >
        <FolderPlus size={14} className="mr-2" />
        폴더 추가
      </button>

      {/* 프롬프트 추가 옵션 (다시 추가) */}
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => handleMenuItemClick('addPrompt')}
      >
        <FilePlus size={14} className="mr-2" />
        프롬프트 추가
      </button>
      
      <hr className="my-1 border-gray-200 dark:border-gray-600" />
      
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => handleMenuItemClick('rename')}
        disabled={isDefaultFolder}
      >
        <Edit size={14} className="mr-2" />
        이름 변경
      </button>
      
      <button
        className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => handleMenuItemClick('moveUp')}
      >
        <ArrowUp size={14} className="mr-2" />
        상위 폴더로 이동
      </button>
      
      <button
        className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => handleMenuItemClick('moveDown')}
      >
        <ArrowDown size={14} className="mr-2" />
        하위 폴더로 이동
      </button>
      
      <hr className="my-1 border-gray-200 dark:border-gray-600" />
      
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 disabled:text-gray-400 disabled:hover:bg-white dark:text-red-400 dark:hover:bg-red-900 dark:disabled:text-gray-500 dark:disabled:hover:bg-gray-800"
        onClick={() => handleMenuItemClick('delete')}
        disabled={isDefaultFolder}
      >
        <Trash2 size={14} className="mr-2" />
        삭제
      </button>
    </div>
  );
};

// 커스텀 훅: 컨텍스트 메뉴 상태 관리
const useContextMenu = (folderName) => {
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const folderItemRef = useRef(null);
  
  // 컨텍스트 메뉴 닫기
  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);
  
  // 네이티브 컨텍스트 메뉴 이벤트 핸들러 등록
  useEffect(() => {
    const folderElement = folderItemRef.current;
    if (!folderElement) return;
    
    const handleNativeContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 다른 열린 컨텍스트 메뉴 닫기
      document.dispatchEvent(new CustomEvent('closeContextMenu'));
      
      // 폴더 요소 위치 기반으로 메뉴 표시
      const rect = folderElement.getBoundingClientRect();
      setContextMenu({
        visible: true,
        x: rect.right,
        y: rect.top
      });
      
      return false;
    };
    
    folderElement.addEventListener('contextmenu', handleNativeContextMenu);
    return () => folderElement.removeEventListener('contextmenu', handleNativeContextMenu);
  }, [folderName]);
  
  // 외부 클릭 감지 및 컨텍스트 메뉴 닫기 이벤트 핸들러
  useEffect(() => {
    const handleCloseContextMenu = () => closeContextMenu();
    document.addEventListener('closeContextMenu', handleCloseContextMenu);
    
    return () => document.removeEventListener('closeContextMenu', handleCloseContextMenu);
  }, [closeContextMenu]);
  
  // 외부 클릭 감지
  useEffect(() => {
    if (!contextMenu.visible) return;
    
    const timeoutId = setTimeout(() => {
      const handleOutsideClick = (event) => {
        if (event.target.closest('.contextMenu') || event.target.closest('.folder-item')) {
          return;
        }
        closeContextMenu();
      };
      
      const events = ['click', 'contextmenu'];
      events.forEach(event => document.addEventListener(event, handleOutsideClick));
      
      return () => {
        events.forEach(event => document.removeEventListener(event, handleOutsideClick));
      };
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [contextMenu.visible, closeContextMenu]);
  
  return { contextMenu, setContextMenu, closeContextMenu, folderItemRef };
};

// 일반 드래그 위치 확인 유틸리티 함수 (훅 사용 없음)
const checkDragPosition = (e, threshold = 5) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const mouseY = e.clientY;

  // Check if mouse is slightly outside the bounds (using threshold)
  if (mouseY < rect.top - threshold) {
    return 'before'; // Consider it 'before' if above with threshold
  }
  if (mouseY > rect.bottom + threshold) {
    return 'after'; // Consider it 'after' if below with threshold
  }

  // 역방향 스크롤에 대한 보정
  const mouseRelativeY = mouseY - rect.top;
  const relativePercentage = mouseRelativeY / rect.height;

  // 정확한 영역 계산 - 상/하 25%, 내부 50% (조정된 비율)
  // Add clamping to handle values slightly outside [0, 1]
  const clampedPercentage = Math.max(0, Math.min(1, relativePercentage));

  if (clampedPercentage < 0.25) {
    return 'before';
  } else if (clampedPercentage > 0.75) { // 1 - 0.25 = 0.75
    return 'after';
  } else {
    return 'inside';
  }
};

// 드롭 마커 생성 및 관리 유틸리티 함수
const createDropMarker = () => {
  // 이미 존재하는 마커가 있으면 제거
  const existingMarker = document.querySelector('.folder-drop-marker');
  if (existingMarker) {
    existingMarker.remove();
  }
  
  // 새 드롭 마커 생성
  const marker = document.createElement('div');
  marker.className = 'folder-drop-marker';
  marker.style.position = 'absolute';
  marker.style.height = '4px'; // 두께 더 증가 (3px → 4px)
  marker.style.borderRadius = '2px'; // 둥근 모서리 추가
  marker.style.backgroundColor = '#3b82f6'; // 더 진한 파란색
  marker.style.left = '0';
  marker.style.right = '0';
  marker.style.transform = 'scaleY(0)';
  marker.style.transition = 'transform 0.15s ease-in-out';
  marker.style.zIndex = '10';
  marker.style.boxShadow = '0 0 4px rgba(59, 130, 246, 0.7)'; // 더 강한 그림자 효과
  
  document.body.appendChild(marker);
  return marker;
};

const showDropMarker = (targetElement, position = 'before') => {
  const marker = document.querySelector('.folder-drop-marker') || createDropMarker();
  
  if (!targetElement) {
    marker.style.transform = 'scaleY(0)';
    return;
  }
  
  const rect = targetElement.getBoundingClientRect();
  
  // 마커 스타일 설정 - 더 두드러지게 조정
  marker.style.width = `${rect.width - 20}px`; // 좌우 여백 확대
  marker.style.left = `${rect.left + 10}px`; // 왼쪽에서 10px 안쪽으로
  
  // 위치에 따라 다른 Y 위치 설정 - 약간의 간격을 두어 더 명확하게
  if (position === 'before') {
    marker.style.top = `${rect.top - 2}px`; // 상단에서 약간 위로
  } else if (position === 'after') {
    marker.style.top = `${rect.bottom + 2}px`; // 하단에서 약간 아래로
  }
  
  // 마커를 부드럽게 보여주기
  marker.style.opacity = '0';
  marker.style.transform = 'scaleY(1)';
  
  // 약간의 지연 후 opacity 변경하여 부드러운 효과
  setTimeout(() => {
    marker.style.opacity = '1';
  }, 5);
};

const hideDropMarker = () => {
  const marker = document.querySelector('.folder-drop-marker');
  if (marker) {
    marker.style.transform = 'scaleY(0)';
  }
};

// 드래그 중 성능 최적화를 위한 클래스 추가 함수
const optimizeDragPerformance = (enable) => {
  if (enable) {
    document.body.classList.add('dragging-active');
    
    // 드래그 활성화 시 스타일 추가
    const style = document.createElement('style');
    style.id = 'drag-performance-styles';
    style.textContent = `
      /* 내부 드롭 영역 스타일 */
      .folder-item.drag-over-inside {
        background-color: rgba(219, 234, 254, 0.8) !important; 
        border: 2px dashed #3b82f6 !important;
        border-radius: 6px !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
        padding: 2px 6px !important;
        transition: all 0.2s ease-in-out !important;
      }
      
      /* 드래그 영역 표시자 */
      .folder-item::before {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 15%;
        top: 0;
        background: transparent;
        z-index: 5;
        pointer-events: none;
      }
      
      .folder-item::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 15%;
        bottom: 0;
        background: transparent;
        z-index: 5;
        pointer-events: none;
      }
      
      .folder-item.drag-over-before::before {
        background: rgba(59, 130, 246, 0.1);
        border-top: 2px solid #3b82f6;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
      }
      
      .folder-item.drag-over-after::after {
        background: rgba(59, 130, 246, 0.1);
        border-bottom: 2px solid #3b82f6;
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
      }
      
      /* 드롭 마커 애니메이션 */
      .folder-drop-marker {
        animation: pulse-marker 1.5s infinite;
      }
      @keyframes pulse-marker {
        0%, 100% { opacity: 1; transform: scaleY(1); }
        50% { opacity: 0.8; transform: scaleY(1.2); }
      }
      
      /* 드래그 중인 아이템 스타일 */
      .folder-item.dragging {
        opacity: 0.4 !important;
      }
      
      /* 드래그 오버시 폴더 아이콘 강조 */
      .folder-item.drag-over-inside svg {
        color: #3b82f6 !important;
        transition: color 0.2s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  } else {
    document.body.classList.remove('dragging-active');
    
    // 드래그 종료 시 스타일 제거
    const style = document.getElementById('drag-performance-styles');
    if (style) style.remove();
  }
};

// FolderItem 컴포넌트를 React.memo로 감싸서 불필요한 리렌더링 방지
const FolderItem = React.memo(({ folder, level = 0, isLast = false }) => {
  const { 
    selectedFolder, 
    setSelectedFolder, 
    expandedFolders,
    toggleFolder,
    loadData,
    folders,
    handleAddPrompt,
    openFolderModal
  } = useAppContext();
  
  // React Router history 객체 추가
  const navigate = useNavigate();

  // 컨텍스트 메뉴 관리
  const { contextMenu, closeContextMenu, folderItemRef } = useContextMenu(folder.name);
  
  // 이름 변경 모드 상태
  const [newName, setNewName] = useState(folder.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef(null);
  
  // 폴더 이동 모드 상태
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [moveDirection, setMoveDirection] = useState(null);
  
  // 드래그 앤 드롭 상태를 Ref로 관리하여 리렌더링 방지
  const dragStateRef = useRef({
    isDragging: false,
    isDragOver: false,
    dropPosition: null, // 'before', 'inside', 'after'
    lastDragTime: 0, // For throttling dragOver
    throttleInterval: 50 // Throttle interval in ms (adjust as needed)
  });
  
  // UI 업데이트를 위한 최소한의 상태만 유지
  const [, forceUpdate] = useState({});
  
  // RAF 참조 저장
  const rafIdRef = useRef(null);
  
  const isSelected = selectedFolder === folder.name;
  const isExpanded = expandedFolders[folder.name];
  const hasChildren = folder.children && folder.children.length > 0;
  const isDefaultFolder = ['모든 프롬프트', '즐겨찾기'].includes(folder.name);
  
  // 아이콘 결정
  let FolderIcon = Folder;
  if (folder.name === '모든 프롬프트') {
    FolderIcon = Package;
  } else if (folder.name === '즐겨찾기') {
    FolderIcon = Star;
  } else if (isExpanded) {
    FolderIcon = FolderOpen;
  }
  
  // 폴더 클릭 핸들러 - React Router와 호환되도록 수정
  const handleFolderClick = (e) => {
    e.preventDefault();
    setSelectedFolder(folder.name);
    
    // 메인 페이지(/)로 이동
    navigate('/');

    if (hasChildren) {
      toggleFolder(folder.name);
    }
  };
  
  // 컴포넌트 언마운트 시 RAF 정리
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);
  
  // 드래그 시각적 피드백 업데이트를 위한 RAF 함수
  const updateDragVisual = useCallback((isDraggedOver, position = null) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      // Ref를 사용하여 상태 업데이트
      dragStateRef.current.isDragOver = isDraggedOver;
      dragStateRef.current.dropPosition = position;
      
      // 모든 클래스 먼저 제거
      if (folderItemRef.current) {
        folderItemRef.current.classList.remove('drag-over-inside');
        folderItemRef.current.classList.remove('drag-over-before');
        folderItemRef.current.classList.remove('drag-over-after');
      }
      
      // 드롭 마커 위치 업데이트
      if (isDraggedOver) {
        if (position === 'before') {
          // 'before' 위치일 때 마커 표시 및 클래스 추가
          showDropMarker(folderItemRef.current, position);
          folderItemRef.current?.classList.add('drag-over-before');
        } else if (position === 'after') {
          // 'after' 위치일 때 마커 표시 및 클래스 추가
          showDropMarker(folderItemRef.current, position);
          folderItemRef.current?.classList.add('drag-over-after');
        } else if (position === 'inside' && folderItemRef.current) {
          // 'inside' 위치일 때는 클래스로 표시
          hideDropMarker();
          folderItemRef.current.classList.add('drag-over-inside');
        } 
      } else {
        // 드래그 오버 상태가 아니면 마커와 클래스 모두 제거
        hideDropMarker();
      }
      
      forceUpdate({}); // 필요한 경우에만 리렌더링 트리거
      rafIdRef.current = null;
    });
  }, []);
  
  // 드래그 앤 드롭 이벤트 핸들러 최적화
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Throttle dragOver calls based on time interval
    const now = Date.now();
    const { lastDragTime, throttleInterval } = dragStateRef.current;
    if (now - lastDragTime < throttleInterval) {
      return; // Ignore call if within throttle interval
    }
    dragStateRef.current.lastDragTime = now; // Update last call time

    // 자기 자신이거나 특별 폴더인 경우 드롭 불가
    if (isDefaultFolder || dragStateRef.current.isDragging) { // Check if dragging itself
      e.dataTransfer.dropEffect = 'none'; // 드롭 불가 아이콘 표시
      updateDragVisual(false); // Ensure no visual feedback if dropping is not allowed
      return;
    }
    e.dataTransfer.dropEffect = 'move'; // Allow drop effect

    // 드래그 위치에 따라 다른 시각적 피드백 표시
    const dropPosition = checkDragPosition(e); // Use updated checkDragPosition

    // 이전 위치와 같으면 불필요한 업데이트 방지
    if (dragStateRef.current.dropPosition === dropPosition && dragStateRef.current.isDragOver) {
      return;
    }

    // 위치에 따른 피드백
    updateDragVisual(true, dropPosition);
  }, [isDefaultFolder, updateDragVisual]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if the mouse truly left the element, not just moved to a child
    const relatedTarget = e.relatedTarget;
    if (folderItemRef.current && folderItemRef.current.contains(relatedTarget)) {
        return; // Don't hide visuals if moving within the element
    }

    // 시각적 피드백 제거
    updateDragVisual(false);
    // Reset drop position in ref when leaving
    dragStateRef.current.dropPosition = null;
  }, [updateDragVisual]);
  
  // CSS 스타일 최적화를 위한 클래스 문자열 생성 (position:relative 추가)
  const folderItemClasses = `flex items-center py-1 px-2 hover:bg-blue-50 rounded cursor-pointer folder-item 
                           transition-all duration-150 ease-in-out relative
                           ${isSelected ? 'bg-blue-100' : ''}
                           ${dragStateRef.current.isDragging ? 'opacity-50' : ''}`;
  
  // 드래그 시작/종료 시 전역 성능 최적화
  const handleDragStart = (e) => {
    // 특별 폴더는 드래그 불가
    if (isDefaultFolder) {
      e.preventDefault();
      return;
    }
    
    // 성능 최적화를 위한 클래스 추가
    optimizeDragPerformance(true);
    
    // 드래그 시작 데이터 설정
    e.dataTransfer.setData('application/json', JSON.stringify({
      folderId: folder.id,
      folderName: folder.name,
      parentId: folder.parent_id,
      position: folder.position,
      level: level
    }));
    
    // Ref를 사용하여 상태 업데이트
    dragStateRef.current.isDragging = true;
    forceUpdate({}); // 시각적 피드백을 위한 최소 업데이트
    
    // 드래그 시작 시 DOM 조작
    e.currentTarget.classList.add('dragging');
    
    // 사전에 생성된 드래그 이미지 사용
    if (window.dragImageCache && window.dragImageCache[folder.name]) {
      e.dataTransfer.setDragImage(window.dragImageCache[folder.name], 0, 0);
      return;
    }
    
    // 드래그 이미지 캐싱
    if (!window.dragImageCache) {
      window.dragImageCache = {};
    }
    
    const dragIcon = document.createElement('div');
    dragIcon.textContent = folder.name;
    dragIcon.className = 'bg-blue-100 border border-blue-300 rounded px-2 py-1 text-sm';
    dragIcon.style.position = 'fixed';
    dragIcon.style.top = '-1000px';
    dragIcon.style.left = '-1000px';
    document.body.appendChild(dragIcon);
    
    // 캐시에 저장
    window.dragImageCache[folder.name] = dragIcon;
    
    e.dataTransfer.setDragImage(dragIcon, 0, 0);
  };
  
  const handleDragEnd = (e) => {
    // Ref를 사용하여 상태 업데이트
    dragStateRef.current.isDragging = false;
    forceUpdate({}); // 시각적 피드백을 위한 최소 업데이트
    
    // DOM 직접 조작
    e.currentTarget.classList.remove('dragging');
    
    // 성능 최적화를 위한 클래스 제거
    optimizeDragPerformance(false);
    
    // 드롭 마커 숨기기
    hideDropMarker();
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ref를 사용하여 상태 업데이트
    const dropPosition = dragStateRef.current.dropPosition;
    dragStateRef.current.isDragOver = false;
    dragStateRef.current.dropPosition = null;
    forceUpdate({});
    
    // 특별 폴더인 경우 드롭 불가
    if (isDefaultFolder) {
      hideDropMarker();
      return;
    }
    
    try {
      // 드래그 데이터 가져오기
      const dataText = e.dataTransfer.getData('application/json');
      if (!dataText) {
        console.error('유효하지 않은 드래그 데이터');
        hideDropMarker();
        return;
      }
      
      const data = JSON.parse(dataText);
      const draggedFolderId = data.folderId;
      
      // 자기 자신에게 드롭하는 경우 무시
      if (draggedFolderId === folder.id) {
        hideDropMarker();
        return;
      }
      
      // 계층 구조에서 폴더 찾기
      const draggedFolder = findFolderById(folders, draggedFolderId);
      if (!draggedFolder) {
        console.error('드래그한 폴더를 찾을 수 없습니다.');
        hideDropMarker();
        return;
      }
      
      // 드래그한 폴더가 대상 폴더의 부모인 경우(순환 참조) 방지
      if (isDescendant(draggedFolder, folder.id)) {
        alert('폴더를 자신의 하위 폴더로 이동할 수 없습니다.');
        hideDropMarker();
        return;
      }
      
      console.log(`폴더 드롭: ${draggedFolder.name}를 ${folder.name}의 ${dropPosition}에 위치`);
      
      // 드롭 위치에 따른 처리
      if (dropPosition === 'inside') {
        // 폴더 내부로 이동
        await reorderFolder(draggedFolderId, {
          reference_folder_id: folder.id,
          target_position: 'inside'
        });
      } else {
        // 폴더 위/아래로 이동
        await reorderFolder(draggedFolderId, {
          reference_folder_id: folder.id,
          target_position: dropPosition  // 'before' 또는 'after'
        });
      }
      
      // 데이터 다시 로드
      await loadData();
      
    } catch (error) {
      console.error('폴더 이동 실패:', error);
      // 오류 메시지 명확히 보여주기
      if (error.response) {
        alert(`폴더 이동 실패: ${error.response.data?.message || '알 수 없는 오류'}`);
      } else {
        alert('폴더를 이동하는데 실패했습니다. 네트워크 연결을 확인하세요.');
      }
    } finally {
      // 드롭 마커 및 시각적 표시 모두 제거
      hideDropMarker();
      if (folderItemRef.current) {
        folderItemRef.current.classList.remove('drag-over-inside');
      }
    }
  };
  
  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) {
      updateFolder(folder.id, { name: newName.trim() })
        .then(() => loadData())
        .catch(error => {
          console.error('폴더 이름 변경 실패:', error);
          alert('폴더 이름을 변경하는데 실패했습니다.');
        });
    }
    setIsRenaming(false);
  };
  
  return (
    <li className={`${isLast ? '' : 'mb-1'} relative`}>
      <div 
        className={folderItemClasses}
        onClick={handleFolderClick}
        ref={folderItemRef}
        style={{ userSelect: 'none', position: 'relative', pointerEvents: 'auto' }}
        data-folder-id={folder.id}
        data-folder-name={folder.name}
        data-level={level}
        data-is-default={isDefaultFolder ? "true" : "false"}
        draggable={!isDefaultFolder}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="w-6 flex items-center">
          {hasChildren && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.name);
              }}
              className="mr-1 p-1 rounded hover:bg-gray-200"
            >
              {isExpanded 
                ? <ChevronDown size={14} className="text-gray-500" /> 
                : <ChevronRight size={14} className="text-gray-500" />
              }
            </button>
          )}
        </span>
        
        <FolderIcon 
          size={16} 
          className={`mr-2 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} 
        />
        
        {!isRenaming ? (
          <span className={`flex-grow text-sm ${isSelected ? 'font-medium' : ''} dark:text-gray-200`}>
            {folder.name}
          </span>
        ) : (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-grow mr-2 px-1 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="폴더 이름"
            autoFocus
            ref={renameInputRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              } else if (e.key === 'Escape') {
                setIsRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        {/* 폴더 내 프롬프트 개수 표시 - 상위 프롬프트 개수만 표시 */}
        {folder.count !== undefined && folder.count > 0 && (
          <span className="ml-1 text-xs text-gray-500" title={`프롬프트: ${folder.count}`}>
            {folder.count}
          </span>
        )}
        
        {/* 폴더 내 프롬프트 개수 표시 - total_count와 count 함께 표시 */}
        {/* {folder.total_count !== undefined && (
          <span className="text-gray-500 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full flex items-center dark:bg-gray-700 dark:text-gray-400">
            {folder.count !== folder.total_count ? (
              <span title={`직접 포함된 프롬프트: ${folder.count} / 하위 폴더 포함 전체: ${folder.total_count}`}>
                <span className="font-medium">{folder.count}</span>
                <span className="mx-0.5 text-gray-400">/</span>
                <span>{folder.total_count}</span>
              </span>
            ) : (
              <span>
                {folder.count}
              </span>
            )}
          </span>
        )} */}
      </div>
      
      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <ContextMenu 
          x={contextMenu.x}
          y={contextMenu.y}
          folder={folder}
          onClose={closeContextMenu}
          onRename={() => {
            setIsRenaming(true);
            setNewName(folder.name);
            setTimeout(() => {
              if (renameInputRef.current) {
                renameInputRef.current.focus();
                renameInputRef.current.select();
              }
            }, 10);
          }}
          onDelete={() => {
            if (['모든 프롬프트', '즐겨찾기'].includes(folder.name)) {
              alert('기본 폴더는 삭제할 수 없습니다.');
              return;
            }

            if (!window.confirm(`"${folder.name}" 폴더를 삭제하시겠습니까? 폴더 내 프롬프트가 있으면 삭제할 수 없습니다.`)) {
              return;
            }
            
            deleteFolder(folder.id)
              .then(() => {
                loadData();
                if (selectedFolder === folder.name) {
                  setSelectedFolder('모든 프롬프트'); // 삭제된 폴더가 선택된 경우 기본 폴더로 변경
                }
              })
              .catch(error => {
                console.error('폴더 삭제 실패:', error);
                alert('폴더를 삭제하는데 실패했습니다. 폴더 내 프롬프트가 있거나 하위 폴더가 있는지 확인하세요.');
              });
          }}
          onMove={(direction) => {
            setIsMoveMode(true);
            setMoveDirection(direction);
          }}
          onAddPrompt={() => handleAddPrompt(folder.id, folder.name)}
          onAddFolder={() => openFolderModal(folder.id)}
        />
      )}
      
      {hasChildren && isExpanded && (
        <ul className="pl-4">
          {folder.children.map((childFolder, index) => (
            <FolderItem 
              key={childFolder.id} 
              folder={childFolder}
              level={level + 1}
              isLast={index === folder.children.length - 1}
            />
          ))}
        </ul>
      )}
      
      {/* 폴더 이동 모드 UI */}
      {isMoveMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              {moveDirection === 'up' ? '상위 폴더로 이동' : '하위 폴더로 이동'}
            </h3>
            
            <p className="mb-4 text-sm text-gray-600">
              {`"${folder.name}" 폴더를 ${moveDirection === 'up' ? '상위' : '하위'} 폴더로 이동합니다.`}
            </p>
            
            <div className="max-h-60 overflow-y-auto border rounded mb-4">
              {moveDirection === 'up' && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b"
                  onClick={() => {
                    updateFolder(folder.id, {
                      name: folder.name,
                      parent_id: null
                    })
                    .then(() => {
                      loadData();
                      setIsMoveMode(false);
                    })
                    .catch(error => {
                      console.error('폴더 이동 실패:', error);
                      alert('폴더를 이동하는데 실패했습니다.');
                      setIsMoveMode(false);
                    });
                  }}
                >
                  최상위 폴더 (루트)
                </button>
              )}
              
              {(moveDirection === 'up' ? 
                folders.filter(f => f.id !== folder.id && !isDescendant(f, folder.id)) : 
                folders.filter(f => f.id !== folder.id && f.parent_id === folder.parent_id)
              ).map(f => (
                <button
                  key={f.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b"
                  onClick={() => {
                    updateFolder(folder.id, {
                      name: folder.name,
                      parent_id: moveDirection === 'up' ? f.id : f.parent_id
                    })
                    .then(() => {
                      loadData();
                      setIsMoveMode(false);
                    })
                    .catch(error => {
                      console.error('폴더 이동 실패:', error);
                      alert('폴더를 이동하는데 실패했습니다.');
                      setIsMoveMode(false);
                    });
                  }}
                >
                  {f.name}
                </button>
              ))}
              
              {(moveDirection === 'up' ? 
                folders.filter(f => f.id !== folder.id && !isDescendant(f, folder.id)) : 
                folders.filter(f => f.id !== folder.id && f.parent_id === folder.parent_id)
              ).length === 0 && (
                <div className="p-3 text-sm text-gray-500">
                  이동 가능한 폴더가 없습니다.
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 mr-2"
                onClick={() => setIsMoveMode(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교 함수: 직접 전달된 props만 비교
  const shouldSkipRender = 
    prevProps.folder.id === nextProps.folder.id &&
    prevProps.folder.name === nextProps.folder.name &&
    prevProps.folder.count === nextProps.folder.count &&
    prevProps.folder.total_count === nextProps.folder.total_count &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.level === nextProps.level;

  return shouldSkipRender;
});

const FolderTree = React.memo(() => {
  const { folders, isLoading, loadData, openFolderModal } = useAppContext();
  const rootDropAreaRef = useRef(null);
  
  // 드래그 상태를 Ref로 관리
  const dragStateRef = useRef({
    isRootDragOver: false,
    rootDropPosition: null, // 드롭 위치 (before, inside, after)
    targetFolder: null, // 대상 폴더
    lastRootDragTime: 0, // Throttling for root drag over
    rootThrottleInterval: 50 // Throttle interval in ms
  });
  
  // UI 업데이트를 위한 최소한의 상태만 유지
  const [, forceUpdate] = useState({});
  
  // RAF 참조 저장
  const rafIdRef = useRef(null);
  
  // 드롭 마커 참조
  const rootDropMarkerRef = useRef(null);
  
  // 마운트 시 드롭 마커 생성
  useEffect(() => {
    // 루트 드롭 마커 생성
    rootDropMarkerRef.current = createDropMarker();
    
    return () => {
      // 언마운트 시 드롭 마커 제거
      if (rootDropMarkerRef.current) {
        rootDropMarkerRef.current.remove();
      }
    };
  }, []);
  
  // 드래그 시각적 피드백 업데이트를 위한 RAF 함수
  const updateRootDragVisual = useCallback((isDraggedOver, dropInfo = null) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      // Ref를 사용하여 상태 업데이트
      dragStateRef.current.isRootDragOver = isDraggedOver;
      
      if (dropInfo) {
        dragStateRef.current.rootDropPosition = dropInfo.position;
        dragStateRef.current.targetFolder = dropInfo.targetFolder;
        
        // 드롭 마커 표시
        if (dropInfo.targetFolder) {
          const folderElement = document.querySelector(
            `.folder-item[data-folder-id="${dropInfo.targetFolder.id}"]`
          );
          
          if (folderElement) {
            showDropMarker(
              folderElement, 
              dropInfo.position === 'before' ? 'before' : 'after'
            );
          }
        } else {
          hideDropMarker();
        }
      } else {
        dragStateRef.current.rootDropPosition = null;
        dragStateRef.current.targetFolder = null;
        hideDropMarker();
      }
      
      forceUpdate({}); // 필요한 경우에만 리렌더링 트리거
      rafIdRef.current = null;
    });
  }, []);
  
  // 루트 드래그 위치 확인 함수 - useCallback 제거하고 일반 함수로 변경
  const checkRootDragPosition = (e, folderItems) => {
    // 첫 번째/마지막 폴더와 드롭 영역의 rect 가져오기
    const containerRect = rootDropAreaRef.current.getBoundingClientRect();
    const mouseY = e.clientY;
    
    // 최상위 레벨 폴더들 요소 가져오기 (일반 폴더만)
    const rootFolderElements = Array.from(
      document.querySelectorAll('.folder-item[data-level="0"]:not([data-is-default="true"])')
    );
    
    if (rootFolderElements.length === 0) {
      return { position: 'inside', targetFolder: null };
    }
    
    // 첫 번째 폴더보다 위에 드롭하는 경우
    const firstFolderRect = rootFolderElements[0].getBoundingClientRect();
    if (mouseY < firstFolderRect.top) {
      const firstFolder = folderItems.find(
        folder => folder.id.toString() === rootFolderElements[0].dataset.folderId
      );
      return { position: 'before', targetFolder: firstFolder };
    }
    
    // 마지막 폴더보다 아래에 드롭하는 경우
    const lastFolderRect = rootFolderElements[rootFolderElements.length - 1].getBoundingClientRect();
    if (mouseY > lastFolderRect.bottom) {
      const lastFolder = folderItems.find(
        folder => folder.id.toString() === rootFolderElements[rootFolderElements.length - 1].dataset.folderId
      );
      return { position: 'after', targetFolder: lastFolder };
    }
    
    // 폴더 사이에 드롭하는 경우
    for (let i = 0; i < rootFolderElements.length - 1; i++) {
      const currentRect = rootFolderElements[i].getBoundingClientRect();
      const nextRect = rootFolderElements[i + 1].getBoundingClientRect();
      const middleY = (currentRect.bottom + nextRect.top) / 2;
      
      if (mouseY < middleY) {
        const currentFolder = folderItems.find(
          folder => folder.id.toString() === rootFolderElements[i].dataset.folderId
        );
        return { position: 'after', targetFolder: currentFolder };
      } else if (mouseY < nextRect.top) {
        const nextFolder = folderItems.find(
          folder => folder.id.toString() === rootFolderElements[i + 1].dataset.folderId
        );
        return { position: 'before', targetFolder: nextFolder };
      }
    }
    
    // 기본값 - 마지막 폴더 뒤에 추가
    const lastFolder = folderItems.find(
      folder => folder.id.toString() === rootFolderElements[rootFolderElements.length - 1].dataset.folderId
    );
    return { position: 'after', targetFolder: lastFolder };
  };
  
  // 루트 영역 드래그 앤 드롭 이벤트 핸들러 최적화
  const handleRootDragOver = useCallback((e) => {
    e.preventDefault();

    // Throttle root dragOver calls
    const now = Date.now();
    const { lastRootDragTime, rootThrottleInterval } = dragStateRef.current;
    if (now - lastRootDragTime < rootThrottleInterval) {
      return; // Ignore call if within throttle interval
    }
    dragStateRef.current.lastRootDragTime = now; // Update last call time

    // Check if the drag is currently over a specific folder item
    if (e.target.closest('.folder-item')) {
      // Let the FolderItem's handler manage the event
      return;
    }

    // Proceed with root-level drop detection
    e.dataTransfer.dropEffect = 'move';

    // 드래그 위치 확인
    const dropInfo = checkRootDragPosition(e, folders);

    // 이전 상태와 동일하면 불필요한 업데이트 방지
    const currentState = dragStateRef.current;
    if (
      currentState.isRootDragOver &&
      currentState.rootDropPosition === dropInfo.position &&
      currentState.targetFolder?.id === dropInfo.targetFolder?.id
    ) {
      return;
    }

    updateRootDragVisual(true, dropInfo);
  }, [updateRootDragVisual, folders, checkRootDragPosition]);

  const handleRootDragLeave = useCallback((e) => {
    // Prevent hiding marker if leaving towards a folder item
    const relatedTarget = e.relatedTarget;
    if (relatedTarget && relatedTarget.closest && relatedTarget.closest('.folder-item')) {
      return;
    }
    updateRootDragVisual(false);
    hideDropMarker();
  }, [updateRootDragVisual]);

  const handleRootDrop = async (e) => {
    e.preventDefault();

    // Prevent drop if it happens over a folder-item (should be handled by FolderItem's drop)
    if (e.target.closest('.folder-item')) {
        hideDropMarker();
        return;
    }

    // Ref를 사용하여 상태 업데이트
    const dropInfo = dragStateRef.current;
    dragStateRef.current.isRootDragOver = false;
    forceUpdate({});

    try {
      // 드래그 데이터 가져오기
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const draggedFolderId = data.folderId;

      // 계층 구조에서 폴더 찾기
      const draggedFolder = findFolderById(folders, draggedFolderId);
      if (!draggedFolder) return;

      // 드롭 위치에 따라 처리
      if (dropInfo.rootDropPosition && dropInfo.targetFolder) {
        // 특정 폴더 기준 위치로 이동
        await reorderFolder(draggedFolderId, {
          reference_folder_id: dropInfo.targetFolder.id,
          target_position: dropInfo.rootDropPosition
        });
      } else {
        // 기본: 최상위 레벨의 마지막 위치로 이동 (또는 첫번째 위치 등 기본 정책)
        await reorderFolder(draggedFolderId, {
          reference_folder_id: 'root',
          target_position: 'after' // Example: place at the end by default
        });
      }

      // 데이터 다시 로드
      await loadData();
    } catch (error) {
      console.error('폴더 이동 실패:', error);
      alert('폴더를 이동하는데 실패했습니다.');
    } finally {
      hideDropMarker();
    }
  };
  
  // CSS 최적화
  const rootDropAreaClasses = `folder-tree-container transition-all duration-150 ease-in-out 
                              ${dragStateRef.current.isRootDragOver ? 'bg-blue-50 border border-blue-300 rounded-lg p-2' : ''}`;
  
  // 컴포넌트 마운트 시 CSS 규칙 추가
  useLayoutEffect(() => {
    // 드래그 중 성능 최적화를 위한 스타일 추가
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .dragging-active * {
        transition: none !important;
        animation: none !important;
      }
      .dragging-active .folder-item:not(:hover):not(.bg-blue-100) {
        will-change: transform, opacity;
      }
      .folder-drop-marker {
        pointer-events: none;
        box-shadow: 0 0 0 1px #2563eb;
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
      // 컴포넌트 언마운트 시 드롭 마커 제거
      const marker = document.querySelector('.folder-drop-marker');
      if (marker) marker.remove();
    };
  }, []);
  
  // 컴포넌트가 마운트될 때 한 번만 마이그레이션 실행하도록 수정
  useEffect(() => {
    // 마이그레이션 상태 저장 키
    const MIGRATION_KEY = 'folder_migration_completed_v2';
    
    const migrateFolderPositions = async () => {
      try {
        // 이미 마이그레이션이 완료되었는지 로컬 스토리지 확인
        if (localStorage.getItem(MIGRATION_KEY) === 'true') {
          return;
        }
        
        // 서버에서 마이그레이션 필요 여부 확인
        const checkResponse = await fetch('/api/folders/migration-needed');
        
        if (!checkResponse.ok) {
          console.error('마이그레이션 필요 여부 확인 실패');
          return;
        }
        
        const checkData = await checkResponse.json();
        
        // 마이그레이션이 필요한 경우에만 실행
        if (checkData.migrationNeeded) {
          
          const response = await fetch('/api/folders/migrate', {
            method: 'POST'
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.migrated) {
              localStorage.setItem(MIGRATION_KEY, 'true');
              loadData(); // 폴더 데이터 다시 불러오기
            } else {
              localStorage.setItem(MIGRATION_KEY, 'true');
            }
          } else {
            console.error('마이그레이션 처리 실패');
          }
        } else {
          localStorage.setItem(MIGRATION_KEY, 'true');
        }
      } catch (error) {
        console.error('폴더 마이그레이션 오류:', error);
      }
    };
    
    // 앱 시작 시 폴더 마이그레이션 실행
    migrateFolderPositions();
  }, [loadData]); // loadData를 의존성 배열에 추가
  
  // 최상위 레벨 폴더 필터링 및 계층 구조 빌드
  const rootFolders = useMemo(() => {
    const folderMap = buildFolderMap(folders);
    
    // parent_id가 null인 폴더 (최상위)
    const topLevelFolders = folders.filter(f => f.parent_id === null);
    
    // --- 폴더 정렬 로직 수정: 기본 폴더 위치 고정 ---
    topLevelFolders.sort((a, b) => {
      // '모든 프롬프트'는 항상 첫번째
      if (a.name === '모든 프롬프트') return -1;
      if (b.name === '모든 프롬프트') return 1;
      
      // '즐겨찾기'는 항상 두번째
      if (a.name === '즐겨찾기') return -1;
      if (b.name === '즐겨찾기') return 1;
      
      // 기본 폴더(isDefault=1)는 항상 '모든 프롬프트', '즐겨찾기' 다음
      if (a.isDefault === 1) return -1;
      if (b.isDefault === 1) return 1;
      
      // 나머지는 position 기준으로 정렬
      const posA = a.position === null ? Infinity : a.position;
      const posB = b.position === null ? Infinity : b.position;
      return posA - posB;
    });
    // --- 정렬 로직 수정 끝 ---
    
    // 계층 구조 빌드
    const buildHierarchy = (folderList) => {
      return folderList.map(folder => ({
        ...folder,
        children: folderMap[folder.id] ? buildHierarchy(folderMap[folder.id]) : []
      }));
    };
    
    return buildHierarchy(topLevelFolders);
  }, [folders]);

  if (isLoading && folders.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        폴더 정보를 불러오는 중...
      </div>
    );
  }
  
  return (
    <div 
      ref={rootDropAreaRef} 
      className={rootDropAreaClasses}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
    >
      <ul className="list-none">
        {folders.map((folder, index) => (
          <FolderItem 
            key={folder.id} 
            folder={folder} 
            isLast={index === folders.length - 1}
            level={0}
          />
        ))}
      </ul>
      {dragStateRef.current.isRootDragOver && !dragStateRef.current.targetFolder && (
        <div className="text-center py-2 text-blue-600 text-sm">
          여기에 드롭하여 최상위 폴더로 이동
        </div>
      )}
    </div>
  );
});

export default FolderTree;
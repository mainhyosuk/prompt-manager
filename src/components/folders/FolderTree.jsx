import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { ChevronDown, ChevronRight, Star, Folder, FolderOpen, Package, Edit, Trash2, ArrowUp, ArrowDown, FilePlus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { updateFolder, deleteFolder } from '../../api/folderApi';

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
const ContextMenu = ({ x, y, folder, onClose, onRename, onDelete, onMove, onAddPrompt }) => {
  const isDefaultFolder = ['모든 프롬프트', '즐겨찾기'].includes(folder.name);
  const { menuRef, position } = useContextMenuPosition(x, y);
  
  // 메뉴 아이템 클릭 처리
  const handleMenuItemClick = (action) => {
    if (action === 'rename') onRename();
    if (action === 'delete') onDelete();
    if (action === 'moveUp') onMove('up');
    if (action === 'moveDown') onMove('down');
    if (action === 'addPrompt') onAddPrompt();
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
      className="fixed bg-white shadow-lg border rounded-lg py-1 z-[9999] contextMenu"
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
      {/* 프롬프트 추가 옵션 (신규 추가) */}
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
        onClick={() => handleMenuItemClick('addPrompt')}
      >
        <FilePlus size={14} className="mr-2" />
        프롬프트 추가
      </button>
      
      <hr className="my-1 border-gray-200" />
      
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-white"
        onClick={() => handleMenuItemClick('rename')}
        disabled={isDefaultFolder}
      >
        <Edit size={14} className="mr-2" />
        이름 변경
      </button>
      
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
        onClick={() => handleMenuItemClick('moveUp')}
      >
        <ArrowUp size={14} className="mr-2" />
        상위 폴더로 이동
      </button>
      
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
        onClick={() => handleMenuItemClick('moveDown')}
      >
        <ArrowDown size={14} className="mr-2" />
        하위 폴더로 이동
      </button>
      
      <hr className="my-1 border-gray-200" />
      
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 disabled:text-gray-400 disabled:hover:bg-white"
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

// 드래그 시작 시 성능 최적화를 위한 클래스 추가 함수
const optimizeDragPerformance = (enable) => {
  if (enable) {
    document.body.classList.add('dragging-active');
  } else {
    document.body.classList.remove('dragging-active');
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
    handleAddPrompt
  } = useAppContext();
  
  // 컨텍스트 메뉴 관리
  const { contextMenu, closeContextMenu, folderItemRef } = useContextMenu(folder.name);
  
  // 이름 변경 모드 상태
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const renameInputRef = useRef(null);
  
  // 폴더 이동 모드 상태
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [moveDirection, setMoveDirection] = useState(null);
  
  // 드래그 앤 드롭 상태를 Ref로 관리하여 리렌더링 방지
  const dragStateRef = useRef({
    isDragging: false,
    isDragOver: false
  });
  
  // UI 업데이트를 위한 최소한의 상태만 유지
  const [, forceUpdate] = useState({});
  
  // RAF 참조 저장
  const rafIdRef = useRef(null);
  
  const isSelected = selectedFolder === folder.name;
  const isExpanded = expandedFolders[folder.name];
  const hasChildren = folder.children && folder.children.length > 0;
  const isDefaultFolder = ['모든 프롬프트', '즐겨찾기'].includes(folder.name);
  
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
  const updateDragVisual = useCallback((isDraggedOver) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      // Ref를 사용하여 상태 업데이트
      dragStateRef.current.isDragOver = isDraggedOver;
      forceUpdate({}); // 필요한 경우에만 리렌더링 트리거
      rafIdRef.current = null;
    });
  }, []);
  
  // 아이콘 결정
  let FolderIcon = Folder;
  if (folder.name === '모든 프롬프트') {
    FolderIcon = Package;
  } else if (folder.name === '즐겨찾기') {
    FolderIcon = Star;
  } else if (isExpanded) {
    FolderIcon = FolderOpen;
  }
  
  // 폴더 클릭 처리
  const handleClick = () => {
    if (!isRenaming) {
      setSelectedFolder(folder.name);
      if (hasChildren) {
        toggleFolder(folder.name);
      }
    }
  };
  
  // 이름 변경 시작
  const startRenaming = () => {
    setIsRenaming(true);
    setNewName(folder.name);
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, 10);
  };
  
  // 이름 변경 적용
  const applyRename = async () => {
    if (newName.trim() && newName !== folder.name) {
      try {
        await updateFolder(folder.id, { name: newName.trim() });
        await loadData();
        if (selectedFolder === folder.name) {
          setSelectedFolder(newName.trim());
        }
      } catch (error) {
        console.error('폴더 이름 변경 실패:', error);
        alert('폴더 이름을 변경하는데 실패했습니다.');
      }
    }
    setIsRenaming(false);
  };
  
  // 폴더 삭제
  const handleDelete = async () => {
    if (['모든 프롬프트', '즐겨찾기'].includes(folder.name)) {
      alert('기본 폴더는 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm(`"${folder.name}" 폴더를 삭제하시겠습니까? 폴더 내 프롬프트가 있으면 삭제할 수 없습니다.`)) {
      return;
    }
    
    try {
      await deleteFolder(folder.id);
      await loadData();
      if (selectedFolder === folder.name) {
        setSelectedFolder('모든 프롬프트');
      }
    } catch (error) {
      console.error('폴더 삭제 실패:', error);
      alert('폴더를 삭제하는데 실패했습니다. 폴더 내 프롬프트가 있거나 하위 폴더가 있는지 확인하세요.');
    }
  };
  
  // 폴더 이동 관련 함수
  const startMove = (direction) => {
    setIsMoveMode(true);
    setMoveDirection(direction);
  };
  
  const handleMove = async (direction) => {
    startMove(direction);
  };
  
  const finishMove = async (targetFolderId) => {
    if (!targetFolderId) {
      setIsMoveMode(false);
      return;
    }
    
    try {
      await updateFolder(folder.id, {
        name: folder.name,
        parent_id: targetFolderId === 'root' ? null : targetFolderId
      });
      await loadData();
      setIsMoveMode(false);
    } catch (error) {
      console.error('폴더 이동 실패:', error);
      alert('폴더를 이동하는데 실패했습니다.');
      setIsMoveMode(false);
    }
  };
  
  // 이름 변경 관련 함수
  const cancelRename = () => setIsRenaming(false);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') applyRename();
    else if (e.key === 'Escape') cancelRename();
  };
  
  // 프롬프트 추가 함수
  const handleAddPromptToFolder = () => {
    handleAddPrompt(folder.id, folder.name);
  };
  
  // 드래그 앤 드롭 이벤트 핸들러 최적화
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    
    // 자기 자신이거나 특별 폴더인 경우 드롭 불가
    if (isDefaultFolder) {
      return;
    }
    
    // RAF를 사용하여 시각적 업데이트
    updateDragVisual(true);
  }, [isDefaultFolder, updateDragVisual]);
  
  const handleDragLeave = useCallback(() => {
    // RAF를 사용하여 시각적 업데이트
    updateDragVisual(false);
  }, [updateDragVisual]);
  
  // CSS 스타일 최적화를 위한 클래스 문자열 생성
  const folderItemClasses = `flex items-center py-1 px-2 hover:bg-blue-50 rounded cursor-pointer folder-item 
                           transition-all duration-150 ease-in-out
                           ${isSelected ? 'bg-blue-100' : ''}
                           ${dragStateRef.current.isDragging ? 'opacity-50' : ''}
                           ${dragStateRef.current.isDragOver ? 'bg-blue-100 border border-blue-400' : ''}`;
  
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
      folderName: folder.name
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
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    
    // Ref를 사용하여 상태 업데이트
    dragStateRef.current.isDragOver = false;
    forceUpdate({});
    
    // 특별 폴더인 경우 드롭 불가
    if (isDefaultFolder) {
      return;
    }
    
    try {
      // 드래그 데이터 가져오기
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const draggedFolderId = data.folderId;
      
      // 자기 자신에게 드롭하는 경우 무시
      if (draggedFolderId === folder.id) {
        return;
      }
      
      // 계층 구조에서 폴더 찾기
      const draggedFolder = findFolderById(folders, draggedFolderId);
      if (!draggedFolder) return;
      
      // 드래그한 폴더가 대상 폴더의 부모인 경우(순환 참조) 방지
      if (isDescendant(draggedFolder, folder.id)) {
        alert('폴더를 자신의 하위 폴더로 이동할 수 없습니다.');
        return;
      }
      
      // 폴더 이동 API 호출
      await updateFolder(draggedFolderId, {
        name: draggedFolder.name,
        parent_id: folder.id
      });
      
      // 데이터 다시 로드
      await loadData();
      
    } catch (error) {
      console.error('폴더 이동 실패:', error);
      alert('폴더를 이동하는데 실패했습니다.');
    }
  };
  
  return (
    <li className={`${isLast ? '' : 'mb-1'} relative`}>
      <div 
        className={folderItemClasses}
        onClick={handleClick}
        ref={folderItemRef}
        style={{ userSelect: 'none', position: 'relative', pointerEvents: 'auto' }}
        data-folder-id={folder.id}
        data-folder-name={folder.name}
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
        
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={applyRename}
            onKeyDown={handleKeyDown}
            className="flex-grow text-sm px-1 py-0.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-grow text-sm ${isSelected ? 'font-medium' : ''}`}>
            {folder.name}
          </span>
        )}
        
        {folder.count !== undefined && (
          <span className="text-gray-500 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
            {folder.count}
          </span>
        )}
      </div>
      
      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <ContextMenu 
          x={contextMenu.x}
          y={contextMenu.y}
          folder={folder}
          onClose={closeContextMenu}
          onRename={startRenaming}
          onDelete={handleDelete}
          onMove={handleMove}
          onAddPrompt={handleAddPromptToFolder}
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
                  onClick={() => finishMove('root')}
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
                  onClick={() => finishMove(f.id)}
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
  // 커스텀 비교 함수로 리렌더링 조건 최적화
  return (
    prevProps.folder.id === nextProps.folder.id &&
    prevProps.folder.name === nextProps.folder.name &&
    prevProps.folder.count === nextProps.folder.count &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.level === nextProps.level
  );
});

const FolderTree = React.memo(() => {
  const { folders, isLoading, loadData } = useAppContext();
  const rootDropAreaRef = useRef(null);
  
  // 드래그 상태를 Ref로 관리
  const dragStateRef = useRef({
    isRootDragOver: false
  });
  
  // UI 업데이트를 위한 최소한의 상태만 유지
  const [, forceUpdate] = useState({});
  
  // RAF 참조 저장
  const rafIdRef = useRef(null);
  
  // 드래그 시각적 피드백 업데이트를 위한 RAF 함수
  const updateRootDragVisual = useCallback((isDraggedOver) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      // Ref를 사용하여 상태 업데이트
      dragStateRef.current.isRootDragOver = isDraggedOver;
      forceUpdate({}); // 필요한 경우에만 리렌더링 트리거
      rafIdRef.current = null;
    });
  }, []);
  
  // 전역 onContextMenu 이벤트 핸들러 등록
  useEffect(() => {
    const handleGlobalContextMenu = (e) => {
      // 폴더 트리 외부의 우클릭 이벤트일 경우에만 처리
      if (!e.target.closest('.folder-item') && !e.target.closest('.contextMenu')) {
        // 모든 컨텍스트 메뉴를 닫기 위해 이벤트를 발생시킴
        const closeMenuEvent = new CustomEvent('closeContextMenu');
        document.dispatchEvent(closeMenuEvent);
      }
    };
    
    // 글로벌 컨텍스트 메뉴 이벤트 리스너 등록
    document.addEventListener('contextmenu', handleGlobalContextMenu);
    
    return () => {
      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
  }, []);
  
  // 루트 영역 드래그 앤 드롭 이벤트 핸들러 최적화
  const handleRootDragOver = useCallback((e) => {
    e.preventDefault();
    updateRootDragVisual(true);
  }, [updateRootDragVisual]);
  
  const handleRootDragLeave = useCallback(() => {
    updateRootDragVisual(false);
  }, [updateRootDragVisual]);
  
  const handleRootDrop = async (e) => {
    e.preventDefault();
    
    // Ref를 사용하여 상태 업데이트
    dragStateRef.current.isRootDragOver = false;
    forceUpdate({});
    
    try {
      // 드래그 데이터 가져오기
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const draggedFolderId = data.folderId;
      
      // 계층 구조에서 폴더 찾기
      const draggedFolder = findFolderById(folders, draggedFolderId);
      if (!draggedFolder) return;
      
      // 폴더 이동 API 호출 (parent_id를 null로 설정하여 최상위로 이동)
      await updateFolder(draggedFolderId, {
        name: draggedFolder.name,
        parent_id: null
      });
      
      // 데이터 다시 로드
      await loadData();
    } catch (error) {
      console.error('폴더 이동 실패:', error);
      alert('폴더를 이동하는데 실패했습니다.');
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
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);
  
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
          />
        ))}
      </ul>
      {dragStateRef.current.isRootDragOver && (
        <div className="text-center py-2 text-blue-600 text-sm">
          여기에 드롭하여 최상위 폴더로 이동
        </div>
      )}
    </div>
  );
});

export default FolderTree;
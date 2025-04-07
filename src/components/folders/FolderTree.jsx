import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Star, Folder, FolderOpen, Package, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { updateFolder, deleteFolder } from '../../api/folderApi';

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

// 컨텍스트 메뉴 컴포넌트
const ContextMenu = ({ x, y, folder, onClose, onRename, onDelete, onMove }) => {
  // 기본 폴더 여부 확인
  const isDefaultFolder = ['모든 프롬프트', '즐겨찾기'].includes(folder.name);
  
  // 메뉴 아이템 클릭 처리
  const handleMenuItemClick = (action) => {
    if (action === 'rename') onRename();
    if (action === 'delete') onDelete();
    if (action === 'moveUp') onMove('up');
    if (action === 'moveDown') onMove('down');
    onClose();
  };
  
  // 외부 클릭 감지를 위한 ref
  const menuRef = useRef(null);
  
  // 메뉴 위치 조정을 위한 상태
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });
  
  useEffect(() => {
    // 메뉴가 화면 밖으로 나가지 않도록 위치 조정
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedX = x;
      let adjustedY = y;
      
      // X 좌표 조정 (화면 오른쪽 경계 확인)
      if (x + menuRect.width > viewportWidth) {
        adjustedX = Math.max(0, x - menuRect.width);
      }
      
      // Y 좌표 조정 (화면 하단 경계 확인)
      if (y + menuRect.height > viewportHeight) {
        adjustedY = Math.max(0, y - menuRect.height);
      }
      
      // 위치 업데이트
      setAdjustedPosition({ x: adjustedX, y: adjustedY });
      
      // 디버깅을 위한 로그 추가
      console.log('메뉴 크기:', menuRect.width, menuRect.height);
      console.log('조정된 위치:', adjustedX, adjustedY);
    }
  }, [x, y]);
  
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !e.target.closest('.folder-item')) {
        onClose();
      }
    };
    
    // 리스너 등록
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('contextmenu', handleOutsideClick);
    
    return () => {
      // 리스너 제거
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('contextmenu', handleOutsideClick);
    };
  }, [onClose]);
  
  return (
    <div 
      ref={menuRef}
      className="fixed bg-white shadow-lg border rounded-lg py-1 z-[9999] contextMenu"
      style={{ 
        left: `${adjustedPosition.x}px`, 
        top: `${adjustedPosition.y}px`,
        minWidth: '180px',
        maxWidth: '250px'
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
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

const FolderItem = ({ folder, level = 0, isLast = false }) => {
  const { 
    selectedFolder, 
    setSelectedFolder, 
    expandedFolders, 
    toggleFolder,
    loadData,
    folders
  } = useAppContext();
  
  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0
  });
  
  // 폴더 아이템 ref 추가
  const folderItemRef = useRef(null);
  
  // 상태 변경 테스트용 로그
  useEffect(() => {
    console.log('컨텍스트 메뉴 상태 변경:', contextMenu);
  }, [contextMenu]);
  
  // 직접 DOM 이벤트 리스너 추가
  useEffect(() => {
    const folderElement = folderItemRef.current;
    if (folderElement) {
      const handleNativeContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('네이티브 우클릭 이벤트 발생:', folder.name);
        
        // 다른 열린 컨텍스트 메뉴 닫기 이벤트 발생
        const closeMenuEvent = new CustomEvent('closeContextMenu');
        document.dispatchEvent(closeMenuEvent);
        
        // 폴더 요소의 위치와 크기 정보 가져오기
        const rect = folderElement.getBoundingClientRect();
        
        // 컨텍스트 메뉴를 폴더 영역의 오른쪽에 표시
        const menuX = rect.right;
        const menuY = rect.top;
        
        console.log('폴더 영역:', rect);
        console.log('메뉴 위치:', menuX, menuY);
        
        // 폴더 항목 오른쪽에 컨텍스트 메뉴 표시
        setContextMenu({
          visible: true,
          x: menuX,
          y: menuY
        });
        
        return false;
      };
      
      folderElement.addEventListener('contextmenu', handleNativeContextMenu);
      
      return () => {
        folderElement.removeEventListener('contextmenu', handleNativeContextMenu);
      };
    }
  }, [folder.name]);
  
  // 컨텍스트 메뉴 닫기
  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };
  
  // 다른 컨텍스트 메뉴 닫기 이벤트 리스너
  useEffect(() => {
    const handleCloseContextMenu = () => {
      closeContextMenu();
    };
    
    document.addEventListener('closeContextMenu', handleCloseContextMenu);
    return () => {
      document.removeEventListener('closeContextMenu', handleCloseContextMenu);
    };
  }, []);
  
  // 외부 클릭 감지 처리
  useEffect(() => {
    if (!contextMenu.visible) return;
    
    // 약간의 지연을 두어 컨텍스트 메뉴가 표시된 직후에 이벤트가 발생하지 않도록 함
    const timeoutId = setTimeout(() => {
      const handleOutsideClick = (event) => {
        // 컨텍스트 메뉴 자체를 클릭한 경우는 무시
        if (event.target.closest('.contextMenu')) {
          return;
        }
        
        // 폴더 아이템을 클릭한 경우도 무시 (이미 handleContextMenu에서 처리됨)
        if (event.target.closest('.folder-item')) {
          return;
        }
        
        // 그 외의 경우 컨텍스트 메뉴 닫기
        closeContextMenu();
      };
      
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('contextmenu', handleOutsideClick);
      
      return () => {
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('contextmenu', handleOutsideClick);
      };
    }, 100); // 100ms 지연
    
    return () => clearTimeout(timeoutId);
  }, [contextMenu.visible]);
  
  // 이름 변경 모드 상태
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const renameInputRef = useRef(null);
  
  // 폴더 이동 모드 상태
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveDirection, setMoveDirection] = useState(null);
  
  const isSelected = selectedFolder === folder.name;
  const isExpanded = expandedFolders[folder.name];
  const hasChildren = folder.children && folder.children.length > 0;
  
  // 아이콘 결정
  let FolderIcon = Folder;
  if (folder.name === '모든 프롬프트') {
    FolderIcon = Package;
  } else if (folder.name === '즐겨찾기') {
    FolderIcon = Star;
  } else if (isExpanded) {
    FolderIcon = FolderOpen;
  }
  
  // 클릭 핸들러
  const handleClick = () => {
    if (!isRenaming) {
      setSelectedFolder(folder.name);
      if (hasChildren) {
        toggleFolder(folder.name);
      }
    }
  };
  
  // 이름 변경 모드 시작
  const startRenaming = () => {
    setIsRenaming(true);
    setNewName(folder.name);
    // 이름 변경 입력란에 포커스를 주기 위해 setTimeout 사용
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
        // 데이터 다시 로드
        await loadData();
        // 이름이 변경된 폴더가 현재 선택된 폴더라면 선택된 폴더 이름도 업데이트
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
    // 기본 폴더는 삭제 불가
    if (['모든 프롬프트', '즐겨찾기'].includes(folder.name)) {
      alert('기본 폴더는 삭제할 수 없습니다.');
      return;
    }

    // 확인 대화상자
    if (!window.confirm(`"${folder.name}" 폴더를 삭제하시겠습니까? 폴더 내 프롬프트가 있으면 삭제할 수 없습니다.`)) {
      return;
    }
    
    try {
      await deleteFolder(folder.id);
      await loadData();
      // 삭제된 폴더가 현재 선택된 폴더라면 '모든 프롬프트'로 변경
      if (selectedFolder === folder.name) {
        setSelectedFolder('모든 프롬프트');
      }
    } catch (error) {
      console.error('폴더 삭제 실패:', error);
      alert('폴더를 삭제하는데 실패했습니다. 폴더 내 프롬프트가 있거나 하위 폴더가 있는지 확인하세요.');
    }
  };
  
  // 폴더 이동 시작
  const startMove = (direction) => {
    setIsMoveMode(true);
    setMoveDirection(direction);
  };
  
  // 폴더 이동
  const handleMove = async (direction) => {
    startMove(direction);
  };
  
  // 폴더 이동 완료
  const finishMove = async (targetFolderId) => {
    if (!targetFolderId) {
      setIsMoveMode(false);
      return;
    }
    
    try {
      const updatedData = {
        // 상위 폴더로 이동하는 경우 parent_id를 targetFolderId로 설정
        // 최상위 폴더로 이동하는 경우 null로 설정
        parent_id: targetFolderId === 'root' ? null : targetFolderId
      };
      
      await updateFolder(folder.id, updatedData);
      await loadData();
      setIsMoveMode(false);
    } catch (error) {
      console.error('폴더 이동 실패:', error);
      alert('폴더를 이동하는데 실패했습니다.');
      setIsMoveMode(false);
    }
  };
  
  // 이름 변경 취소
  const cancelRename = () => {
    setIsRenaming(false);
  };
  
  // 엔터 키 처리
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      applyRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };
  
  return (
    <li className={`${isLast ? '' : 'mb-1'} relative`}>
      <div 
        className={`flex items-center py-1 px-2 hover:bg-blue-50 rounded cursor-pointer folder-item
                   ${isSelected ? 'bg-blue-100' : ''}`}
        onClick={handleClick}
        ref={folderItemRef}
        style={{ userSelect: 'none', position: 'relative', pointerEvents: 'auto' }}
        data-folder-id={folder.id}
        data-folder-name={folder.name}
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
      
      {/* 폴더 이동 모드에서의 상위/하위 폴더 선택 UI */}
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
              {/* 최상위 폴더 옵션 */}
              {moveDirection === 'up' && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b"
                  onClick={() => finishMove('root')}
                >
                  최상위 폴더 (루트)
                </button>
              )}
              
              {/* 폴더 목록 */}
              {moveDirection === 'up' ? (
                // 상위 폴더로 이동 가능한 폴더 목록
                // 자기 자신과 자신의 하위 폴더는 제외
                folders
                  .filter(f => 
                    f.id !== folder.id && 
                    !isDescendant(f, folder.id)
                  )
                  .map(f => (
                    <button
                      key={f.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b"
                      onClick={() => finishMove(f.id)}
                    >
                      {f.name}
                    </button>
                  ))
              ) : (
                // 하위 폴더로 이동시 표시할 폴더 목록 
                // 현재 폴더의 형제 폴더들
                folders
                  .filter(f => 
                    f.id !== folder.id && 
                    f.parent_id === folder.parent_id
                  )
                  .map(f => (
                    <button
                      key={f.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b"
                      onClick={() => finishMove(f.id)}
                    >
                      {f.name}
                    </button>
                  ))
              )}
              
              {/* 이동 가능한 폴더가 없는 경우 */}
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
};

const FolderTree = () => {
  const { folders, isLoading } = useAppContext();
  
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
  
  if (isLoading && folders.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        폴더 정보를 불러오는 중...
      </div>
    );
  }
  
  return (
    <ul className="list-none folder-tree-container">
      {folders.map((folder, index) => (
        <FolderItem 
          key={folder.id} 
          folder={folder} 
          isLast={index === folders.length - 1}
        />
      ))}
    </ul>
  );
};

export default FolderTree;
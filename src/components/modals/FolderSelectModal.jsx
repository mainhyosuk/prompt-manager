import React, { useState, useEffect, useMemo } from 'react';
import { Folder, ChevronRight, ChevronDown, CheckCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// 폴더 아이템을 재귀적으로 렌더링하는 컴포넌트
const FolderItem = ({ folder, level, onSelect, selectedFolderId, toggleExpand, isExpanded, expandedFolderIds }) => {
  const hasChildren = folder.children && folder.children.length > 0;

  const handleSelect = (e) => {
    e.stopPropagation();
    onSelect(folder.id);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    toggleExpand(folder.id);
  };

  return (
    <div className="folder-item-container">
      <div 
        className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 ${selectedFolderId === folder.id ? 'bg-blue-50' : ''}`}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }} // 들여쓰기
        onClick={handleSelect} // 폴더 이름 클릭 시 선택
      >
        {hasChildren ? (
          <button onClick={handleToggle} className="mr-1 p-0.5 rounded hover:bg-gray-200">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="w-5 mr-1"></div> // 아이콘 자리 유지
        )}
        <Folder size={18} className={`mr-2 ${selectedFolderId === folder.id ? 'text-blue-600' : 'text-yellow-500'}`} />
        <span className="flex-grow truncate">{folder.name}</span>
        {selectedFolderId === folder.id && (
          <CheckCircle size={16} className="text-green-600 ml-2 flex-shrink-0" />
        )}
      </div>
      {/* 자식 폴더 렌더링 */}
      {hasChildren && isExpanded && (
        <div className="children-container pl-4 border-l border-gray-200 ml-2.5">
          {folder.children.map(child => (
            <FolderItem 
              key={child.id}
              folder={child}
              level={level + 1}
              onSelect={onSelect}
              selectedFolderId={selectedFolderId}
              toggleExpand={toggleExpand}
              isExpanded={!!expandedFolderIds[child.id]}
              expandedFolderIds={expandedFolderIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 메인 모달 컴포넌트
const FolderSelectModal = ({ isOpen, onClose, onFolderSelect }) => {
  const { folders } = useAppContext(); // AppContext에서 폴더 목록 가져오기
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState({});

  // 디버깅: 모달이 열릴 때 받는 folders prop 로그
  useEffect(() => {
    if (isOpen) {
      // 디버깅 로그 제거
      // console.log('[FolderSelectModal] Modal opened. Received folders:', JSON.stringify(folders));
    }
  }, [isOpen, folders]);

  // 폴더 데이터를 계층 구조로 변환 (백엔드 데이터 구조 활용)
  const folderTree = useMemo(() => {
    if (!folders || folders.length === 0) return [];
    // 디버깅 로그 제거
    // console.log('[FolderSelectModal] Calculating tree using received folders...');

    // 백엔드에서 이미 계층 구조로 오므로, 특수 폴더(-1, -2)만 필터링
    const filteredFolders = folders.filter(folder => folder.id > 0); 

    // 정렬 함수 (재귀) - 백엔드 정렬을 믿지만, 혹시 모르니 추가
    const sortFolders = (folderList) => {
        if (!folderList) return;
        folderList.sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
        folderList.forEach(f => {
            if (f.children && f.children.length > 0) {
                sortFolders(f.children);
            }
        });
    };
    sortFolders(filteredFolders);
    
    // 디버깅 로그 제거
    // console.log('[FolderSelectModal] Final folderTree (using filtered backend data):', JSON.stringify(filteredFolders, null, 2));
    return filteredFolders;
  }, [folders]);

  // 폴더 확장/축소 토글
  const toggleExpand = (folderId) => {
    setExpandedFolderIds(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // 폴더 선택 처리
  const handleSelectFolder = (folderId) => {
    setSelectedFolderId(folderId);
  };

  // '선택' 버튼 클릭
  const handleConfirm = () => {
    if (selectedFolderId !== null) {
      onFolderSelect(selectedFolderId);
      onClose(); // 모달 닫기
    }
  };

  // 모달 닫기 처리
  const handleClose = () => {
    setSelectedFolderId(null); // 선택 초기화
    setExpandedFolderIds({}); // 확장 상태 초기화
    onClose();
  };

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && event.target.closest('.folder-select-modal-content') === null) {
         handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="folder-select-modal-content bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">폴더 선택</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="p-4 overflow-y-auto flex-grow">
          {folderTree.length > 0 ? (
             folderTree.map(folder => (
               <FolderItem
                 key={folder.id}
                 folder={folder}
                 level={0}
                 onSelect={handleSelectFolder}
                 selectedFolderId={selectedFolderId}
                 toggleExpand={toggleExpand}
                 isExpanded={!!expandedFolderIds[folder.id]}
                 expandedFolderIds={expandedFolderIds}
               />
             ))
          ) : (
            <p className="text-gray-500">폴더가 없습니다.</p>
          )}
        </div>
        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedFolderId === null}
            className={`px-4 py-2 rounded-md text-white ${selectedFolderId !== null ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            선택
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderSelectModal;
import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { createFolder } from '../../api/folderApi';

const FolderSelector = ({ selectedFolder, setSelectedFolder }) => {
  const { folders, loadData } = useAppContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState(null);
  
  // 폴더 선택
  const handleSelectFolder = (folderId, folderName) => {
    setSelectedFolder({
      id: folderId,
      name: folderName
    });
    setIsDropdownOpen(false);
  };
  
  // 새 폴더 생성
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const newFolder = await createFolder({
        name: newFolderName.trim(),
        parent_id: parentFolderId
      });
      
      // 폴더 목록 갱신
      await loadData();
      
      // 생성한 폴더 선택
      handleSelectFolder(newFolder.id, newFolder.name);
      
      // 입력 필드 초기화
      setNewFolderName('');
      setIsAddingFolder(false);
    } catch (error) {
      console.error('폴더 생성 오류:', error);
      alert('폴더 생성에 실패했습니다.');
    }
  };
  
  // 계층적 폴더 목록 렌더링
  const renderFolderList = (folderList, level = 0) => {
    return folderList.map(folder => (
      <React.Fragment key={folder.id}>
        <button
          type="button"
          onClick={() => handleSelectFolder(folder.id, folder.name)}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 
                     ${selectedFolder?.id === folder.id ? 'bg-blue-50 text-blue-600' : ''}
                     ${level > 0 ? `pl-${level * 3 + 3}` : ''}`}
        >
          {folder.name}
        </button>
        
        {folder.children && folder.children.length > 0 && (
          renderFolderList(folder.children, level + 1)
        )}
      </React.Fragment>
    ));
  };
  
  // 부모 폴더 선택 옵션 렌더링
  const renderParentFolderOptions = (folderList, level = 0) => {
    return folderList.map(folder => (
      <React.Fragment key={folder.id}>
        <option 
          value={folder.id}
          className={level > 0 ? `pl-${level * 2}` : ''}
        >
          {level > 0 ? '\u00A0'.repeat(level * 2) + '└ ' : ''}{folder.name}
        </option>
        
        {folder.children && folder.children.length > 0 && (
          renderParentFolderOptions(folder.children, level + 1)
        )}
      </React.Fragment>
    ));
  };
  
  return (
    <div className="mb-4">
      <label htmlFor="folder" className="block font-medium text-gray-700 mb-1">
        폴더
      </label>
      
      {/* 폴더 선택 드롭다운 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <span>{selectedFolder ? selectedFolder.name : '폴더 선택'}</span>
          <ChevronDown size={16} />
        </button>
        
        {isDropdownOpen && (
          <div className="absolute z-10 mt-1 w-full border rounded-lg shadow-lg bg-white max-h-60 overflow-auto">
            {/* 새 폴더 생성 버튼 */}
            <div className="sticky top-0 bg-white border-b">
              <button
                type="button"
                onClick={() => setIsAddingFolder(!isAddingFolder)}
                className="w-full flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
              >
                <Plus size={16} className="mr-1" />
                새 폴더 생성
              </button>
            </div>
            
            {/* 새 폴더 생성 폼 */}
            {isAddingFolder && (
              <div className="p-3 border-b">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="새 폴더 이름"
                  className="w-full px-3 py-2 border rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                
                <div className="flex items-center mb-2">
                  <label className="text-sm text-gray-600 mr-2">부모 폴더:</label>
                  <select
                    value={parentFolderId || ''}
                    onChange={(e) => setParentFolderId(e.target.value ? Number(e.target.value) : null)}
                    className="flex-grow px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">최상위 폴더</option>
                    {renderParentFolderOptions(folders)}
                  </select>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddingFolder(false)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 mr-2"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-sm"
                  >
                    생성
                  </button>
                </div>
              </div>
            )}
            
            {/* 폴더 목록 */}
            <div>
              {renderFolderList(folders)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderSelector;
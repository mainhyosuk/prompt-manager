import React from 'react';
import { ChevronDown, ChevronRight, Star, Folder, FolderOpen, Package } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const FolderItem = ({ folder, level = 0, isLast = false }) => {
  const { 
    selectedFolder, 
    setSelectedFolder, 
    expandedFolders, 
    toggleFolder 
  } = useAppContext();
  
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
  
  return (
    <li className={`${isLast ? '' : 'mb-1'}`}>
      <div 
        className={`flex items-center py-1 px-2 hover:bg-blue-50 rounded cursor-pointer 
                   ${isSelected ? 'bg-blue-100' : ''}`}
        onClick={() => {
          setSelectedFolder(folder.name);
          if (hasChildren) {
            toggleFolder(folder.name);
          }
        }}
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
        
        <span className={`flex-grow text-sm ${isSelected ? 'font-medium' : ''}`}>
          {folder.name}
        </span>
        
        {folder.count !== undefined && (
          <span className="text-gray-500 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
            {folder.count}
          </span>
        )}
      </div>
      
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
    </li>
  );
};

const FolderTree = () => {
  const { folders, isLoading } = useAppContext();
  
  if (isLoading && folders.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        폴더 정보를 불러오는 중...
      </div>
    );
  }
  
  return (
    <ul className="list-none">
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
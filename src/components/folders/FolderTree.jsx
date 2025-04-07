import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const FolderTree = ({ 
  folders, 
  selectedFolder, 
  setSelectedFolder, 
  expandedFolders, 
  toggleFolder, 
  level = 0 
}) => {
  return (
    <ul className={`pl-${level > 0 ? 4 : 0} list-none`}>
      {folders.map(folder => (
        <li key={folder.id} className="mb-1">
          <div 
            className={`flex items-center py-1 px-2 hover:bg-blue-50 rounded ${selectedFolder === folder.name ? 'bg-blue-100' : ''}`}
            onClick={() => {
              setSelectedFolder(folder.name);
              if (folder.children) {
                toggleFolder(folder.name);
              }
            }}
          >
            {folder.children && (
              <span className="mr-1">
                {expandedFolders[folder.name] ? 
                  <ChevronDown size={16} className="text-gray-500" /> : 
                  <ChevronRight size={16} className="text-gray-500" />
                }
              </span>
            )}
            <span className="flex-grow">{folder.name}</span>
            {folder.count !== undefined && <span className="text-gray-500 text-sm">{folder.count}</span>}
          </div>
          {folder.children && expandedFolders[folder.name] && (
            <FolderTree 
              folders={folder.children} 
              selectedFolder={selectedFolder} 
              setSelectedFolder={setSelectedFolder}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              level={level + 1} 
            />
          )}
        </li>
      ))}
    </ul>
  );
};

export default FolderTree;
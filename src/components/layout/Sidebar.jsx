import React from 'react';
import { FolderPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import FolderTree from '../folders/FolderTree';
import TagList from '../tags/TagList';

const Sidebar = ({ selectedFolder, setSelectedFolder }) => {
  const { expandedFolders, toggleFolder } = useAppContext();
  
  // 샘플 폴더 데이터
  const folders = [
    { id: 1, name: '모든 프롬프트', count: 24 },
    { id: 2, name: '즐겨찾기', count: 5 },
    { id: 3, name: '업무', children: [
      { id: 4, name: '마케팅', count: 8 },
      { id: 5, name: '개발', count: 12 },
    ]},
    { id: 6, name: '개인', count: 4 },
  ];
  
  // 샘플 태그 데이터
  const tags = [
    { id: 1, name: 'GPT-4', count: 14, color: 'blue' },
    { id: 2, name: 'Claude', count: 8, color: 'sky' },
    { id: 3, name: '요약', count: 10, color: 'green' },
    { id: 4, name: '번역', count: 7, color: 'amber' },
    { id: 5, name: '코드생성', count: 6, color: 'purple' },
  ];
  
  return (
    <div className="w-64 border-r bg-white p-4">
      <h2 className="text-xl font-bold mb-4">프롬프트 관리</h2>
      
      {/* 폴더 섹션 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-gray-700">폴더</h3>
          <button className="text-gray-500 hover:text-blue-600">
            <FolderPlus size={16} />
          </button>
        </div>
        <FolderTree 
          folders={folders} 
          selectedFolder={selectedFolder} 
          setSelectedFolder={setSelectedFolder}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
        />
      </div>
      
      {/* 태그 섹션 */}
      <div>
        <h3 className="font-medium text-gray-700 mb-2">태그</h3>
        <TagList tags={tags} />
      </div>
    </div>
  );
};

export default Sidebar;
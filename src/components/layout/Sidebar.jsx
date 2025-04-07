import React from 'react';
import { FolderPlus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import FolderTree from '../folders/FolderTree';
import TagList from '../tags/TagList';

const Sidebar = () => {
  const { tags, isLoading } = useAppContext();
  
  return (
    <div className="w-64 border-r bg-white p-4 overflow-y-auto">
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
    </div>
  );
};

export default Sidebar;
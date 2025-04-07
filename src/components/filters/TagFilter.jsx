import React from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const TagFilter = () => {
  const { tags, filterTags, setFilterTags, getTagColorClasses } = useAppContext();
  
  const toggleTagFilter = (tagName) => {
    setFilterTags(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(t => t !== tagName);
      } else {
        return [...prev, tagName];
      }
    });
  };
  
  const clearFilters = () => {
    setFilterTags([]);
  };
  
  // 태그를 사용 개수 순으로 정렬
  const sortedTags = [...tags].sort((a, b) => b.count - a.count);
  
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">태그로 필터링</h3>
        {filterTags.length > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            필터 초기화
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {sortedTags.map(tag => (
          <button
            key={tag.id}
            onClick={() => toggleTagFilter(tag.name)}
            className={`px-3 py-1 rounded-full text-sm border flex items-center gap-1
              ${filterTags.includes(tag.name) 
                ? 'border-blue-500 bg-blue-50' 
                : `${getTagColorClasses(tag.color)} opacity-80 hover:opacity-100`
              }`}
          >
            {tag.name}
            <span className="text-xs text-gray-500">({tag.count})</span>
            {filterTags.includes(tag.name) && (
              <X size={14} className="ml-1" />
            )}
          </button>
        ))}
        
        {tags.length === 0 && (
          <p className="text-sm text-gray-500">사용 가능한 태그가 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default TagFilter;
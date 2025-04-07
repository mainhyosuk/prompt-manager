import React from 'react';
import { useAppContext } from '../../context/AppContext';

const TagList = ({ tags }) => {
  const { getTagColorClasses } = useAppContext();
  
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <div 
          key={tag.id} 
          className={`flex items-center rounded-full px-3 py-1 text-sm border ${getTagColorClasses(tag.color)}`}
        >
          <span>{tag.name}</span>
          <span className="ml-1 text-xs text-gray-500">({tag.count})</span>
        </div>
      ))}
    </div>
  );
};

export default TagList;
import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { createTag } from '../../api/tagApi';

const TagSelector = ({ selectedTags, setSelectedTags }) => {
  const { tags, getTagColorClasses, loadData } = useAppContext();
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagColor, setTagColor] = useState('blue');
  
  // 태그를 이미 선택했는지 확인
  const isTagSelected = (tagId) => {
    return selectedTags.some(tag => tag.id === tagId);
  };
  
  // 태그 선택/해제
  const toggleTag = (tag) => {
    if (isTagSelected(tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // 새 태그 생성
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const newTag = await createTag({
        name: newTagName.trim(),
        color: tagColor
      });
      
      // 태그 목록 갱신
      await loadData();
      
      // 생성한 태그 선택
      if (!isTagSelected(newTag.id)) {
        setSelectedTags([...selectedTags, newTag]);
      }
      
      // 입력 필드 초기화
      setNewTagName('');
      setIsAddingTag(false);
    } catch (error) {
      console.error('태그 생성 오류:', error);
      alert('태그 생성에 실패했습니다.');
    }
  };
  
  // 태그 색상 옵션
  const colorOptions = [
    { name: '파랑', value: 'blue' },
    { name: '하늘', value: 'sky' },
    { name: '초록', value: 'green' },
    { name: '노랑', value: 'amber' },
    { name: '보라', value: 'purple' },
    { name: '분홍', value: 'pink' },
    { name: '빨강', value: 'red' }
  ];
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-700">태그</h3>
        <button
          type="button"
          onClick={() => setIsAddingTag(!isAddingTag)}
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
        >
          {isAddingTag ? (
            <>
              <X size={16} className="mr-1" />
              취소
            </>
          ) : (
            <>
              <Plus size={16} className="mr-1" />
              새 태그
            </>
          )}
        </button>
      </div>
      
      {/* 선택된 태그 표시 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {selectedTags.map(tag => (
          <div 
            key={tag.id}
            className={`px-3 py-1 rounded-full text-sm border flex items-center ${getTagColorClasses(tag.color)}`}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => toggleTag(tag)}
              className="ml-1 text-gray-500 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        
        {selectedTags.length === 0 && (
          <p className="text-sm text-gray-500">
            선택된 태그가 없습니다.
          </p>
        )}
      </div>
      
      {/* 새 태그 생성 폼 */}
      {isAddingTag && (
        <div className="p-3 border rounded-lg bg-gray-50 mb-3">
          <div className="flex mb-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="새 태그 이름"
              className="flex-grow px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-sm"
            >
              태그 생성
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {colorOptions.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={() => setTagColor(color.value)}
                className={`w-6 h-6 rounded-full border ${
                  tagColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
                style={{ backgroundColor: getComputedColorClass(color.value) }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* 사용 가능한 태그 목록 */}
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors
              ${isTagSelected(tag.id) 
                ? 'bg-gray-100 text-gray-600 border-gray-300' 
                : `${getTagColorClasses(tag.color)}`
              }`}
          >
            {tag.name}
          </button>
        ))}
        
        {tags.length === 0 && (
          <p className="text-sm text-gray-500">
            사용 가능한 태그가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
};

// 색상 이름에 맞는 CSS 배경색 가져오기
function getComputedColorClass(color) {
  const colorMap = {
    blue: '#dbeafe',
    sky: '#e0f2fe',
    green: '#dcfce7',
    amber: '#fef3c7',
    purple: '#f3e8ff',
    pink: '#fce7f3',
    red: '#fee2e2'
  };
  
  return colorMap[color] || '#f3f4f6';
}

export default TagSelector;
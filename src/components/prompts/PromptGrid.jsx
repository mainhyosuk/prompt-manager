import React from 'react';
// import BasePromptCard from '../cards/BasePromptCard'; // BasePromptCard import 제거
import PromptCard from './PromptCard'; // PromptCard import 추가
import { Check } from 'lucide-react';

const PromptGrid = ({ prompts, selectedIds, onToggleSelect, onCardClick, isMultiSelectMode }) => {
  // 디버깅 로그 제거
  // console.log('PromptGrid rendering, isMultiSelectMode:', isMultiSelectMode);

  if (!prompts || prompts.length === 0) {
    return <p className="text-center text-gray-500">표시할 프롬프트가 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {prompts.map(prompt => {
        const isSelected = selectedIds.includes(prompt.id);

        const handleCardClick = () => {
          if (isMultiSelectMode) {
            onToggleSelect(prompt.id);
          } else {
            onCardClick(prompt);
          }
        };

        const handleCheckboxClick = (e) => {
          e.stopPropagation();
          onToggleSelect(prompt.id);
        };

        return (
          <div
            key={prompt.id}
            className={`relative group rounded-lg cursor-pointer transition-all duration-150 ease-in-out 
                       ${isMultiSelectMode && isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md' : ''} 
                       ${isMultiSelectMode && !isSelected ? 'hover:shadow-md hover:ring-1 hover:ring-gray-300' : ''}`}
            onClick={handleCardClick}
          >
            {isMultiSelectMode && (
              <div
                className={`absolute top-2 left-2 z-20 w-5 h-5 border rounded flex items-center justify-center transition-opacity duration-150 ease-in-out 
                           ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}
                onClick={handleCheckboxClick}
                title={isSelected ? "선택 해제" : "선택"}
              >
                {isSelected && <Check size={14} className="text-white" style={{ color: 'white' }} />}
              </div>
            )}

            <PromptCard
              prompt={prompt}
              isMultiSelectMode={isMultiSelectMode}
            />
          </div>
        );
      })}
    </div>
  );
};

export default PromptGrid;
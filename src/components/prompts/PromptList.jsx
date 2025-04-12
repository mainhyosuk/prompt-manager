import React from 'react';
import { Star, Edit, Trash2, Check, Clock, User } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const PromptList = ({ prompts, selectedIds, onToggleSelect, onCardClick, isMultiSelectMode }) => {
  const { 
    getTagColorClasses, 
    handleToggleFavorite,
    handleEditPrompt,
    handleDeletePrompt
  } = useAppContext();
  
  if (!prompts || prompts.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        표시할 프롬프트가 없습니다.
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {prompts.map(prompt => {
        const isSelected = selectedIds.includes(prompt.id);

        const handleItemClick = () => {
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

        const handleActionClick = (action, e) => {
          e.stopPropagation();
          action();
        };

        return (
          <div
            key={prompt.id}
            className={`group flex items-center p-3 border rounded-lg cursor-pointer transition-colors relative 
                       ${isMultiSelectMode && isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white hover:bg-gray-50'}`}
            onClick={handleItemClick}
          >
            {isMultiSelectMode && (
              <div className="mr-3 flex-shrink-0">
                <div
                  className={`w-5 h-5 border rounded flex items-center justify-center transition-colors 
                             ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}
                  onClick={handleCheckboxClick}
                  title={isSelected ? "선택 해제" : "선택"}
                >
                  {isSelected && <Check size={14} className="text-white" style={{ color: 'white' }}/>}
                </div>
              </div>
            )}

            <div className="flex-grow min-w-0">
              <div className="flex items-center mb-1">
                <h3 className="font-medium truncate text-gray-800" title={prompt.title}>{prompt.title}</h3>
                {!isMultiSelectMode && prompt.is_favorite && (
                  <Star className="w-4 h-4 ml-2 text-yellow-400 flex-shrink-0" title="즐겨찾기" />
                )}
              </div>
              <p className="text-sm text-gray-600 truncate line-clamp-1" title={prompt.content}>{prompt.content}</p>
            </div>

            <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-xs text-gray-500">
                 {prompt.tags.slice(0, 2).map(tag => (
                    <span
                      key={tag.id}
                      className={`px-2 py-0.5 rounded-full ${getTagColorClasses(tag.color)}`}
                    >
                      {tag.name}
                    </span>
                 ))}
                 {prompt.tags.length > 2 && (
                   <span className="text-xs text-gray-500">+{prompt.tags.length - 2}</span>
                 )}
                 {prompt.folder && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full" title={prompt.folder}>
                      {prompt.folder}
                    </span>
                 )}
                <span className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  {prompt.last_used}
                </span>
                <span className="flex items-center">
                  <User size={12} className="mr-1" />
                  {prompt.use_count || 0}회
                </span>
              </div>

              {!isMultiSelectMode && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <button
                    onClick={(e) => handleActionClick(() => handleToggleFavorite(prompt.id), e)}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-yellow-500"
                    title={prompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  >
                    <Star className={prompt.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''} size={16} />
                  </button>
                  <button
                    onClick={(e) => handleActionClick(() => handleEditPrompt(prompt), e)}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-500"
                    title="편집"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => handleActionClick(() => handleDeletePrompt(prompt.id), e)}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-red-500"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PromptList;
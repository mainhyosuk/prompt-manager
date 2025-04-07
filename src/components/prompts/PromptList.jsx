import React from 'react';
import { Star, Clock, Edit, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const PromptList = ({ prompts }) => {
  const { 
    getTagColorClasses, 
    handleViewPrompt,
    handleToggleFavorite,
    handleEditPrompt,
    handleDeletePrompt
  } = useAppContext();
  
  if (prompts.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        표시할 프롬프트가 없습니다.
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {prompts.map(prompt => (
        <div 
          key={prompt.id} 
          className="flex items-center bg-white p-3 border rounded-lg hover:shadow-sm cursor-pointer relative group"
          onClick={() => handleViewPrompt(prompt)}
        >
          <div className="flex-grow">
            <div className="flex items-center">
              <h3 className="font-medium">{prompt.title}</h3>
              {prompt.is_favorite && (
                <Star className="w-4 h-4 ml-2 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 line-clamp-1">{prompt.content}</p>
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center">
              <Clock size={12} className="mr-1" />
              {prompt.last_used}
            </span>
            
            <span className="flex flex-wrap gap-1">
              {prompt.tags.map((tag) => (
                <span 
                  key={tag.id} 
                  className={`px-2 rounded-full border ${getTagColorClasses(tag.color)}`}
                >
                  {tag.name}
                </span>
              ))}
            </span>
            
            <span>{prompt.folder}</span>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(prompt.id);
                }}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-yellow-500"
                title={prompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              >
                <Star className={prompt.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''} size={16} />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPrompt(prompt);
                }}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-blue-500"
                title="편집"
              >
                <Edit size={16} />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePrompt(prompt.id);
                }}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-red-500"
                title="삭제"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PromptList;
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { copyToClipboard } from '../../utils/clipboard';

const PromptItemCard = ({ 
  prompt, 
  onRemoveFromCollection,
  onClick 
}) => {
  const { getTagColorClasses, handleToggleFavorite, handleRecordUsage, handleEditPrompt } = useAppContext();
  
  // 텍스트 길이 제한 함수
  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // 클립보드 복사 핸들러
  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await copyToClipboard(prompt.content);
      
      // 사용 기록 업데이트
      handleRecordUsage(prompt.id);
    } catch (error) {
      console.error('클립보드 복사 오류:', error);
    }
  };
  
  // 즐겨찾기 토글 핸들러
  const handleFavoriteToggle = (e) => {
    e.stopPropagation();
    handleToggleFavorite(prompt.id);
  };
  
  // 편집 핸들러
  const handleEdit = (e) => {
    e.stopPropagation();
    handleEditPrompt(prompt);
  };
  
  // 컬렉션에서 제거 핸들러
  const handleRemove = (e) => {
    e.stopPropagation();
    onRemoveFromCollection?.(prompt.id);
  };
  
  return (
    <div 
      className="border rounded-md p-3 bg-white hover:shadow-md transition cursor-pointer mb-2 w-full flex flex-col"
      style={{ minHeight: '120px', maxHeight: '135px' }}
      onClick={() => onClick?.(prompt)}
    >
      <div className="flex justify-between items-start mb-2 flex-none">
        <h3 className="font-medium text-gray-800 flex-1 mr-2 truncate">{truncateText(prompt.title, 30)}</h3>
        <div className="flex space-x-1 w-[110px] justify-end flex-none">
          <button 
            onClick={handleFavoriteToggle}
            className="text-gray-400 hover:text-yellow-500 p-1 w-7 h-7 flex items-center justify-center"
            title={prompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
          >
            <span className={prompt.is_favorite ? 'text-yellow-400' : ''}>★</span>
          </button>
          
          <button
            onClick={handleEdit}
            className="text-gray-400 hover:text-blue-500 p-1 w-7 h-7 flex items-center justify-center"
            title="편집"
          >
            <span>✎</span>
          </button>
          
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-green-500 p-1 w-7 h-7 flex items-center justify-center"
            title="클립보드에 복사"
          >
            <span>📋</span>
          </button>
          
          <div className="w-7 h-7 flex items-center justify-center">
            {onRemoveFromCollection && (
              <button
                onClick={handleRemove}
                className="text-red-400 hover:text-red-600 p-1"
                title="컬렉션에서 제거"
              >
                <span>✕</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mb-2 flex-grow overflow-y-auto">
        <div className="line-clamp-3 hover:line-clamp-none">
          {prompt.content}
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-auto flex-none">
        <div className="flex flex-wrap gap-1 max-w-[80%]">
          {prompt.tags && prompt.tags.slice(0, 3).map(tag => (
            <span 
              key={tag.id} 
              className={`px-1.5 py-0.5 rounded-full text-xs ${getTagColorClasses(tag.color)}`}
            >
              {tag.name}
            </span>
          ))}
          {prompt.tags && prompt.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{prompt.tags.length - 3}</span>
          )}
        </div>
        
        {prompt.folder && (
          <span className="text-xs text-gray-500 truncate max-w-[30%]" title={prompt.folder}>
            {truncateText(prompt.folder, 15)}
          </span>
        )}
      </div>
    </div>
  );
};

export default PromptItemCard;

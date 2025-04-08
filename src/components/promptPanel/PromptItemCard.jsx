import React from 'react';
import { Star, Edit, Copy, Plus, X, ArrowRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { copyToClipboard } from '../../utils/clipboard';

const PromptItemCard = ({ 
  prompt, 
  collectionId = null, 
  onAddToCollection, 
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
  
  // 컬렉션에 추가/제거 핸들러
  const handleCollectionAction = (e) => {
    e.stopPropagation();
    if (collectionId) {
      onRemoveFromCollection?.(prompt.id);
    } else {
      onAddToCollection?.(prompt.id);
    }
  };
  
  return (
    <div 
      className="border rounded-md p-3 bg-white hover:shadow-md transition cursor-pointer mb-2"
      onClick={() => onClick?.(prompt)}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-medium text-gray-800 flex-1 mr-2">{truncateText(prompt.title, 30)}</h3>
        <div className="flex space-x-1">
          <button 
            onClick={handleFavoriteToggle}
            className="text-gray-400 hover:text-yellow-500 p-1"
            title={prompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
          >
            <Star size={16} className={prompt.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''} />
          </button>
          
          <button
            onClick={handleEdit}
            className="text-gray-400 hover:text-blue-500 p-1"
            title="편집"
          >
            <Edit size={16} />
          </button>
          
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-green-500 p-1"
            title="클립보드에 복사"
          >
            <Copy size={16} />
          </button>
          
          {(onAddToCollection || onRemoveFromCollection) && (
            <button
              onClick={handleCollectionAction}
              className={`p-1 ${collectionId 
                ? 'text-red-400 hover:text-red-600' 
                : 'text-gray-400 hover:text-blue-500'}`}
              title={collectionId ? '컬렉션에서 제거' : '컬렉션에 추가'}
            >
              {collectionId ? <X size={16} /> : <Plus size={16} />}
            </button>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mb-2 line-clamp-2 h-10">
        {truncateText(prompt.content, 80)}
      </div>
      
      <div className="flex justify-between items-center">
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

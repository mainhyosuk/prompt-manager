import React from 'react';
import { Star } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const PromptCard = ({ prompt }) => {
  const { getTagColorClasses, handleViewPrompt } = useAppContext();
  
  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer"
      onClick={() => handleViewPrompt(prompt)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-lg">{prompt.title}</h3>
        <Star className={`w-5 h-5 ${prompt.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
      </div>
      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{prompt.content}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {prompt.tags.map((tag, idx) => (
          <span 
            key={idx} 
            className={`px-2 py-1 rounded-full text-xs border ${getTagColorClasses(tag.color)}`}
          >
            {tag.name}
          </span>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>폴더: {prompt.folder}</span>
        <span>마지막 사용: {prompt.lastUsed}</span>
      </div>
    </div>
  );
};

export default PromptCard;
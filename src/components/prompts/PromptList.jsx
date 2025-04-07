import React from 'react';
import { Star } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const PromptList = ({ prompts }) => {
  const { getTagColorClasses, handleViewPrompt } = useAppContext();
  
  return (
    <div className="space-y-3">
      {prompts.map(prompt => (
        <div 
          key={prompt.id} 
          className="flex items-center bg-white p-3 border rounded-lg hover:shadow-sm cursor-pointer"
          onClick={() => handleViewPrompt(prompt)}
        >
          <div className="flex-grow">
            <div className="flex items-center">
              <h3 className="font-medium">{prompt.title}</h3>
              {prompt.isFavorite && <Star className="w-4 h-4 ml-2 fill-yellow-400 text-yellow-400" />}
            </div>
            <p className="text-sm text-gray-600 line-clamp-1">{prompt.content}</p>
          </div>
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <span>{prompt.folder}</span>
            <span className="flex flex-wrap gap-1">
              {prompt.tags.map((tag, idx) => (
                <span 
                  key={idx} 
                  className={`px-2 rounded-full border ${getTagColorClasses(tag.color)}`}
                >
                  {tag.name}
                </span>
              ))}
            </span>
            <span>{prompt.lastUsed}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PromptList;
import React from 'react';
import PromptCard from './PromptCard';

const PromptGrid = ({ prompts }) => {
  if (prompts.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        표시할 프롬프트가 없습니다.
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {prompts.map(prompt => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  );
};

export default PromptGrid;
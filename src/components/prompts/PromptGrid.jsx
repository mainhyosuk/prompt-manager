import React from 'react';
import PromptCard from './PromptCard';

const PromptGrid = ({ prompts }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {prompts.map(prompt => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  );
};

export default PromptGrid;
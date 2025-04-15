import React from 'react';
import { extractVariables, splitContentByVariables } from '../../utils/variableParser';

const VariableHighlighter = ({ content }) => {
  const contentParts = splitContentByVariables(content);
  
  return (
    <div className="w-full h-32 px-3 py-2 border rounded-lg text-sm font-mono overflow-y-auto resize-y bg-gray-50">
      {contentParts.map((part, index) => {
        if (part.type === 'variable') {
          return (
            <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded">
              {part.content}
            </span>
          );
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </div>
  );
};

export const extractVariablesFromContent = (content) => {
  const variables = extractVariables(content);
  
  // 변수 객체 배열로 변환
  return variables.map(name => ({
    name,
    default_value: ''
  }));
};

export default VariableHighlighter;
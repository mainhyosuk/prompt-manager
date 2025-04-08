import React, { useState, useEffect } from 'react';
import PromptItemCard from './PromptItemCard';
import { getRecentPrompts } from '../../api/collectionApi';

const RecentPromptsList = ({ selectedPromptId, onPromptSelect }) => {
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 최근 프롬프트 로드
  useEffect(() => {
    const loadRecentPrompts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 최대 20개의 최근 프롬프트를 가져오되, 현재 선택된 프롬프트는 제외
        const response = await getRecentPrompts(selectedPromptId, 20);
        setPrompts(response);
      } catch (err) {
        console.error('최근 프롬프트 로드 오류:', err);
        setError('최근 프롬프트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentPrompts();
  }, [selectedPromptId]);

  // 로딩 상태 표시
  const renderLoading = () => (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  // 오류 메시지 표시
  const renderError = () => (
    <div className="text-red-500 p-4 text-center">
      <p>{error}</p>
    </div>
  );

  // 빈 상태 표시
  const renderEmpty = () => (
    <div className="text-center py-6">
      <p className="text-gray-500">최근 사용한 프롬프트가 없습니다</p>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="font-medium mb-3">최근 프롬프트</h3>
      
      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : prompts.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="space-y-2">
          {prompts.map(prompt => (
            <PromptItemCard
              key={prompt.id}
              prompt={prompt}
              onClick={onPromptSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentPromptsList; 
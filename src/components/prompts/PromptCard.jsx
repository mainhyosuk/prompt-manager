import React, { useState } from 'react';
import { Star, Clock, Edit, Trash2, User, Copy } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { copyToClipboard } from '../../utils/clipboard';

const PromptCard = ({ prompt }) => {
  const { 
    getTagColorClasses, 
    handleViewPrompt,
    handleToggleFavorite,
    handleEditPrompt,
    handleDeletePrompt,
    handleRecordUsage
  } = useAppContext();
  
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle', 'copying', 'copied', 'error'
  
  // 변수가 없는 프롬프트인지 확인
  const hasNoVariables = !prompt.variables || prompt.variables.length === 0;
  
  // 클립보드에 복사
  const handleCopyToClipboard = async (e) => {
    e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    setCopyStatus('copying');
    
    try {
      await copyToClipboard(prompt.content);
      setCopyStatus('copied');
      
      // 프롬프트 사용 기록
      await handleRecordUsage(prompt.id);
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('클립보드 복사 오류:', error);
      setCopyStatus('error');
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    }
  };
  
  // 마우스 오버 시 표시할 액션 버튼
  const renderActionButtons = () => (
    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleFavorite(prompt.id);
        }}
        className="p-1 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-600 hover:text-yellow-500"
        title={prompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      >
        <Star className={prompt.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''} size={16} />
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleEditPrompt(prompt);
        }}
        className="p-1 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-600 hover:text-blue-500"
        title="편집"
      >
        <Edit size={16} />
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeletePrompt(prompt.id);
        }}
        className="p-1 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-600 hover:text-red-500"
        title="삭제"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
  
  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer relative group"
      onClick={() => handleViewPrompt(prompt)}
    >
      {renderActionButtons()}
      
      <div className="flex items-start mb-2">
        <h3 className="font-medium text-lg mr-2 flex-grow">{prompt.title}</h3>
        {prompt.is_favorite && (
          <Star className="w-5 h-5 flex-shrink-0 fill-yellow-400 text-yellow-400" />
        )}
      </div>
      
      {/* 프롬프트 내용 - 4줄 표시 및 스크롤 추가 */}
      <div className="mb-3 h-24 overflow-y-auto pr-2 text-gray-600 text-sm bg-gray-50 rounded p-2 relative">
        <p className="whitespace-pre-wrap">{prompt.content}</p>
        
        {/* 변수가 없는 프롬프트에만 복사 버튼 추가 */}
        {hasNoVariables && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopyToClipboard}
              disabled={copyStatus === 'copying'}
              className={`p-1.5 rounded-full shadow-sm flex items-center justify-center
                ${copyStatus === 'copied' 
                  ? 'bg-green-100 text-green-600' 
                  : copyStatus === 'error'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              title="클립보드에 복사"
            >
              <Copy size={14} />
            </button>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1 mb-2">
        {prompt.tags.map((tag) => (
          <span 
            key={tag.id} 
            className={`px-2 py-1 rounded-full text-xs border ${getTagColorClasses(tag.color)}`}
          >
            {tag.name}
          </span>
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <span className="flex items-center">
            <Clock size={12} className="mr-1" />
            {prompt.last_used}
          </span>
          
          <span className="flex items-center">
            <User size={12} className="mr-1" />
            {prompt.use_count || 0}회
          </span>
        </div>
        <span>{prompt.folder}</span>
      </div>
    </div>
  );
};

export default PromptCard;
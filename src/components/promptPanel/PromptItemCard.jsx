import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { copyToClipboard } from '../../utils/clipboard';
import { Download, Copy, Star, Upload, Trash2, ExternalLink } from 'lucide-react';

const PromptItemCard = ({ 
  prompt, 
  onRemoveFromCollection,
  onClick,
  customEditHandler, // 버전 관리 탭에서 사용될 때 편집 버튼의 동작을 오버라이드
  customDeleteHandler, // 버전 관리 탭에서 사용될 때 삭제 버튼의 동작을 오버라이드
  customExportHandler, // 내보내기 핸들러 prop 추가
  isVersionTab = false, // 버전 관리 탭에서 사용되는지 여부
  cardType = 'default', // 카드 타입 prop 추가 (default, similar)
  onSwitchPrompt // 모달 전환 핸들러 prop 추가
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
    
    // 커스텀 편집 핸들러가 제공된 경우 (버전 관리 탭에서 사용 시)
    if (customEditHandler) {
      customEditHandler(e);
      return;
    }
    
    // 기본 편집 동작 (일반 탭에서 사용 시)
    // 최신 프롬프트 데이터를 편집 모달로 전달
    const latestPromptData = { ...prompt };
    handleEditPrompt(latestPromptData);
  };
  
  // 삭제 핸들러
  const handleDelete = (e) => {
    e.stopPropagation();
    
    // 커스텀 삭제 핸들러가 제공된 경우 (버전 관리 탭에서 사용 시)
    if (customDeleteHandler) {
      customDeleteHandler(e);
    }
  };
  
  // 컬렉션에서 제거 핸들러
  const handleRemove = (e) => {
    e.stopPropagation();
    onRemoveFromCollection?.(prompt.id);
  };
  
  // 내보내기 핸들러
  const handleExport = (e) => {
    e.stopPropagation();
    customExportHandler?.(e);
  };
  
  if (!prompt) return null;
  
  return (
    <div 
      className="border rounded-md p-3 bg-white hover:shadow-md transition cursor-pointer mb-2 w-full flex flex-col"
      style={{ minHeight: '120px', maxHeight: '135px' }}
      onClick={(e) => {
        e.stopPropagation(); // 이벤트 버블링 방지
        onClick?.(prompt);
      }}
    >
      <div className="flex justify-between items-start mb-2 flex-none">
        <h3 className="font-medium text-gray-800 flex items-center flex-1 mr-2 truncate max-w-[75%]">
          {prompt.is_imported && <Download size={14} className="mr-1.5 text-blue-500 flex-shrink-0" title="불러온 프롬프트"/>}
          {prompt.is_current_version && <Star size={14} className="mr-1.5 text-yellow-500 flex-shrink-0" title="현재 버전"/>}
          {prompt.is_replica && <Copy size={14} className="mr-1.5 text-purple-500 flex-shrink-0" title="복제본"/>}
          <span className="truncate">{truncateText(prompt.title, 30)}</span>
        </h3>
        <div className="flex items-center space-x-1 ml-auto">
          {/* 카드 타입에 따른 아이콘 렌더링 */} 
          {cardType === 'similar' ? (
            <button
              onClick={(e) => {
                e.stopPropagation(); 
                onSwitchPrompt?.(prompt); // onSwitchPrompt 호출로 변경
              }}
              className="text-gray-400 hover:text-blue-500 p-1 flex items-center justify-center"
              title="이 프롬프트로 전환"
            >
              <ExternalLink size={15} />
            </button>
          ) : isVersionTab ? (
            <>
              <button
                onClick={handleEdit}
                className="text-gray-400 hover:text-blue-500 p-1 flex items-center justify-center"
                title="편집"
              >
                <span>✎</span>
              </button>
              
              {!prompt.is_current_version && (
                <button
                  onClick={handleDelete}
                  className="text-gray-400 hover:text-red-600 p-1 flex items-center justify-center"
                  title="삭제"
                >
                  <span>🗑️</span>
                </button>
              )}
            </>
          ) : (
            <>
              {/* 기본/사용자 추가 탭 아이콘 */}
              {customExportHandler && (
                 <button
                   onClick={handleExport}
                   className="text-gray-400 hover:text-indigo-500 p-1 flex items-center justify-center"
                   title="일반 프롬프트로 내보내기"
                 >
                   <Upload size={15} />
                 </button>
              )}
              <button
                onClick={handleEdit}
                className="text-gray-400 hover:text-blue-500 p-1 flex items-center justify-center"
                title="편집"
              >
                <span>✎</span>
              </button>
              {customDeleteHandler && (
                <button
                  onClick={handleDelete}
                  className="text-gray-400 hover:text-red-600 p-1 flex items-center justify-center"
                  title="삭제"
                >
                  <Trash2 size={15} />
                </button>
              )}
              {onRemoveFromCollection && (
                <button
                  onClick={handleRemove}
                  className="text-red-400 hover:text-red-600 p-1 flex items-center justify-center"
                  title="컬렉션에서 제거"
                >
                  <span>✕</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mb-2 flex-grow overflow-hidden overflow-y-auto">
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

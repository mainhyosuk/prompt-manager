import React, { useRef, useEffect } from 'react';
import { X, Copy } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

/**
 * 프롬프트 확대 보기 컴포넌트
 * 
 * @param {Object} props
 * @param {string} props.title - 모달 제목
 * @param {string} props.content - 표시할 프롬프트 내용
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {React.ReactNode} props.children - 추가 내용 (옵션)
 * @param {React.ReactNode} props.highlightedContent - 하이라이트된 내용 (옵션)
 * @param {boolean} props.useHighlightedContent - 하이라이트된 내용 사용 여부 (옵션)
 * @param {function} props.onCopy - 복사 완료 후 콜백 (옵션)
 * @returns {React.ReactElement}
 */
const PromptExpandView = ({ 
  title, 
  content, 
  isOpen, 
  onClose, 
  children, 
  highlightedContent,
  useHighlightedContent = false,
  onCopy 
}) => {
  const modalRef = useRef(null);
  const [copyStatus, setCopyStatus] = React.useState('idle'); // idle, copying, copied, error

  // 외부 클릭 감지
  useEffect(() => {
    if (!isOpen) return;
    
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);
  
  // ESC 키 감지
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // 이벤트 전파 방지
        e.preventDefault();
        e.stopPropagation();
        if (e.nativeEvent) {
          e.nativeEvent.stopImmediatePropagation();
        }
        onClose();
      }
    };
    
    // 캡처링 단계에서 이벤트 처리 (true 옵션)
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // 복사 기능
  const handleCopy = async () => {
    if (!content) return;
    
    setCopyStatus('copying');
    
    try {
      await copyToClipboard(content);
      setCopyStatus('copied');
      
      if (onCopy) {
        onCopy();
      }
      
      // 상태 리셋
      setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('복사 오류:', error);
      setCopyStatus('error');
      
      // 상태 리셋
      setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    }
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-11/12 max-w-5xl max-h-[90vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center border-b px-5 py-3">
          <h3 className="font-medium text-lg">{title || '프롬프트 내용'}</h3>
          <div className="flex space-x-2">
            {/* 복사 버튼 */}
            <button
              onClick={handleCopy}
              disabled={copyStatus === 'copying'}
              className={`px-3 py-1 rounded flex items-center text-sm
                ${copyStatus === 'copied' ? 'bg-green-50 text-green-600' :
                  copyStatus === 'error' ? 'bg-red-50 text-red-600' :
                  'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
            >
              <Copy size={16} className="mr-1" />
              {copyStatus === 'copying' ? '복사 중...' :
               copyStatus === 'copied' ? '복사됨!' :
               copyStatus === 'error' ? '복사 실패' :
               '복사'}
            </button>
            
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* 내용 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {useHighlightedContent && highlightedContent ? (
            <div className="whitespace-pre-wrap text-base bg-gray-50 p-4 rounded-lg border">
              {highlightedContent}
            </div>
          ) : content ? (
            <div className="whitespace-pre-wrap text-base bg-gray-50 p-4 rounded-lg border">
              {content}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-10">
              표시할 내용이 없습니다.
            </div>
          )}
          
          {/* 추가 내용 */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default PromptExpandView; 
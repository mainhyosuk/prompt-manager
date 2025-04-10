import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * 메모 확대 및 편집 모달 컴포넌트
 *
 * @param {Object} props
 * @param {string} props.title - 모달 제목 (기본값: '메모 편집')
 * @param {string} props.memo - 표시 및 편집할 메모 내용
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {function} props.onClose - 모달 닫기 함수
 * @param {function} props.onMemoChange - 메모 내용 변경 시 호출될 함수 (변경된 텍스트를 인자로 받음)
 * @param {boolean} [props.readOnly=false] - 읽기 전용 모드 여부
 * @returns {React.ReactElement}
 */
const MemoExpandModal = ({
  title = '메모 편집',
  memo,
  isOpen,
  onClose,
  onMemoChange,
  readOnly = false // 읽기 전용 prop 추가
}) => {
  const modalRef = useRef(null);
  const textareaRef = useRef(null);
  const contentDivRef = useRef(null); // 스크롤 div를 위한 ref 추가

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        event.stopPropagation(); // 이벤트 전파 중단
        onClose();
      }
    };

    if (isOpen) {
      // mousedown 대신 click 이벤트 사용 및 이벤트 캡처링 단계에서 처리 (true 추가)
      document.addEventListener('click', handleClickOutside, true);
      // 읽기 전용이 아닐 때만 textarea에 포커스
      if (!readOnly) {
        textareaRef.current?.focus();
      }
    } else {
      document.removeEventListener('click', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isOpen, onClose, readOnly]);

  // Esc 키로 닫기
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation(); // 이벤트 전파 중단
        onClose();
      }
    };

    if (isOpen) {
      // 이벤트 캡처링 단계에서 처리 (true 추가)
      document.addEventListener('keydown', handleKeyDown, true);
    } else {
      document.removeEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Textarea 높이 자동 조절
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isOpen, memo]);

  if (!isOpen) return null;

  return (
    // z-index를 높여 다른 모달보다 위에 오도록 설정 (예: z-60)
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60">
      <div
        ref={modalRef}
        // max-h-[80vh]를 max-h-[85vh]로 변경하여 최대 높이를 늘림
        className="bg-white rounded-lg shadow-xl w-11/12 max-w-3xl max-h-[85vh] flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center border-b px-5 py-3 flex-shrink-0">
          <h3 className="font-medium text-lg">{title}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation(); // 버튼 클릭 시 이벤트 전파 중단
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 내용 (편집 가능한 textarea) */}
        {/* overflow-y-auto 추가하여 내용이 넘칠 때 세로 스크롤 생성 */}
        {/* min-h-0 추가 */}
        <div 
          ref={contentDivRef} // ref 연결
          className="flex-1 p-4 overflow-y-auto min-h-0"
        >
          <textarea
            ref={textareaRef}
            value={memo}
            onChange={(e) => !readOnly && onMemoChange(e.target.value)} // 읽기 전용 아닐 때만 변경 핸들러 호출
            readOnly={readOnly} // textarea에 readOnly 속성 적용
            // h-full 제거: 내용에 따라 높이가 늘어나도록 함
            className={`w-full resize-none border rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`} // 읽기 전용 스타일 추가
            placeholder={readOnly ? "메모가 없습니다." : "메모를 입력하세요..."}
            // 필요하다면 최소 높이 설정 가능: style={{ minHeight: '200px' }} 또는 min-h-[200px] 클래스 추가
          />
        </div>
      </div>
    </div>
  );
};

export default MemoExpandModal;
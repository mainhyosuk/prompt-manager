import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Edit2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { createTag, updateTag, deleteTag } from '../../api/tagApi';
import ReactDOM from 'react-dom';

// 툴바 포털 컴포넌트 - DOM의 최상위에 렌더링
const ToolbarPortal = ({ children, isVisible, position, tagElement }) => {
  const portalRoot = document.getElementById('portal-root') || document.body;
  
  if (!isVisible) return null;
  
  // 모든 마우스/키보드 이벤트 전파 방지
  const stopAllPropagation = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };
  
  return ReactDOM.createPortal(
    <div 
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        marginTop: '-3px',
        padding: '6px'
      }}
      className="bg-white shadow-md rounded-md flex items-center gap-1 border whitespace-nowrap toolbar-portal"
      onClick={stopAllPropagation}
      onMouseDown={stopAllPropagation}
      onMouseUp={stopAllPropagation}
      onPointerDown={stopAllPropagation}
      onPointerUp={stopAllPropagation}
      data-tag-id={tagElement ? tagElement.id : ''}
    >
      {children}
    </div>,
    portalRoot
  );
};

// 컬러 픽커 포털 컴포넌트
const ColorPickerPortal = ({ tag, colors, onSelectColor, onCancel, position }) => {
  const portalRoot = document.getElementById('portal-root') || document.body;
  
  // 모든 마우스/키보드 이벤트 전파 방지
  const stopAllPropagation = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };
  
  // 외부 클릭 감지 핸들러
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const colorPickerElements = document.querySelectorAll('.color-picker-portal');
      let isClickInsideColorPicker = false;
      
      colorPickerElements.forEach(element => {
        if (element.contains(e.target)) {
          isClickInsideColorPicker = true;
        }
      });
      
      // 태그 툴바 영역도 제외
      const isClickInsideToolbar = e.target.closest('.toolbar-portal');
      
      // 색상 선택 UI 안이나 툴바 안이 아닌 경우에만 닫기
      if (!isClickInsideColorPicker && !isClickInsideToolbar) {
        onCancel();
      }
    };
    
    // 이벤트 리스너를 setTimeout을 통해 등록하여 현재 클릭 이벤트가 처리된 후 등록
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onCancel]);
  
  return ReactDOM.createPortal(
    <div 
      className="color-picker-portal"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
        zIndex: 10000,
        marginTop: '-5px',
        padding: '5px',
        background: 'white',
        borderRadius: '6px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.1)'
      }}
      onClick={stopAllPropagation}
      onMouseDown={stopAllPropagation}
      onMouseUp={stopAllPropagation}
      onPointerDown={stopAllPropagation}
      onPointerUp={stopAllPropagation}
    >
      <div className="text-center mb-2 font-medium text-gray-700 text-xs">
        태그 색상 선택 - {tag.name}
      </div>
      <div className="flex items-center gap-2 p-1">
        {colors.map(color => (
          <button
            key={color.value}
            type="button"
            onClick={e => {
              stopAllPropagation(e);
              onSelectColor(tag, color.value, e);
            }}
            className={`w-6 h-6 rounded-full border transition-all hover:scale-110 ${
              tag.color === color.value ? 'ring-2 ring-offset-1 ring-blue-500' : ''
            }`}
            style={{ backgroundColor: getComputedColorClass(color.value) }}
            title={color.name}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={e => {
          stopAllPropagation(e);
          onCancel();
        }}
        className="mt-2 w-full px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700"
      >
        취소
      </button>
    </div>,
    portalRoot
  );
};

const TagSelector = ({ selectedTags, setSelectedTags }) => {
  const { tags, getTagColorClasses, loadData } = useAppContext();
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagColor, setTagColor] = useState('gray');
  const [editingTag, setEditingTag] = useState(null);
  const [hoveredTag, setHoveredTag] = useState(null);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [colorPickerPosition, setColorPickerPosition] = useState({ top: 0, left: 0 });
  const tagInputRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseTracking, setIsMouseTracking] = useState(false);
  const mouseTrackingTimeoutRef = useRef(null);
  const [localTags, setLocalTags] = useState([]);
  
  // tags가 변경될 때마다 localTags 업데이트
  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);
  
  // selectedTags와 localTags를 동기화 - tags가 변경될 때마다 선택된 태그도 업데이트
  useEffect(() => {
    if (localTags.length > 0 && selectedTags.length > 0) {
      // 선택된 태그 목록의 색상을 전체 태그 목록에 맞게 동기화
      const updatedSelectedTags = selectedTags.map(selectedTag => {
        // 전체 태그 목록에서 같은 ID를 가진 태그 찾기
        const matchingTag = localTags.find(t => t.id === selectedTag.id);
        // 찾았으면 그 태그를 사용 (색상 등 최신 상태 유지)
        return matchingTag || selectedTag;
      });
      
      // 변경사항이 있을 때만 업데이트
      const needsUpdate = updatedSelectedTags.some((tag, index) => 
        tag.color !== selectedTags[index]?.color
      );
      
      if (needsUpdate) {
        setSelectedTags(updatedSelectedTags);
      }
    }
  }, [localTags, selectedTags]);
  
  // 태그를 이미 선택했는지 확인
  const isTagSelected = (tagId) => {
    return selectedTags.some(tag => tag.id === tagId);
  };
  
  // 태그 선택/해제
  const toggleTag = (tag) => {
    if (isTagSelected(tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      // 전체 태그 목록에서 해당 태그를 찾아 선택 (참조 일관성 유지)
      const tagFromList = tags.find(t => t.id === tag.id);
      if (tagFromList) {
        setSelectedTags([...selectedTags, tagFromList]);
      } else {
        setSelectedTags([...selectedTags, tag]);
      }
    }
  };
  
  // 태그 입력 처리 (엔터 및 쉼표 구분)
  const handleTagInput = async (e) => {
    // 엔터 키를 누를 때만 태그 생성
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const inputValue = newTagName.trim();
      if (!inputValue) return;
      
      // 쉼표로 구분된 여러 태그 처리
      const tagNames = inputValue.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      for (const tagName of tagNames) {
        await createAndSelectTag(tagName);
      }
      
      setNewTagName('');
    }
  };
  
  // 새 태그 생성 및 선택
  const createAndSelectTag = async (tagName) => {
    if (!tagName || tagName.trim() === '') return;
    
    try {
      // 태그 이름 정규화 (대소문자 무시, 앞뒤 공백 제거)
      const normalizedTagName = tagName.trim().toLowerCase();
      
      // 이미 존재하는 태그인지 확인 - 정규화된 이름으로 비교
      const existingTag = localTags.find(tag => 
        tag.name.toLowerCase() === normalizedTagName
      );
      
      if (existingTag) {
        // 이미 존재하는 태그면 선택만 하고 성공으로 반환
        if (!isTagSelected(existingTag.id)) {
          // 전체 태그 목록에서 찾은 태그 객체를 사용 (참조 일관성 유지)
          setSelectedTags(prev => [...prev, existingTag]);
        }
        return;
      }
      
      try {
        // 새 태그는 항상 회색으로 시작
        const newColorTag = {
          name: tagName.trim(), // 원래 대소문자는 유지
          color: 'gray' // 항상 회색으로 시작
        };
        
        // 태그 생성 요청
        const newTag = await createTag(newColorTag);
        
        // 태그 목록 갱신 전에 임시로 localTags에 추가 (UI 즉시 반영)
        setLocalTags(prev => [...prev, newTag]);
        
        // 임시로 선택된 태그에도 추가 (UI 즉시 반영)
        setSelectedTags(prev => {
          // 이미 선택되어 있는지 확인
          if (prev.some(t => t.id === newTag.id)) {
            return prev;
          }
          return [...prev, newTag];
        });
        
        // 백그라운드에서 태그 목록 갱신 (서버 데이터와 동기화)
        const updatedData = await loadData();
        
        // 태그 동기화를 위한 별도 함수 호출
        synchronizeTagState(updatedData, newTag.id);
      } catch (error) {
        // 중복 태그 에러 처리 (데이터베이스 UNIQUE constraint)
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
          // 태그 목록 다시 로드해서 방금 생성된 태그를 찾아 선택
          const updatedData = await loadData();
          
          // 정규화된 이름으로 태그 찾기
          const justCreatedTag = localTags.find(tag => 
            tag.name.toLowerCase() === normalizedTagName
          );
          
          if (justCreatedTag && !isTagSelected(justCreatedTag.id)) {
            // 전체 태그 목록에서 찾은 태그 객체를 사용 (참조 일관성 유지)
            setSelectedTags(prev => [...prev, justCreatedTag]);
          }
          
          // 태그 동기화
          synchronizeTagState(updatedData, justCreatedTag?.id);
        } else {
          throw error; // 다른 에러는 다시 throw
        }
      }
    } catch (error) {
      console.error('태그 생성 오류:', error);
      // 심각한 오류가 아닌 경우 사용자 경험을 위해 알림 생략
      if (!error.message.includes('UNIQUE constraint failed')) {
        alert('태그 생성에 실패했습니다.');
      }
    }
  };
  
  // 태그 상태 동기화 함수 - 서버 데이터와 로컬 상태를 일치시킴
  const synchronizeTagState = (updatedData, targetTagId = null) => {
    // updatedData가 있으면 사용, 없으면 기존 tags 사용
    const currentTags = updatedData?.tags || localTags;
    
    // localTags 업데이트
    setLocalTags(currentTags);
    
    // selectedTags 동기화 (ID 기반 매칭)
    setSelectedTags(prev => {
      // 모든 선택된 태그를 현재 태그 목록의 참조로 업데이트
      const updatedSelectedTags = prev.map(selectedTag => {
        const matchingTag = currentTags.find(t => t.id === selectedTag.id);
        return matchingTag || selectedTag;
      });
      
      // 특정 태그 ID가 주어진 경우 해당 태그가 선택되었는지 확인하고 없으면 추가
      if (targetTagId) {
        const targetTag = currentTags.find(t => t.id === targetTagId);
        if (targetTag && !updatedSelectedTags.some(t => t.id === targetTagId)) {
          updatedSelectedTags.push(targetTag);
        }
      }
      
      return updatedSelectedTags;
    });
  };
  
  // 버튼을 통한 태그 생성
  const handleCreateTagButton = async () => {
    if (!newTagName.trim()) return;
    
    // 쉼표로 구분된 여러 태그 처리
    const tagNames = newTagName.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    for (const tagName of tagNames) {
      await createAndSelectTag(tagName);
    }
    
    // 입력 필드 초기화
    setNewTagName('');
    setIsAddingTag(false);
  };
  
  // 태그 편집 시작
  const startEditTag = (tag, e) => {
    if (e) {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      e.preventDefault();
    }
    
    // 툴바 및 컬러피커 위치 계산
    updatePositions(tag.id);
    
    // 현재 편집 태그 설정
    setEditingTag(tag);
    
    // 호버된 태그 상태 유지
    setHoveredTag(tag);
  };
  
  // 마우스 위치 추적을 위한 이벤트 리스너 설정
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isMouseTracking) {
        setMousePosition({ x: e.clientX, y: e.clientY });
        
        // 현재 호버된 태그와 툴바의 위치 확인
        if (hoveredTag) {
          const tagElement = document.getElementById(`tag-${hoveredTag.id}`);
          const toolbarElement = document.querySelector(`.toolbar-portal[data-tag-id="${tagElement?.id}"]`);
          
          if (tagElement && toolbarElement) {
            const tagRect = tagElement.getBoundingClientRect();
            const toolbarRect = toolbarElement.getBoundingClientRect();
            
            // 마우스가 태그나 툴바 영역 내에 있는지 확인
            const isInTagArea = (
              e.clientX >= tagRect.left && 
              e.clientX <= tagRect.right && 
              e.clientY >= tagRect.top && 
              e.clientY <= tagRect.bottom
            );
            
            const isInToolbarArea = (
              e.clientX >= toolbarRect.left - 10 && // 여유 공간 추가
              e.clientX <= toolbarRect.right + 10 && // 여유 공간 추가
              e.clientY >= toolbarRect.top - 10 && // 여유 공간 추가
              e.clientY <= toolbarRect.bottom + 10 // 여유 공간 추가
            );
            
            const isInConnectionArea = (
              e.clientX >= Math.min(tagRect.left, toolbarRect.left) - 10 &&
              e.clientX <= Math.max(tagRect.right, toolbarRect.right) + 10 &&
              e.clientY >= Math.min(tagRect.top, toolbarRect.bottom) - 30 &&
              e.clientY <= Math.max(tagRect.bottom, toolbarRect.top) + 30
            );
            
            // 마우스가 모든 영역을 벗어난 경우에만 호버 상태 해제
            if (!isInTagArea && !isInToolbarArea && !isInConnectionArea) {
              setHoveredTag(null);
              setIsMouseTracking(false);
            }
          }
        }
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMouseTracking, hoveredTag]);
  
  // 마우스 진입 시 호버 상태 설정 및 마우스 추적 시작
  const handleMouseEnter = (tag, e) => {
    if (!editingTag) {
      // 이벤트가 툴바 영역에서 발생한 것인지 확인
      if (e.relatedTarget && e.relatedTarget.closest('.toolbar-portal')) {
        // 툴바에서 태그로 돌아오는 경우는 무시
        return;
      }
      
      // 전체 태그 영역인 경우만 처리 (선택된 태그 영역 무시)
      if (e.currentTarget.closest('.available-tags-container')) {
        setHoveredTag(tag);
        updatePositions(tag.id);
        
        // 마우스 추적 시작
        setIsMouseTracking(true);
        
        // 이전 타임아웃 취소
        if (mouseTrackingTimeoutRef.current) {
          clearTimeout(mouseTrackingTimeoutRef.current);
          mouseTrackingTimeoutRef.current = null;
        }
      }
    }
  };
  
  // 마우스 이탈 시 호버 상태 해제 로직 개선
  const handleMouseLeave = (e) => {
    if (!editingTag) {
      // 태그에서 툴바로 이동하는 경우 체크
      if (e.relatedTarget && 
         (e.relatedTarget.closest('.toolbar-portal') || 
          e.relatedTarget.closest(`[data-tag-id="${e.currentTarget.id}"]`))) {
        // 툴바로 이동하는 경우 호버 상태 유지
        return;
      }
      
      // 마우스 추적은 지속 (마우스가 태그-툴바 연결 영역을 통과하는지 확인하기 위해)
      // mouseTrackingTimeoutRef.current = setTimeout(() => {
      //   setHoveredTag(null);
      //   setIsMouseTracking(false);
      // }, 300);
    }
  };
  
  // 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (mouseTrackingTimeoutRef.current) {
        clearTimeout(mouseTrackingTimeoutRef.current);
      }
    };
  }, []);
  
  // 마우스 위치에 따라 툴바 및 컬러피커 위치 업데이트
  const updatePositions = (tagId) => {
    const tagElement = document.getElementById(`tag-${tagId}`);
    if (tagElement) {
      const rect = tagElement.getBoundingClientRect();
      
      setToolbarPosition({
        top: rect.top - 2,
        left: rect.left + rect.width / 2
      });
      
      setColorPickerPosition({
        top: rect.top - 2,
        left: rect.left + rect.width / 2
      });
    }
  };
  
  // 태그 색상 업데이트
  const updateTagColor = async (tag, newColor, e) => {
    if (e) {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      e.preventDefault();
    }
    
    try {
      // 임시로 UI 먼저 업데이트 (낙관적 업데이트)
      const tagToUpdate = { ...tag, color: newColor };
      
      // 선택된 태그와 전체 태그 모두에 임시 업데이트 적용
      setLocalTags(prevTags => 
        prevTags.map(t => t.id === tag.id ? tagToUpdate : t)
      );
      
      setSelectedTags(prevSelectedTags => 
        prevSelectedTags.map(t => t.id === tag.id ? tagToUpdate : t)
      );
      
      // 서버에 업데이트 요청
      await updateTag(tag.id, tagToUpdate);
      
      // 모든 태그 목록 새로고침 및 동기화
      const updatedData = await loadData();
      synchronizeTagState(updatedData);
    } catch (error) {
      console.error('태그 색상 변경 오류:', error);
      alert('태그 색상 변경에 실패했습니다.');
      
      // 에러 발생 시 서버에서 최신 데이터 다시 로드
      const updatedData = await loadData();
      synchronizeTagState(updatedData);
    } finally {
      // 색상 선택 모드 종료
      setEditingTag(null);
      // 호버 상태 초기화
      setHoveredTag(null);
    }
  };
  
  // 태그 삭제 기능
  const handleDeleteTag = async (tagId, e) => {
    if (e) {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      e.preventDefault();
    }
    
    if (window.confirm('정말 이 태그를 삭제하시겠습니까? 모든 프롬프트에서 이 태그가 제거됩니다.')) {
      try {
        // API 호출
        await deleteTag(tagId);
        
        // 태그 목록 갱신
        await loadData();
        
        // 선택된 태그에서도 제거
        setSelectedTags(prev => prev.filter(t => t.id !== tagId));
        
      } catch (error) {
        console.error('태그 삭제 오류:', error);
        alert('태그를 삭제하는 중 오류가 발생했습니다.');
      }
    }
  };
  
  // 태그 색상 옵션
  const colorOptions = [
    { name: '회색', value: 'gray' },
    { name: '파랑', value: 'blue' },
    { name: '하늘', value: 'sky' },
    { name: '초록', value: 'green' },
    { name: '노랑', value: 'amber' },
    { name: '보라', value: 'purple' },
    { name: '분홍', value: 'pink' },
    { name: '빨강', value: 'red' }
  ];
  
  // 입력 필드에 자동 포커스
  const focusTagInput = () => {
    setTimeout(() => {
      if (tagInputRef.current) {
        tagInputRef.current.focus();
      }
    }, 10);
  };
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-700">태그</h3>
        <button
          type="button"
          onClick={() => {
            setIsAddingTag(!isAddingTag);
            if (!isAddingTag) {
              focusTagInput();
            }
          }}
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
        >
          {isAddingTag ? (
            <>
              <X size={16} className="mr-1" />
              취소
            </>
          ) : (
            <>
              <Plus size={16} className="mr-1" />
              새 태그
            </>
          )}
        </button>
      </div>
      
      {/* 태그 입력 창 */}
      <div className="mb-3">
        <input
          type="text"
          ref={tagInputRef}
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={handleTagInput}
          placeholder="태그 입력 후 엔터(쉼표로 여러 태그 한번에 입력 가능)"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <p className="text-xs text-gray-500 mt-1">
          쉼표(,)로 구분하여 여러 태그를 한번에 입력할 수 있습니다
        </p>
      </div>
      
      {/* 선택된 태그 표시 - z-index 추가 */}
      <div className="flex flex-wrap gap-2 mb-3 relative z-20 selected-tags-container">
        {selectedTags.map(tag => (
          <div 
            key={tag.id}
            className={`px-3 py-1 rounded-full text-sm border flex items-center ${getTagColorClasses(tag.color)}`}
            style={{ position: 'relative' }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => toggleTag(tag)}
              className="ml-1 text-gray-500 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        
        {selectedTags.length === 0 && (
          <p className="text-sm text-gray-500">
            선택된 태그가 없습니다.
          </p>
        )}
      </div>
      
      {/* 사용 가능한 태그 목록 - z-index 조정 */}
      <div className="flex flex-wrap gap-2 relative z-10 available-tags-container">
        {tags.map(tag => (
          <div 
            key={tag.id} 
            className="relative"
            onMouseEnter={(e) => handleMouseEnter(tag, e)}
            onMouseLeave={handleMouseLeave}
            data-tag-id={`tag-${tag.id}`}
          >
            <div
              id={`tag-${tag.id}`}
              className={`px-3 py-1 rounded-full text-sm border transition-colors
                ${isTagSelected(tag.id) 
                  ? 'bg-gray-100 text-gray-600 border-gray-300' 
                  : `${getTagColorClasses(tag.color)}`
                }`}
            >
              <span 
                onClick={() => toggleTag(tag)} 
                className="cursor-pointer"
              >
                {tag.name}
              </span>
            </div>
            
            {/* 호버 시 나타나는 툴바 - 포털 사용 및 tagElement 전달 */}
            <ToolbarPortal 
              isVisible={hoveredTag && hoveredTag.id === tag.id && !editingTag}
              position={toolbarPosition}
              tagElement={document.getElementById(`tag-${tag.id}`)}
            >
              <button
                type="button"
                onClick={(e) => startEditTag(tag, e)}
                className="p-1 text-gray-500 hover:text-blue-500 rounded-full hover:bg-blue-50"
                title="색상 변경"
              >
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteTag(tag.id, e)}
                className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-red-50"
                title="태그 삭제"
              >
                <X size={14} />
              </button>
            </ToolbarPortal>
          </div>
        ))}
        
        {tags.length === 0 && (
          <p className="text-sm text-gray-500">
            사용 가능한 태그가 없습니다.
          </p>
        )}
      </div>
      
      {/* 색상 선택 포털 */}
      {editingTag && (
        <ColorPickerPortal
          tag={editingTag}
          colors={colorOptions}
          onSelectColor={updateTagColor}
          onCancel={() => setEditingTag(null)}
          position={colorPickerPosition}
        />
      )}
    </div>
  );
};

// 색상 이름에 맞는 CSS 배경색 가져오기
function getComputedColorClass(color) {
  const colorMap = {
    gray: '#f3f4f6',
    blue: '#dbeafe',
    sky: '#e0f2fe',
    green: '#dcfce7',
    amber: '#fef3c7',
    purple: '#f3e8ff',
    pink: '#fce7f3',
    red: '#fee2e2'
  };
  
  return colorMap[color] || '#f3f4f6';
}

export default TagSelector;
import { useState, useCallback } from 'react';

/**
 * 배열 형태의 아이템 목록에서 다중 선택 상태 및 관련 로직을 관리하는 커스텀 훅
 * @param {Array<Object>} items - 각 아이템 객체는 반드시 'id' 속성을 포함해야 합니다. 기본값은 빈 배열입니다.
 * @returns {Object} - 다중 선택 상태 및 제어 함수들을 포함하는 객체
 */
export const useMultiSelect = (items = []) => {
  const [selectedIds, setSelectedIds] = useState([]);
  // 디버깅 로그 제거
  // console.log('[useMultiSelect] Current selectedIds:', selectedIds);

  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => {
      // 디버깅 로그 제거
      // console.log('[useMultiSelect] toggleSelection called with id:', id);
      // console.log('[useMultiSelect] Previous selectedIds:', prev);
      const newState = prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id];
      // console.log('[useMultiSelect] Next selectedIds state:', newState);
      return newState;
    });
  }, []);

  const selectAll = useCallback(() => {
    // 현재 items 배열에 있는 모든 아이템 ID를 선택합니다.
    setSelectedIds(items.map(item => item.id));
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // 현재 items 배열 기준 전체 선택 여부 확인
  // items 배열이 비어있지 않고, 선택된 ID 개수와 items 개수가 같으며,
  // 모든 item의 id가 selectedIds에 포함되어 있는지 확인합니다.
  const allSelected = items.length > 0 && selectedIds.length === items.length && items.every(item => selectedIds.includes(item.id));

  // 디버깅 로그 제거
  const hasSelections = selectedIds.length > 0;
  // console.log('[useMultiSelect] Calculated hasSelections:', hasSelections);

  return {
    selectedIds,           // 선택된 아이템 ID 배열
    toggleSelection,       // 특정 아이템 선택/해제 토글 함수
    selectAll,             // (현재 기준) 전체 아이템 선택 함수
    deselectAll,           // 모든 아이템 선택 해제 함수
    setSelectedIds,        // 선택된 ID 배열 직접 설정 함수 (필요시 사용)
    hasSelections: hasSelections, // 명시적으로 전달
    allSelected,           // (현재 기준) 모든 아이템이 선택되었는지 여부
  };
}; 
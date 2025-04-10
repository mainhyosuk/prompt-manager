// 사용자 추가 프롬프트를 일반 프롬프트로 가져오기(Import) 위한 모달

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Search, X } from 'lucide-react';

const ImportPromptModal = ({ isOpen, onClose, onImport }) => {
  // AppContext에서 필요한 데이터와 함수 가져오기
  const { prompts, folders: hierarchicalFolders, tags, getTagColorClasses } = useAppContext();

  // 검색 및 필터링 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all'); // 'all', 'none', 또는 폴더 이름
  const [selectedTags, setSelectedTags] = useState([]); // 선택된 태그 ID 배열
  const [sortBy, setSortBy] = useState('updated_at'); // 'title', 'updated_at', 'created_at'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'

  const modalRef = useRef(null);

  // Function to flatten the folder hierarchy
  const flattenFolders = (folderList) => {
    let flatList = [];
    folderList.forEach(folder => {
      // Exclude special folders like '모든 프롬프트' and '즐겨찾기'
      if (folder.id >= 0) { // Assuming special folders have negative IDs
          flatList.push(folder);
          if (folder.children && folder.children.length > 0) {
              flatList = flatList.concat(flattenFolders(folder.children));
          }
      }
    });
    return flatList;
  };

  // UseMemo to get the flattened list of user folders
  const userFolders = useMemo(() => {
    return flattenFolders(hierarchicalFolders);
  }, [hierarchicalFolders]);

  // 모달 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // 모달이 열려 있고, 클릭된 대상이 모달 콘텐츠 외부일 때 닫기
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      // 버블링 단계에서 리스너 등록
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // ESC 키 감지
  useEffect(() => {
    const handleEscKey = (event) => {
      if (isOpen && event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // 필터링 및 정렬된 프롬프트 목록 계산 (useMemo로 성능 최적화)
  const filteredAndSortedPrompts = useMemo(() => {
    // 사용자 추가 프롬프트는 제외하고 시작
    let result = prompts.filter(p => !p.is_user_added);

    // 폴더 필터링
    if (selectedFolder !== 'all') {
      if (selectedFolder === 'none') {
        // 폴더가 없는 프롬프트 (folder_id가 null 또는 undefined)
        result = result.filter(p => !p.folder_id);
      } else {
        // 특정 폴더 이름으로 폴더 ID 찾기 (Use userFolders)
        const targetFolder = userFolders.find(f => f.name === selectedFolder);
        if (targetFolder) {
          // 해당 폴더 ID를 가진 프롬프트만 필터링
          result = result.filter(p => p.folder_id === targetFolder.id);
        } else {
          // 선택된 폴더 이름과 일치하는 폴더가 없으면 빈 결과 반환
          result = [];
        }
      }
    }

    // 태그 필터링 (선택된 모든 태그를 포함하는 프롬프트)
    if (selectedTags.length > 0) {
      result = result.filter(p =>
        selectedTags.every(selTagId => // 선택된 모든 태그 ID에 대해
          p.tags.some(promptTag => promptTag.id === selTagId) // 프롬프트의 태그 중 하나라도 일치하는지 확인
        )
      );
    }

    // 검색어 필터링 (제목, 내용, 태그 이름에서 검색)
    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase().trim();
      result = result.filter(p =>
        (p.title && p.title.toLowerCase().includes(lowerQuery)) ||
        (p.content && p.content.toLowerCase().includes(lowerQuery)) ||
        (p.tags.some(tag => tag.name.toLowerCase().includes(lowerQuery)))
      );
    }

    // 정렬 로직
    result.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case 'title':
          valA = a.title?.toLowerCase() || ''; // title이 null일 경우 대비
          valB = b.title?.toLowerCase() || '';
          break;
        case 'created_at':
          valA = new Date(a.created_at || 0); // created_at이 null일 경우 대비
          valB = new Date(b.created_at || 0);
          break;
        case 'updated_at':
        default: // 기본 정렬 기준
          valA = new Date(a.updated_at || 0); // updated_at이 null일 경우 대비
          valB = new Date(b.updated_at || 0);
          break;
      }
      // 비교 로직
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0; // 값이 같으면 순서 변경 없음
    });

    return result; // 최종 필터링 및 정렬된 목록 반환
  }, [prompts, userFolders, tags, searchTerm, selectedFolder, selectedTags, sortBy, sortDirection]); // 의존성 배열에 userFolders 추가

  // 태그 선택/해제 핸들러
  const handleTagToggle = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId) // 이미 있으면 제거
        : [...prev, tagId] // 없으면 추가
    );
  };

  // 정렬 기준 변경 핸들러
  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      // 같은 기준 클릭 시 정렬 방향 변경
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // 새로운 기준 클릭 시 해당 기준으로 변경하고 기본 내림차순 설정
      setSortBy(newSortBy);
      setSortDirection('desc');
    }
  };

  // 모달이 열려있지 않으면 아무것도 렌더링하지 않음
  if (!isOpen) return null;

  return (
    // 모달 배경 (클릭 시 닫히지 않음, handleOutsideClick에서 처리)
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70]"> {/* z-index를 다른 모달보다 높게 설정 */}
      {/* 모달 컨테이너 */}
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl h-[80vh] flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center border-b px-5 py-3 flex-shrink-0">
          <h2 className="text-lg font-semibold">프롬프트 불러오기</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} /> {/* 닫기 아이콘 */}
          </button>
        </div>

        {/* 필터 및 검색 영역 */}
        <div className="p-4 border-b flex flex-wrap items-center gap-3 flex-shrink-0">
          {/* 검색창 */}
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
            <input
              type="text"
              placeholder="검색 (제목, 내용, 태그)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-md text-sm pl-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {/* 검색 아이콘 */}
            <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          {/* 폴더 필터 드롭다운 (Use userFolders) */}
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">모든 폴더</option>
            {/* 폴더 목록 매핑 (Use userFolders) */}
            {userFolders.map(folder => (
              <option key={folder.id} value={folder.name}>{folder.name}</option>
            ))}
            {/* 폴더 없음 옵션 */}
            <option value="none">폴더 없음</option>
          </select>

          {/* 태그 필터 (토글 버튼 방식) */}
          <div className="flex items-center flex-wrap gap-1">
            <span className="text-sm text-gray-600 mr-1">태그:</span>
            {/* 태그 목록 매핑 */}
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                // 선택된 태그는 활성 스타일 적용
                className={`px-2 py-0.5 rounded-full text-xs border ${
                  selectedTags.includes(tag.id)
                    ? `${getTagColorClasses(tag.color)} font-medium` // 컨텍스트의 색상 클래스 사용
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* 프롬프트 목록 영역 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 정렬 버튼 */}
          <div className="flex justify-end gap-2 mb-3 text-xs">
             {/* 수정일 기준 정렬 */}
             <button onClick={() => handleSort('updated_at')} className={`px-2 py-0.5 rounded ${sortBy === 'updated_at' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
               수정순 {sortBy === 'updated_at' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
             </button>
             {/* 생성일 기준 정렬 */}
             <button onClick={() => handleSort('created_at')} className={`px-2 py-0.5 rounded ${sortBy === 'created_at' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
               생성순 {sortBy === 'created_at' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
             </button>
             {/* 이름 기준 정렬 */}
             <button onClick={() => handleSort('title')} className={`px-2 py-0.5 rounded ${sortBy === 'title' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
               이름순 {sortBy === 'title' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
             </button>
           </div>

          {/* 프롬프트 목록 */}
          {filteredAndSortedPrompts.length === 0 ? (
            // 결과 없을 시 메시지 표시
            <div className="text-center text-gray-500 py-10">불러올 프롬프트가 없습니다.</div>
          ) : (
            // 목록 렌더링
            <ul className="space-y-2">
              {filteredAndSortedPrompts.map(prompt => (
                // 각 프롬프트 항목 (클릭 시 onImport 호출)
                <li
                  key={prompt.id}
                  onClick={() => onImport(prompt)}
                  className="border rounded-md p-3 hover:bg-blue-50 cursor-pointer transition duration-150 ease-in-out"
                >
                  {/* 프롬프트 제목 */}
                  <div className="font-medium text-sm">{prompt.title}</div>
                  {/* 프롬프트 내용 미리보기 (최대 2줄) */}
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">{prompt.content}</div>
                  {/* 프롬프트 태그 목록 */}
                  <div className="mt-2 flex flex-wrap gap-1">
                     {prompt.tags.map(tag => (
                       <span
                         key={tag.id}
                         className={`px-1.5 py-0.5 rounded-full text-xs ${getTagColorClasses(tag.color)}`}
                       >
                         {tag.name}
                       </span>
                     ))}
                   </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportPromptModal;
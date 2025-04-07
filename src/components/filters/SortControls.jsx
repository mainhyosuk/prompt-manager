import React from 'react';
import { SortAsc, SortDesc } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const SortControls = () => {
  const { sortBy, sortDirection, setSortBy, setSortDirection } = useAppContext();
  
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  return (
    <div className="flex items-center">
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="mr-2 px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none"
      >
        <option value="updated_at">최근 수정일</option>
        <option value="created_at">생성일</option>
        <option value="title">제목</option>
        <option value="last_used_at">최근 사용일</option>
        <option value="use_count">사용 횟수</option>
      </select>
      
      <button
        onClick={toggleSortDirection}
        className="p-2 bg-white border rounded hover:bg-gray-50"
        title={sortDirection === 'asc' ? '오름차순' : '내림차순'}
      >
        {sortDirection === 'asc' 
          ? <SortAsc size={18} />
          : <SortDesc size={18} />
        }
      </button>
    </div>
  );
};

export default SortControls;
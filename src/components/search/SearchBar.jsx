import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const SearchBar = () => {
  const { searchQuery, setSearchQuery } = useAppContext();
  const [inputValue, setInputValue] = useState(searchQuery);
  
  // 입력값이 변경될 때마다 검색 실행
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchQuery(value); // 입력 즉시 검색 상태 업데이트
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // 폼 제출 이벤트 방지
  };
  
  const clearSearch = () => {
    setInputValue('');
    setSearchQuery('');
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <input 
        type="text" 
        placeholder="프롬프트 검색... (제목, 태그, 폴더)" 
        value={inputValue}
        onChange={handleInputChange}
        className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none"
      />
      <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
      
      {inputValue && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      )}
    </form>
  );
};

export default SearchBar;
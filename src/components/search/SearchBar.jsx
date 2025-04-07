import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const SearchBar = () => {
  const { searchQuery, setSearchQuery } = useAppContext();
  const [inputValue, setInputValue] = useState(searchQuery);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(inputValue);
  };
  
  const clearSearch = () => {
    setInputValue('');
    setSearchQuery('');
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <input 
        type="text" 
        placeholder="프롬프트 검색..." 
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
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
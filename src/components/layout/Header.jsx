import React, { useState } from 'react';
import { 
  Filter, Grid, List, Settings, FilePlus, 
  X, ChevronUp, ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import SearchBar from '../search/SearchBar';
import TagFilter from '../filters/TagFilter';
import SortControls from '../filters/SortControls';

const Header = () => {
  const { 
    viewMode, 
    setViewMode, 
    handleAddPrompt, 
    goToSettings,
    filterTags
  } = useAppContext();
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const toggleFilter = () => {
    setIsFilterOpen(prev => !prev);
  };
  
  return (
    <div className="bg-white border-b border-gray-200 p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="w-1/2">
          <SearchBar />
        </div>
        
        <div className="flex items-center space-x-2">
          <SortControls />
          
          <button 
            className={`p-2 bg-white border rounded hover:bg-gray-50 ${isFilterOpen || filterTags.length > 0 ? 'text-blue-600 border-blue-300' : ''}`}
            onClick={toggleFilter}
          >
            <Filter size={18} />
          </button>
          
          <div className="flex border rounded-lg overflow-hidden">
            <button 
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'bg-white'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button 
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'bg-white'}`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
          
          <Link 
            to="/settings"
            className="p-2 bg-white border rounded hover:bg-gray-50 inline-flex"
          >
            <Settings size={18} />
          </Link>
          
          <button 
            className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            onClick={handleAddPrompt}
          >
            <FilePlus size={18} className="mr-2" />
            새 프롬프트
          </button>
        </div>
      </div>
      
      {isFilterOpen && (
        <div className="pb-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">필터</h3>
            <button 
              onClick={toggleFilter}
              className="text-gray-500 hover:text-gray-700"
            >
              {isFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          <TagFilter />
        </div>
      )}
      
      {!isFilterOpen && filterTags.length > 0 && (
        <div className="flex items-center gap-2 text-sm mt-1">
          <span className="text-gray-600">적용된 필터:</span>
          {filterTags.map(tag => (
            <span 
              key={tag} 
              className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center"
            >
              {tag}
              <button 
                className="ml-1 text-blue-500 hover:text-blue-700"
                onClick={() => {
                  // 해당 태그만 필터에서 제거
                  const { setFilterTags } = useAppContext();
                  setFilterTags(prev => prev.filter(t => t !== tag));
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default Header;
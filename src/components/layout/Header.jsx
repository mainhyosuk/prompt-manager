import React from 'react';
import { Search, Filter, SortAsc, Grid, List, Settings, FilePlus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Header = ({ viewMode, setViewMode }) => {
  const { handleAddPrompt, goToSettings } = useAppContext();
  
  return (
    <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
      <div className="relative w-1/2">
        <input 
          type="text" 
          placeholder="프롬프트 검색..." 
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
      </div>
      
      <div className="flex items-center space-x-2">
        <button className="p-2 bg-white border rounded hover:bg-gray-50">
          <Filter size={18} />
        </button>
        <button className="p-2 bg-white border rounded hover:bg-gray-50">
          <SortAsc size={18} />
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
        <button 
          className="p-2 bg-white border rounded hover:bg-gray-50"
          onClick={goToSettings}
        >
          <Settings size={18} />
        </button>
        <button 
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          onClick={handleAddPrompt}
        >
          <FilePlus size={18} className="mr-2" />
          새 프롬프트
        </button>
      </div>
    </div>
  );
};

export default Header;
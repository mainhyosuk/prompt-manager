import React from 'react';
import { X, Plus } from 'lucide-react';

const VariableList = ({ variables, setVariables }) => {
  const addVariable = () => {
    setVariables([...variables, { name: '', default_value: '' }]);
  };

  const updateVariable = (index, field, value) => {
    const updatedVariables = [...variables];
    updatedVariables[index] = { ...updatedVariables[index], [field]: value };
    setVariables(updatedVariables);
  };

  const removeVariable = (index) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-700">변수</h3>
        <button
          type="button"
          onClick={addVariable}
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
        >
          <Plus size={16} className="mr-1" />
          변수 추가
        </button>
      </div>

      {variables.length === 0 ? (
        <p className="text-sm text-gray-500 mb-2">
          변수는 {"{변수명}"} 형식으로 입력하면 자동으로 인식됩니다.
        </p>
      ) : (
        <div className="space-y-2">
          {variables.map((variable, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex-grow flex space-x-2">
                <input
                  type="text"
                  value={variable.name}
                  onChange={(e) => updateVariable(index, 'name', e.target.value)}
                  placeholder="변수명"
                  className="flex-grow px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <input
                  type="text"
                  value={variable.default_value}
                  onChange={(e) => updateVariable(index, 'default_value', e.target.value)}
                  placeholder="기본값 (선택사항)"
                  className="flex-grow px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <button
                type="button"
                onClick={() => removeVariable(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariableList;
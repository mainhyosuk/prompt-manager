import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, FileText } from 'lucide-react';

const VariableList = ({ variables, onVariableChange }) => {
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [textEditorValue, setTextEditorValue] = useState('');
  const textEditorRef = useRef(null);

  const updateVariable = (index, field, value) => {
    onVariableChange(index, field, value);
  };

  const openTextEditor = (index) => {
    setEditingIndex(index);
    setTextEditorValue(variables[index].default_value || '');
    setIsTextEditorOpen(true);
  };

  const closeTextEditor = () => {
    setIsTextEditorOpen(false);
    setEditingIndex(null);
    setTextEditorValue('');
  };

  const saveTextEditorValue = () => {
    if (editingIndex !== null) {
      onVariableChange(editingIndex, 'default_value', textEditorValue);
    }
    closeTextEditor();
  };

  useEffect(() => {
    const handleTextEditorOutsideClick = (event) => {
      if (isTextEditorOpen && textEditorRef.current && !textEditorRef.current.contains(event.target)) {
        closeTextEditor();
      }
    };
    
    if (isTextEditorOpen) {
      document.addEventListener('mousedown', handleTextEditorOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleTextEditorOutsideClick);
    };
  }, [isTextEditorOpen]);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isTextEditorOpen) {
        closeTextEditor();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isTextEditorOpen]);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-700">변수</h3>
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
                  readOnly
                  placeholder="변수명"
                  className="flex-grow px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <div className="flex-grow flex">
                  <input
                    type="text"
                    value={variable.default_value}
                    onChange={(e) => updateVariable(index, 'default_value', e.target.value)}
                    placeholder="기본값 (선택사항)"
                    className="flex-grow px-3 py-2 border rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button
                    type="button"
                    onClick={() => openTextEditor(index)}
                    className="px-3 py-2 border border-l-0 rounded-r-lg bg-gray-50 hover:bg-gray-100 text-gray-600"
                    title="텍스트 에디터 열기"
                  >
                    <FileText size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 텍스트 에디터 모달 */}
      {isTextEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={textEditorRef} className="bg-white rounded-lg shadow-xl w-2/3 max-w-2xl flex flex-col">
            <div className="flex justify-between items-center border-b px-4 py-3">
              <h3 className="font-medium">
                "{editingIndex !== null ? variables[editingIndex].name || '기본값' : ''}" 변수 기본값 편집
              </h3>
              <button 
                onClick={closeTextEditor}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <textarea
                value={textEditorValue}
                onChange={(e) => setTextEditorValue(e.target.value)}
                className="w-full h-64 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="내용을 입력하세요..."
              />
            </div>
            
            <div className="border-t p-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={closeTextEditor}
                className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveTextEditorValue}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariableList;
import { useState, useCallback } from 'react';
import { getPrompts, createPrompt, updatePrompt, deletePrompt } from '../api/promptApi';

/**
 * 프롬프트 데이터 관리를 위한 커스텀 훅
 */
export const usePrompts = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 프롬프트 목록 불러오기
  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getPrompts();
      setPrompts(data);
    } catch (err) {
      setError('프롬프트를 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 프롬프트 추가
  const addPrompt = useCallback(async (promptData) => {
    setLoading(true);
    setError(null);
    
    try {
      const newPrompt = await createPrompt(promptData);
      setPrompts(prev => [...prev, newPrompt]);
      return newPrompt;
    } catch (err) {
      setError('프롬프트를 추가하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 프롬프트 수정
  const updatePromptItem = useCallback(async (id, promptData) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedPrompt = await updatePrompt(id, promptData);
      setPrompts(prev => 
        prev.map(p => p.id === id ? updatedPrompt : p)
      );
      return updatedPrompt;
    } catch (err) {
      setError('프롬프트를 수정하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 프롬프트 삭제
  const removePrompt = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      await deletePrompt(id);
      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError('프롬프트를 삭제하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    prompts,
    loading,
    error,
    fetchPrompts,
    addPrompt,
    updatePromptItem,
    removePrompt
  };
};
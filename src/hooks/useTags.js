import { useState, useCallback } from 'react';
import { getTags, createTag, deleteTag } from '../api/tagApi';

/**
 * 태그 데이터 관리를 위한 커스텀 훅
 */
export const useTags = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 태그 목록 불러오기
  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getTags();
      setTags(data);
    } catch (err) {
      setError('태그를 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 태그 추가
  const addTag = useCallback(async (tagData) => {
    setLoading(true);
    setError(null);
    
    try {
      const newTag = await createTag(tagData);
      setTags(prev => [...prev, newTag]);
      return newTag;
    } catch (err) {
      setError('태그를 추가하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 태그 삭제
  const removeTag = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      await deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError('태그를 삭제하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tags,
    loading,
    error,
    fetchTags,
    addTag,
    removeTag
  };
};
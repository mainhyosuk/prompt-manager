import { useState, useCallback } from 'react';
import { getFolders, createFolder, updateFolder, deleteFolder } from '../api/folderApi';

/**
 * 폴더 데이터 관리를 위한 커스텀 훅
 */
export const useFolders = () => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('모든 프롬프트');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});

  // 폴더 목록 불러오기
  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getFolders();
      setFolders(data);
    } catch (err) {
      setError('폴더를 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 폴더 추가
  const addFolder = useCallback(async (folderData) => {
    setLoading(true);
    setError(null);
    
    try {
      const newFolder = await createFolder(folderData);
      setFolders(prev => [...prev, newFolder]);
      return newFolder;
    } catch (err) {
      setError('폴더를 추가하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 폴더 수정
  const updateFolderItem = useCallback(async (id, folderData) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedFolder = await updateFolder(id, folderData);
      setFolders(prev => 
        prev.map(f => f.id === id ? updatedFolder : f)
      );
      return updatedFolder;
    } catch (err) {
      setError('폴더를 수정하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 폴더 삭제
  const removeFolder = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      await deleteFolder(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      
      // 삭제된 폴더가 현재 선택된 폴더라면 '모든 프롬프트'로 변경
      const deletedFolder = folders.find(f => f.id === id);
      if (deletedFolder && deletedFolder.name === selectedFolder) {
        setSelectedFolder('모든 프롬프트');
      }
    } catch (err) {
      setError('폴더를 삭제하는 중 오류가 발생했습니다.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [folders, selectedFolder]);

  // 폴더 확장/축소 토글
  const toggleFolder = useCallback((folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  }, []);

  return {
    folders,
    selectedFolder,
    setSelectedFolder,
    expandedFolders,
    loading,
    error,
    fetchFolders,
    addFolder,
    updateFolderItem,
    removeFolder,
    toggleFolder
  };
};
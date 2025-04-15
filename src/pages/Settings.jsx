import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sun, Moon, Download, Upload, Save, Folder, Info, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getSettings, updateSettings, backupDatabase, restoreDatabase } from '../api/settingsApi';

const Settings = () => {
  const { goToDashboard } = useAppContext();
  
  // 설정 상태
  const [settings, setSettings] = useState({
    theme: 'light',
    backup_path: '',
    auto_backup: false,
    backup_interval: 7
  });
  
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 현재 활성화된 설정 탭
  const [activeTab, setActiveTab] = useState('general');
  
  // 파일 선택기에 대한 참조
  const fileInputRef = React.useRef(null);
  
  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (error) {
        console.error('설정을 로드하는데 실패했습니다:', error);
        setMessage({ type: 'error', text: '설정을 로드하는데 실패했습니다.' });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // 설정 저장
  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await updateSettings(settings);
      setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
      
      // 메시지 3초 후 초기화
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 테마 변경
  const handleThemeChange = (theme) => {
    setSettings(prev => ({ ...prev, theme }));
  };
  
  // 백업 경로 변경
  const handleBackupPathChange = (e) => {
    setSettings(prev => ({ ...prev, backup_path: e.target.value }));
  };
  
  // 자동 백업 토글
  const handleAutoBackupToggle = () => {
    setSettings(prev => ({ ...prev, auto_backup: !prev.auto_backup }));
  };
  
  // 백업 간격 변경
  const handleBackupIntervalChange = (e) => {
    setSettings(prev => ({ ...prev, backup_interval: parseInt(e.target.value) || 7 }));
  };
  
  // 백업 실행
  const handleBackup = async () => {
    if (!settings.backup_path) {
      setMessage({ type: 'error', text: '백업 경로를 설정해주세요.' });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await backupDatabase({ path: settings.backup_path });
      setMessage({ type: 'success', text: `백업이 완료되었습니다: ${result.backup_file}` });
    } catch (error) {
      console.error('백업 실패:', error);
      setMessage({ type: 'error', text: '백업에 실패했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 복원 파일 선택
  const handleRestoreFileSelect = () => {
    fileInputRef.current.click();
  };
  
  // 복원 실행
  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 확인 대화상자
    if (!window.confirm('데이터를 복원하면 현재 데이터가 모두 삭제됩니다. 계속하시겠습니까?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      // 파일 경로를 서버에 전달
      const result = await restoreDatabase({ file: file.path });
      setMessage({ type: 'success', text: '데이터가 성공적으로 복원되었습니다.' });
    } catch (error) {
      console.error('복원 실패:', error);
      setMessage({ type: 'error', text: '데이터 복원에 실패했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white min-h-screen">
      {/* 헤더 */}
      <header className="bg-blue-600 text-white px-6 py-4 flex items-center">
        <Link 
          to="/"
          className="mr-4 hover:bg-blue-700 p-1 rounded"
        >
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">설정</h1>
      </header>
      
      <div className="flex">
        {/* 사이드바 */}
        <div className="w-64 border-r min-h-[calc(100vh-4rem)] p-4">
          <nav>
            <ul className="space-y-1">
              <li>
                <button 
                  className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'general' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('general')}
                >
                  일반 설정
                </button>
              </li>
              <li>
                <button 
                  className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'data' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('data')}
                >
                  데이터 관리
                </button>
              </li>
              <li>
                <button 
                  className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'folders' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('folders')}
                >
                  폴더 관리
                </button>
              </li>
              <li>
                <button 
                  className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'info' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('info')}
                >
                  정보
                </button>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* 메인 콘텐츠 */}
        <div className="flex-1 p-6">
          {/* 메시지 표시 */}
          {message.text && (
            <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}
          
          {/* 일반 설정 */}
          {activeTab === 'general' && (
            <div>
              <h2 className="text-xl font-bold mb-4">일반 설정</h2>
              
              <div className="mb-6">
                <h3 className="font-medium mb-2">테마</h3>
                <div className="flex space-x-4">
                  <button 
                    className={`flex items-center p-3 border rounded-lg ${settings.theme === 'light' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <Sun className="mr-2" size={20} />
                    라이트 모드
                  </button>
                  <button 
                    className={`flex items-center p-3 border rounded-lg ${settings.theme === 'dark' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <Moon className="mr-2" size={20} />
                    다크 모드
                  </button>
                </div>
              </div>
              
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                onClick={handleSaveSettings}
                disabled={isLoading}
              >
                <Save size={18} className="mr-2" />
                설정 저장
              </button>
            </div>
          )}
          
          {/* 데이터 관리 */}
          {activeTab === 'data' && (
            <div>
              <h2 className="text-xl font-bold mb-4">데이터 관리</h2>
              
              <div className="mb-6">
                <h3 className="font-medium mb-2">백업 설정</h3>
                <div className="flex mb-2">
                  <input 
                    type="text" 
                    value={settings.backup_path} 
                    onChange={handleBackupPathChange}
                    placeholder="백업 파일 저장 경로"
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button className="ml-2 px-3 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200">
                    찾아보기
                  </button>
                </div>
                
                <div className="flex items-center mb-4">
                  <input 
                    type="checkbox" 
                    id="auto-backup" 
                    checked={settings.auto_backup} 
                    onChange={handleAutoBackupToggle}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="auto-backup" className="ml-2">자동 백업 활성화</label>
                </div>
                
                <div className="mb-4">
                  <label className="mb-1 block">자동 백업 주기</label>
                  <select 
                    value={settings.backup_interval} 
                    onChange={handleBackupIntervalChange}
                    className="px-3 py-2 border rounded-lg w-full"
                    disabled={!settings.auto_backup}
                  >
                    <option value="1">매일</option>
                    <option value="7">매주</option>
                    <option value="30">매월</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-medium mb-2">데이터 가져오기/내보내기</h3>
                <div className="flex space-x-2">
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    onClick={handleBackup}
                    disabled={isLoading || !settings.backup_path}
                  >
                    <Download size={18} className="mr-2" />
                    데이터 백업
                  </button>
                  
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleRestore}
                    style={{ display: 'none' }}
                  />
                  
                  <button 
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                    onClick={handleRestoreFileSelect}
                    disabled={isLoading}
                  >
                    <Upload size={18} className="mr-2" />
                    백업에서 복원
                  </button>
                </div>
              </div>
              
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                onClick={handleSaveSettings}
                disabled={isLoading}
              >
                <Save size={18} className="mr-2" />
                설정 저장
              </button>
            </div>
          )}
          
          {/* 폴더 관리 */}
          {activeTab === 'folders' && (
            <div>
              <h2 className="text-xl font-bold mb-4">폴더 관리</h2>
              
              <div className="mb-4 flex">
                <input 
                  type="text" 
                  placeholder="새 폴더 이름"
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                  <Plus size={18} className="mr-2" />
                  추가
                </button>
              </div>
              
              <div className="border rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2">이름</th>
                      <th className="px-4 py-2">프롬프트 수</th>
                      <th className="px-4 py-2">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-2">마케팅</td>
                      <td className="px-4 py-2">5</td>
                      <td className="px-4 py-2">
                        <button className="text-red-500 p-1 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2">개발</td>
                      <td className="px-4 py-2">8</td>
                      <td className="px-4 py-2">
                        <button className="text-red-500 p-1 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* 정보 */}
          {activeTab === 'info' && (
            <div>
              <h2 className="text-xl font-bold mb-4">정보</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg border mb-4">
                <h3 className="font-medium mb-2">프롬프트 관리 도구</h3>
                <p className="text-gray-600">버전 1.0.0</p>
                <p className="text-gray-600 mt-2">LLM 프롬프트를 효율적으로 관리하기 위한 데스크톱 애플리케이션입니다.</p>
                <p className="text-gray-600 mt-2">© 2023 프롬프트 관리 도구 개발팀</p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">시스템 정보</h3>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-1 pr-4 text-gray-600">운영체제:</td>
                      <td className="py-1">Windows 10</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-4 text-gray-600">Python 버전:</td>
                      <td className="py-1">3.9.7</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-4 text-gray-600">데이터베이스:</td>
                      <td className="py-1">SQLite 3.36.0</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-4 text-gray-600">저장된 프롬프트:</td>
                      <td className="py-1">23개</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-4 text-gray-600">데이터베이스 크기:</td>
                      <td className="py-1">1.2 MB</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
// 일반 프롬프트의 상세 정보 확인을 위한 메인 모달

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { applyVariables, extractVariables, splitContentByVariables } from '../utils/variableParser';
import { copyToClipboard } from '../utils/clipboard';
import { updatePromptMemo } from '../api/promptApi';
import { getSimilarPrompts } from '../api/collectionApi';
import PromptPanel from '../components/promptPanel/PromptPanel';
import PromptItemCard from '../components/promptPanel/PromptItemCard';
import { ChevronLeft, GripVertical, Maximize2 } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import PromptExpandView from '../components/common/PromptExpandView';
import MemoExpandModal from '../components/common/MemoExpandModal';
import { updateUserAddedPrompt } from '../api/userPromptApi'; // 사용자 프롬프트 업데이트 API 임포트

// 변수가 적용된 내용을 하이라이트하는 컴포넌트
const HighlightedContent = ({ content, variableValues }) => {
  if (!content) return null;
  
  // 원본 프롬프트에서 모든 변수 추출
  const templateVariables = extractVariables(content);
  
  // 사용자가 입력한 변수명 목록
  const userVariableNames = Object.keys(variableValues || {});
  
  // 프롬프트를 텍스트와 변수로 분리
  const parts = splitContentByVariables(content);
  
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'variable') {
          // 매칭되는 사용자 변수 찾기 (변수 파서와 동일한 로직)
          const matchedVarName = findMatchingVariable(part.name, userVariableNames);
          const value = matchedVarName ? variableValues[matchedVarName] : '';
          const hasValue = value && value.trim() !== '';
          
          // 값이 있으면 적용된 값 표시, 없으면 원래 변수 표시
          return (
            <span 
              key={index} 
              className={hasValue 
                ? "bg-green-100 text-green-800 px-1 rounded" 
                : "bg-yellow-100 text-yellow-800 px-1 rounded"}
              title={hasValue ? `원래 변수: {${part.name}}` : '값이 적용되지 않음'}
            >
              {hasValue ? value : part.content}
            </span>
          );
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </div>
  );
};

// 매칭되는 변수 찾기 (variableParser.js의 함수와 유사)
const findMatchingVariable = (templateVarName, userVarNames) => {
  // 동일한 변수명이 있으면 그것을 사용
  if (userVarNames.includes(templateVarName)) {
    return templateVarName;
  }
  
  // 하드코딩된 매핑 (프로젝트 고유 매핑)
  const hardcodedMapping = {
    'v1.345 버전': '버전 기록',
    'v1.455': '버전 기록',
    '버전': '버전 기록',
    '2025-04-07 월': '일자',
    '날짜': '일자',
    '주요 개선사항': '개선사항'
  };
  
  if (hardcodedMapping[templateVarName] && userVarNames.includes(hardcodedMapping[templateVarName])) {
    return hardcodedMapping[templateVarName];
  }
  
  return null;
};

const PromptDetailModal = () => {
  const { 
    selectedPrompt, 
    setSelectedPrompt,
    isDetailModalOpen, 
    setIsDetailModalOpen,
    handleEditPrompt,
    handleToggleFavorite,
    handleRecordUsage,
    getTagColorClasses,
    handleUpdateVariableDefaultValue,
    updatePromptItem,
    openOverlayModal,
    handleViewPrompt,
    previousPrompt,
    switchToPrompt,
    handleGoBack,
    handleUpdatePromptTitle
  } = useAppContext();
  
  const [variableValues, setVariableValues] = useState({});
  const [processedContent, setProcessedContent] = useState('');
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle', 'copying', 'copied', 'error'
  const modalRef = useRef(null);
  
  // 텍스트 에디터 모달 상태
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [textEditorValue, setTextEditorValue] = useState('');
  const textEditorRef = useRef(null);
  
  // 변수 저장 상태 관리
  const [savingStates, setSavingStates] = useState({});
  
  // 메모 관련 상태
  const [memo, setMemo] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const memoTimerRef = useRef(null);
  const autoSaveDelay = 1000; // 1초 후 자동 저장
  const [isMemoExpanded, setIsMemoExpanded] = useState(false); // 메모 확장 모달 상태 추가
  
  // 유사 프롬프트 관련 상태 추가
  const [similarPrompts, setSimilarPrompts] = useState([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [similarError, setSimilarError] = useState(null);
  
  // 제목 수정 상태 추가
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const titleInputRef = useRef(null);
  
  // 패널 리사이징 관련 상태 추가
  const H_PANEL_SPLIT_KEY = 'promptDetailHSplit'; // 원본/적용된 프롬프트 분할 (가로)
  const V_PANEL_SPLIT_KEY = 'promptDetailVSplit'; // 상단 영역/메모 분할 (세로)
  const MAIN_SPLIT_KEY = 'promptDetailMainSplit'; // 주요 영역/사이드바 분할 (가로)
  
  // 패널 렌더링 준비 상태
  const [panelsReady, setPanelsReady] = useState(false);
  
  // 기본값 하드코딩
  const DEFAULT_H_PANEL_SIZES = [50, 50]; // 원본 프롬프트 / 변수 적용 프롬프트
  const DEFAULT_V_PANEL_SIZES = [65, 35]; // 상단 영역 / 메모 영역
  const DEFAULT_MAIN_SIZES = [65, 35]; // 좌측 영역 / 우측 사이드바
  
  // 가로 분할 (원본/적용된 프롬프트)
  const [hPanelSizes, setHPanelSizes] = useState(DEFAULT_H_PANEL_SIZES);
  
  // 세로 분할 (상단 영역/메모)
  const [vPanelSizes, setVPanelSizes] = useState(DEFAULT_V_PANEL_SIZES);
  
  // 메인 분할 (주요 영역/사이드바)
  const [mainSizes, setMainSizes] = useState(DEFAULT_MAIN_SIZES);
  
  // 패널 그룹 레퍼런스
  const mainPanelGroupRef = useRef(null);
  const vPanelGroupRef = useRef(null);
  const hPanelGroupRef = useRef(null);
  
  // 리사이징 핸들러 함수들
  const handleHPanelResize = useCallback((sizes) => {
    setHPanelSizes(sizes);
    localStorage.setItem(H_PANEL_SPLIT_KEY, JSON.stringify(sizes));
  }, []);
  
  const handleVPanelResize = useCallback((sizes) => {
    setVPanelSizes(sizes);
    localStorage.setItem(V_PANEL_SPLIT_KEY, JSON.stringify(sizes));
  }, []);
  
  const handleMainResize = useCallback((sizes) => {
    setMainSizes(sizes);
    localStorage.setItem(MAIN_SPLIT_KEY, JSON.stringify(sizes));
  }, []);
  
  // localStorage 강제 초기화 및 패널 크기 설정
  const initializePanelSizes = useCallback(() => {
    // console.log('[Panel Init] 패널 초기화 시작');
    
    // 먼저 localStorage 값을 강제로 설정
    localStorage.setItem(H_PANEL_SPLIT_KEY, JSON.stringify(DEFAULT_H_PANEL_SIZES));
    localStorage.setItem(V_PANEL_SPLIT_KEY, JSON.stringify(DEFAULT_V_PANEL_SIZES));
    localStorage.setItem(MAIN_SPLIT_KEY, JSON.stringify(DEFAULT_MAIN_SIZES));
    
    // 상태 업데이트
    setHPanelSizes(DEFAULT_H_PANEL_SIZES);
    setVPanelSizes(DEFAULT_V_PANEL_SIZES);
    setMainSizes(DEFAULT_MAIN_SIZES);
    
    // 약간의 지연 후 패널 준비 상태 설정
    setTimeout(() => {
      setPanelsReady(true);
      // console.log('[Panel Init] 패널 준비 완료');
      
      // 패널 그룹이 마운트된 후에 사이즈 강제 설정
      setTimeout(() => {
        if (mainPanelGroupRef.current) {
          // console.log('[Panel Init] 메인 패널 크기 수동 설정', DEFAULT_MAIN_SIZES);
          mainPanelGroupRef.current.setLayout(DEFAULT_MAIN_SIZES);
        }
        if (vPanelGroupRef.current) {
          // console.log('[Panel Init] 세로 패널 크기 수동 설정', DEFAULT_V_PANEL_SIZES);
          vPanelGroupRef.current.setLayout(DEFAULT_V_PANEL_SIZES);
        }
        if (hPanelGroupRef.current) {
          // console.log('[Panel Init] 가로 패널 크기 수동 설정', DEFAULT_H_PANEL_SIZES);
          hPanelGroupRef.current.setLayout(DEFAULT_H_PANEL_SIZES);
        }
      }, 100);
    }, 50);
  }, []);
  
  // 모달이 열릴 때 패널 초기화
  useEffect(() => {
    if (isDetailModalOpen) {
      // console.log('[Modal] 모달 열림 - 패널 초기화 시작');
      setPanelsReady(false);
      initializePanelSizes();
    }
  }, [isDetailModalOpen, initializePanelSizes]);
  
  // 변수 기본값 설정
  useEffect(() => {
    if (selectedPrompt?.variables) {
      const initialValues = {};
      selectedPrompt.variables.forEach(variable => {
        initialValues[variable.name] = variable.default_value || '';
      });
      setVariableValues(initialValues);
      
      // 초기 프롬프트 내용을 변수 적용 버전으로 설정
      const initialProcessed = applyVariables(selectedPrompt.content, initialValues);
      setProcessedContent(initialProcessed);
      
      // 저장 상태 초기화
      const initialSavingStates = {};
      selectedPrompt.variables.forEach(variable => {
        initialSavingStates[variable.name] = 'idle'; // 'idle', 'saving', 'saved', 'error'
      });
      setSavingStates(initialSavingStates);
    }
  }, [selectedPrompt]);
  
  // 변수값이 변경될 때마다 프롬프트 내용 업데이트
  const updateProcessedContent = useCallback(() => {
    if (selectedPrompt) {
      const processed = applyVariables(selectedPrompt.content, variableValues);
      setProcessedContent(processed);
    }
  }, [selectedPrompt, variableValues]);
  
  // 변수값이 변경되면 프롬프트 내용 업데이트
  useEffect(() => {
    updateProcessedContent();
  }, [updateProcessedContent]);
  
  // 변수값 업데이트
  const handleVariableChange = (name, value) => {
    setVariableValues(prev => {
      const newValues = {
        ...prev,
        [name]: value
      };
      const processed = applyVariables(selectedPrompt.content, newValues);
      setProcessedContent(processed);
      return newValues;
    });
    setSavingStates(prev => ({ ...prev, [name]: 'idle' }));
  };
  
  // 변수 기본값 저장 핸들러 (ID 기반 분기 로직 수정)
  const handleSaveVariableDefaultValue = useCallback(async (variableName, explicitValue = null) => {
    if (!selectedPrompt?.id || !variableName || !selectedPrompt.variables) {
      console.error('저장에 필요한 정보 부족');
      return;
    }
    const variableIndex = selectedPrompt.variables.findIndex(v => v.name === variableName);
    if (variableIndex === -1) {
      console.error(`변수 '${variableName}'을 찾을 수 없습니다.`);
      return;
    }
    const newValue = explicitValue !== null ? explicitValue : (variableValues[variableName] || '');

    // 변경된 경우에만 업데이트
    if (newValue !== selectedPrompt.variables[variableIndex].default_value) {
      setSavingStates(prev => ({ ...prev, [variableName]: 'saving' }));
      try {
        const updatedVariables = selectedPrompt.variables.map((v, index) => {
          if (index === variableIndex) {
            return { ...v, default_value: newValue };
          }
          return v;
        });

        // ID 확인하여 API 분기
        if (typeof selectedPrompt.id === 'string' && selectedPrompt.id.startsWith('user-added-')) {
          // 사용자 추가 프롬프트: 로컬 스토리지 API 직접 호출
          await updateUserAddedPrompt(selectedPrompt.id, { variables: updatedVariables });
          console.log(`[handleSaveVariableDefaultValue] Updated user-added prompt ${selectedPrompt.id} via userPromptApi`);
        } else {
          // 일반 프롬프트: AppContext의 서버 API 래퍼 호출
          await handleUpdateVariableDefaultValue(selectedPrompt.id, variableName, newValue);
          console.log(`[handleSaveVariableDefaultValue] Updated server prompt ${selectedPrompt.id} via AppContext handler`);
        }

        // AppContext 상태 업데이트
        updatePromptItem(selectedPrompt.id, { variables: updatedVariables });
        // 로컬 상태 업데이트
        setVariableValues(prev => ({ ...prev, [variableName]: newValue }));

        setSavingStates(prev => ({ ...prev, [variableName]: 'saved' }));
        setTimeout(() => {
          setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
        }, 2000);

      } catch (error) {
        console.error(`변수 기본값 저장 오류 (ID: ${selectedPrompt.id}):`, error);
        setSavingStates(prev => ({ ...prev, [variableName]: 'error' }));
        setTimeout(() => {
          setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
        }, 3000);
      }
    } else {
      setSavingStates(prev => ({ ...prev, [variableName]: 'saved' }));
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [variableName]: 'idle' }));
      }, 1500);
    }
  }, [selectedPrompt, variableValues, handleUpdateVariableDefaultValue, updatePromptItem]);
  
  // 텍스트 에디터 열기
  const openTextEditor = (variable) => {
    setEditingVariable(variable);
    setTextEditorValue(variableValues[variable.name] || '');
    setIsTextEditorOpen(true);
  };
  
  // 텍스트 에디터 닫기
  const closeTextEditor = () => {
    setIsTextEditorOpen(false);
    setEditingVariable(null);
    setTextEditorValue('');
  };
  
  // 텍스트 에디터 '적용' 버튼
  const saveTextEditorValue = () => {
    if (editingVariable) {
      handleVariableChange(editingVariable.name, textEditorValue);
    }
    closeTextEditor();
  };
  
  // 텍스트 에디터 '기본값으로 저장' 버튼
  const saveTextEditorValueAsDefault = async () => {
    if (!editingVariable || !selectedPrompt) return;
    try {
      // 수정된 handleSaveVariableDefaultValue 호출 확인
      await handleSaveVariableDefaultValue(editingVariable.name, textEditorValue);
      closeTextEditor();
    } catch (error) {
      console.error('텍스트 에디터에서 기본값 저장 오류:', error);
    }
  };
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleOutsideClick = async (event) => {
      // 부모 모달(PromptDetailModal)의 참조가 있고 클릭된 대상이 부모 모달 내부가 아닐 때
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        
        // 1. 텍스트 에디터 모달 내부 클릭 확인
        const clickedInsideTextEditor = isTextEditorOpen && textEditorRef.current && textEditorRef.current.contains(event.target);
        if (clickedInsideTextEditor) return;
        
        // 2. 오버레이 모달이 열려있는지 확인 (존재하는지만 확인)
        const overlayModalOpen = !!document.querySelector('[data-modal="prompt-overlay"], [data-modal="user-prompt-detail"]');
        
        // 오버레이 모달이 열려있으면 부모 모달이 닫히지 않도록 함
        if (overlayModalOpen) {
          // 이벤트 핸들링 중지
          event.stopPropagation();
          return;
        }
        
        // 3. 위의 조건에 해당하지 않으면 부모 모달 닫기
        // 모달을 닫기 전에 메모가 저장되도록 함
        if (memoTimerRef.current) {
          clearTimeout(memoTimerRef.current);
          memoTimerRef.current = null;
        }
        
        // 메모에 변경 사항이 있으면 저장
        if (selectedPrompt && memo !== selectedPrompt.memo) {
          try {
            await updatePromptMemo(selectedPrompt.id, memo);
            updatePromptItem(selectedPrompt.id, { ...selectedPrompt, memo });
          } catch (error) {
            console.error('모달 닫기 전 메모 저장 오류:', error);
          }
        }
        
        // 모달 닫기
        setIsDetailModalOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [setIsDetailModalOpen, memo, selectedPrompt, updatePromptItem, isTextEditorOpen]);
  
  // 텍스트 에디터 외부 클릭 감지
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

  // ESC 키 입력 감지
  useEffect(() => {
    const handleEscKey = async (event) => {
      if (event.key === 'Escape') {
        // 1. 텍스트 에디터가 열려있으면 텍스트 에디터만 닫기
        if (isTextEditorOpen) {
          closeTextEditor();
          return;
        }
        
        // 2. 오버레이 모달이 열려있는지 확인 (존재하는지만 확인)
        const overlayModalOpen = !!document.querySelector('[data-modal="prompt-overlay"], [data-modal="user-prompt-detail"]');
        
        // 오버레이 모달이 열려있으면 부모 모달이 닫히지 않도록 함
        if (overlayModalOpen) {
          // 이벤트 핸들링 중지
          event.stopPropagation();
          return;
        }
        
        // 3. 위의 조건에 해당하지 않으면 부모 모달 닫기
        // 모달을 닫기 전에 메모가 저장되도록 함
        if (memoTimerRef.current) {
          clearTimeout(memoTimerRef.current);
          memoTimerRef.current = null;
        }
        
        // 메모에 변경 사항이 있으면 저장
        if (selectedPrompt && memo !== selectedPrompt.memo) {
          try {
            await updatePromptMemo(selectedPrompt.id, memo);
            updatePromptItem(selectedPrompt.id, { ...selectedPrompt, memo });
          } catch (error) {
            console.error('모달 닫기 전 메모 저장 오류:', error);
          }
        }
        
        // 모달 닫기
        setIsDetailModalOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [setIsDetailModalOpen, isTextEditorOpen, memo, selectedPrompt, updatePromptItem]);
  
  // 모달 닫기 전 메모 저장 처리
  const handleCloseModal = async () => {
    // 메모 자동 저장 타이머가 있으면 취소
    if (memoTimerRef.current) {
      clearTimeout(memoTimerRef.current);
      memoTimerRef.current = null;
    }
    
    // 메모에 변경 사항이 있으면 저장
    if (selectedPrompt && memo !== selectedPrompt.memo) {
      try {
        await updatePromptMemo(selectedPrompt.id, memo);
        updatePromptItem(selectedPrompt.id, { ...selectedPrompt, memo });
      } catch (error) {
        console.error('모달 닫기 전 메모 저장 오류:', error);
      }
    }
    
    // 모달 닫기
    setIsDetailModalOpen(false);
  };
  
  // 선택된 프롬프트가 변경될 때 메모 값 초기화
  useEffect(() => {
    if (selectedPrompt) {
      setMemo(selectedPrompt.memo || '');
      setEditableTitle(selectedPrompt.title || ''); // editableTitle 초기화
      setIsEditingTitle(false); // 편집 모드 해제
    }
  }, [selectedPrompt]);
  
  // 제목 편집 모드 활성화 시 input에 포커스
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select(); // 텍스트 전체 선택
    }
  }, [isEditingTitle]);
  
  // 제목 클릭 핸들러
  const handleTitleClick = () => {
    setEditableTitle(selectedPrompt.title || ''); // 현재 제목으로 초기화
    setIsEditingTitle(true);
  };

  // 제목 수정 완료 핸들러 (Enter 또는 Blur)
  const handleTitleChangeComplete = async () => {
    if (!isEditingTitle) return;

    const trimmedTitle = editableTitle.trim();
    // 제목이 변경되었고 비어있지 않으면 저장
    if (selectedPrompt && trimmedTitle !== selectedPrompt.title && trimmedTitle !== '') {
      try {
        await handleUpdatePromptTitle(selectedPrompt.id, trimmedTitle);
        // 상태 업데이트는 AppContext의 updatePromptItem에서 처리됨
      } catch (error) { 
        // 에러 처리 (예: 원래 제목으로 되돌리기)
        setEditableTitle(selectedPrompt.title || '');
      }
    } else {
      // 변경되지 않았거나 빈 제목이면 원래 제목으로 복구
      setEditableTitle(selectedPrompt.title || '');
    }
    setIsEditingTitle(false);
  };

  // 제목 입력 변경 핸들러
  const handleTitleInputChange = (e) => {
    setEditableTitle(e.target.value);
  };

  // 제목 입력 KeyDown 핸들러 (Enter, Escape)
  const handleTitleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleChangeComplete();
    } else if (e.key === 'Escape') {
      setEditableTitle(selectedPrompt.title || ''); // 원래 제목으로 복구
      setIsEditingTitle(false);
    }
  };
  
  // 유사 프롬프트로 전환 핸들러
  const handleSwitchToPrompt = (prompt) => {
    switchToPrompt(prompt);
  };
  
  // 유사한 프롬프트 상세 보기를 위한 오버레이 모달 핸들러
  const handleViewSimilarPrompt = (prompt) => {
    if (openOverlayModal) {
      openOverlayModal(prompt);
    }
  };
  
  // 유사 프롬프트 로드 useEffect 추가
  useEffect(() => {
    const loadSimilar = async () => {
      if (!selectedPrompt?.id) {
        setSimilarPrompts([]); // 선택된 프롬프트 없으면 비우기
        return;
      }
      
      setIsLoadingSimilar(true);
      setSimilarError(null);
      try {
        const data = await getSimilarPrompts(selectedPrompt.id);
        // 자기 자신은 제외하고 최대 10개만 가져오기 (선택사항)
        setSimilarPrompts(data.filter(p => p.id !== selectedPrompt.id).slice(0, 10)); 
      } catch (err) {
        console.error('유사 프롬프트 로드 오류:', err);
        setSimilarError('유사한 프롬프트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingSimilar(false);
      }
    };

    loadSimilar();
  }, [selectedPrompt]); // selectedPrompt가 바뀔 때마다 로드
  
  // 확대 보기 관련 상태 추가
  const [expandViewOpen, setExpandViewOpen] = useState(false);
  const [expandViewContent, setExpandViewContent] = useState('');
  const [expandViewTitle, setExpandViewTitle] = useState('');
  const [expandViewIsOriginal, setExpandViewIsOriginal] = useState(false);
  
  // 프롬프트 확대 보기 열기 함수 수정
  const handleOpenExpandView = (content, title, isOriginal = false) => {
    setExpandViewContent(content);
    setExpandViewTitle(title);
    setExpandViewIsOriginal(isOriginal);
    setExpandViewOpen(true);
  };
  
  // 프롬프트 확대 보기 닫기
  const handleCloseExpandView = () => {
    setExpandViewOpen(false);
  };

  // 메모 자동 저장 로직 (기존 함수)
  const triggerMemoSave = useCallback(async (currentMemo) => {
    if (!selectedPrompt) return;
    setSavingMemo(true);
    try {
      await updatePromptMemo(selectedPrompt.id, currentMemo);
      // AppContext의 prompts 상태 업데이트
      updatePromptItem(selectedPrompt.id, { memo: currentMemo });
      // console.log('메모 자동 저장 완료');
    } catch (error) {
      console.error('메모 저장 실패:', error);
      // 사용자에게 에러 알림 (예: toast 메시지)
    } finally {
      setSavingMemo(false);
    }
  }, [selectedPrompt, updatePromptItem]);

  // 메모 내용 변경 핸들러 (기존 함수, 확장 모달에서도 사용)
  const handleMemoChange = useCallback((value) => {
    setMemo(value);
    if (memoTimerRef.current) {
      clearTimeout(memoTimerRef.current);
    }
    memoTimerRef.current = setTimeout(() => {
      triggerMemoSave(value);
    }, autoSaveDelay);
  }, [triggerMemoSave, autoSaveDelay]);

  // 모달 닫힐 때 타이머 클리어 (기존 useEffect)
  useEffect(() => {
    return () => {
      if (memoTimerRef.current) {
        clearTimeout(memoTimerRef.current);
      }
    };
  }, []);

  // 선택된 프롬프트가 변경되면 메모 로드 (기존 useEffect)
  useEffect(() => {
    if (selectedPrompt) {
      setMemo(selectedPrompt.memo || '');
      // ... (다른 초기화 로직)
    } else {
      setMemo('');
    }
    // 프롬프트 변경 시 이전 자동 저장 타이머 클리어
    if (memoTimerRef.current) {
      clearTimeout(memoTimerRef.current);
    }
  }, [selectedPrompt]);

  if (!selectedPrompt) return null;
  
  // 클립보드 복사
  const handleCopyToClipboard = async () => {
    setCopyStatus('copying');
    try {
      await copyToClipboard(processedContent);
      setCopyStatus('copied');
      
      // 프롬프트 사용 기록
      await handleRecordUsage(selectedPrompt.id);
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('클립보드 복사 오류:', error);
      setCopyStatus('error');
      
      // 3초 후 상태 초기화
      setTimeout(() => {
        setCopyStatus('idle');
      }, 3000);
    }
  };
  
  // 메모 확장 모달 열기 핸들러
  const handleOpenMemoExpand = () => {
    setIsMemoExpanded(true);
  };

  // 메모 확장 모달 닫기 핸들러
  const handleCloseMemoExpand = () => {
    setIsMemoExpanded(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-11/12 max-h-90vh max-w-screen-xl flex flex-col relative"
        style={{ height: '90vh' }}
        data-id="prompt-detail-modal"
      >
        <div className="border-b p-4 flex items-center justify-between">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editableTitle}
              onChange={handleTitleInputChange}
              onBlur={handleTitleChangeComplete} // 포커스 잃으면 저장
              onKeyDown={handleTitleInputKeyDown} // Enter/Escape 처리
              className="text-xl font-semibold border-b-2 border-blue-500 outline-none flex-1 mr-4 py-0.5"
            />
          ) : (
            <h2 
              className="text-xl font-semibold cursor-pointer hover:bg-gray-100 px-1 rounded"
              onClick={handleTitleClick}
              title="클릭하여 제목 수정"
            >
              {selectedPrompt.title}
            </h2>
          )}
          <div className="flex items-center space-x-2">
            {/* 즐겨찾기 버튼 */}
            <button
              onClick={() => handleToggleFavorite(selectedPrompt.id)}
              className="text-gray-400 hover:text-yellow-500"
              title={selectedPrompt.is_favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
            >
              <span className={selectedPrompt.is_favorite ? 'text-yellow-400' : ''}>★</span>
            </button>
            {/* 편집 버튼 */}
            <button
              onClick={() => {
                const latestPromptData = { ...selectedPrompt };
                handleEditPrompt(latestPromptData);
              }}
              className="text-gray-400 hover:text-blue-600"
              title="편집"
            >
              <span>✎</span>
            </button>
            {/* 닫기 버튼 */}
            <button
              onClick={() => handleCloseModal()}
              className="text-gray-400 hover:text-gray-600"
              title="닫기"
            >
              <span>✕</span>
            </button>
          </div>
        </div>

        {/* 뒤로 가기 버튼 (조건부 렌더링) */}
        {previousPrompt && (
          <div className="px-5 py-1 border-b bg-gray-50 flex-shrink-0">
            <button 
              onClick={handleGoBack}
              className="text-xs text-blue-600 hover:underline flex items-center"
            >
              <ChevronLeft size={14} className="mr-0.5" /> 
              {previousPrompt.title} (으)로 돌아가기
            </button>
          </div>
        )}

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* 좌측 넓은 영역 + 우측 사이드바 */}
          {panelsReady && (
            <PanelGroup 
              ref={mainPanelGroupRef}
              direction="horizontal" 
              onLayout={handleMainResize} 
              className="flex-1 min-h-0"
            >
              {/* 좌측 넓은 영역 */}
              <Panel 
                defaultSizePercentage={mainSizes[0]} 
                minSizePercentage={50}
              >
                <div className="h-full flex flex-col">
                  {/* 변수 입력 영역 (있을 경우) */}
                  {selectedPrompt.variables && selectedPrompt.variables.length > 0 && (
                    <div className="flex-shrink-0 border-b">
                      <div className="p-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-800 mb-1">변수 입력</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-2">
                          {selectedPrompt.variables.map((variable, index) => (
                            <div key={`${variable.id || variable.name}-${index}`} className="flex flex-col">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {variable.name}
                              </label>
                              {/* UI 재적용 */} 
                              <div className="flex w-full">
                                <input
                                  type="text"
                                  value={variableValues[variable.name] || ''}
                                  onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                                  placeholder={variable.default_value || `${variable.name} 값 입력`}
                                  className="flex-1 px-2 py-1 text-sm border rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
                                />
                                {/* 저장 버튼 (PromptOverlayModal과 동일하게) */} 
                                <button
                                  type="button"
                                  onClick={() => handleSaveVariableDefaultValue(variable.name)}
                                  className={`px-2 py-1 border border-l-0 rounded-none text-xs 
                                    ${savingStates[variable.name] === 'saved' ? 'bg-green-50 text-green-600' : 
                                      savingStates[variable.name] === 'error' ? 'bg-red-50 text-red-600' : 
                                      savingStates[variable.name] === 'saving' ? 'bg-blue-50 text-blue-400' : 
                                      'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
                                  title="기본값으로 저장"
                                  disabled={savingStates[variable.name] === 'saving'}
                                >
                                  {savingStates[variable.name] === 'saved' ? (
                                    <span>✓</span>
                                  ) : savingStates[variable.name] === 'saving' ? (
                                    <div className="w-3 h-3 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                                  ) : (
                                    <span>💾</span>
                                  )}
                                </button>
                                {/* 텍스트 에디터 버튼 */} 
                                <button
                                  type="button"
                                  onClick={() => openTextEditor(variable)}
                                  className="px-2 py-1 border border-l-0 rounded-r-md bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs"
                                  title="텍스트 에디터 열기"
                                >
                                  <span>📝</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 변수 입력 하단의 내용 영역 (상하 분할: 원본/적용 영역 + 메모) */}
                  <PanelGroup 
                    ref={vPanelGroupRef}
                    direction="vertical" 
                    onLayout={handleVPanelResize} 
                    className="flex-1 min-h-0"
                  >
                    {/* 상단: 원본 | 변수 적용 영역 */}
                    <Panel 
                      defaultSizePercentage={vPanelSizes[0]} 
                      minSizePercentage={50}
                    >
                      <div className="h-full p-3 overflow-y-auto">
                        {/* 원본/변수 적용 내용 영역 - 수평 분할 */}
                        <PanelGroup 
                          ref={hPanelGroupRef}
                          direction="horizontal" 
                          onLayout={handleHPanelResize} 
                          className="h-full"
                        >
                          {/* 원본 프롬프트 */}
                          <Panel 
                            defaultSizePercentage={hPanelSizes[0]} 
                            minSizePercentage={30}
                          >
                            <div className="h-full flex flex-col relative">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-gray-800">원본 프롬프트</h3>
                              </div>
                              <div className="flex-1 bg-gray-50 p-2 rounded-lg border text-base whitespace-pre-wrap overflow-y-auto">
                                {/* 원본 변수 하이라이트 */}
                                <HighlightedContent 
                                  content={selectedPrompt.content}
                                  variableValues={{}} // 빈 객체 전달하여 변수값은 적용하지 않고 원본 텍스트만 유지
                                />
                              </div>
                              <button
                                onClick={() => handleOpenExpandView(
                                  selectedPrompt.content,
                                  '원본 프롬프트',
                                  true
                                )}
                                className="absolute bottom-2 right-2 p-1 bg-white/70 hover:bg-white rounded-md border border-gray-200 shadow-sm text-gray-500 hover:text-blue-500"
                                title="확대 보기"
                              >
                                <Maximize2 size={16} />
                              </button>
                            </div>
                          </Panel>

                          {/* 수직 리사이즈 핸들 */}
                          <PanelResizeHandle className="w-2 mx-2 flex items-center justify-center cursor-col-resize">
                            <div className="w-1 h-10 bg-gray-300 rounded hover:bg-blue-400 transition-colors flex items-center justify-center">
                              <GripVertical size={12} className="text-gray-500 rotate-90" />
                            </div>
                          </PanelResizeHandle>

                          {/* 변수 적용된 프롬프트 */}
                          <Panel 
                            defaultSizePercentage={hPanelSizes[1]} 
                            minSizePercentage={30}
                          >
                            <div className="h-full flex flex-col relative">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-gray-800">변수가 적용된 프롬프트</h3>
                                {/* 복사 버튼 */}
                                <button
                                  onClick={handleCopyToClipboard}
                                  disabled={copyStatus === 'copying'}
                                  className={`px-2 py-0.5 rounded flex items-center text-xs
                                    ${copyStatus === 'copied' ? 'bg-green-50 text-green-600' :
                                      copyStatus === 'error' ? 'bg-red-50 text-red-600' :
                                      'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                    }`}
                                >
                                  <span className="mr-1">📋</span>
                                  {copyStatus === 'copying' ? '복사 중...' :
                                   copyStatus === 'copied' ? '복사됨!' :
                                   copyStatus === 'error' ? '복사 실패' :
                                   '클립보드에 복사'}
                                </button>
                              </div>
                              <div className="flex-1 bg-gray-50 p-2 rounded-lg border overflow-y-auto">
                                <HighlightedContent
                                  content={selectedPrompt.content}
                                  variableValues={variableValues}
                                />
                              </div>
                              <button
                                onClick={() => handleOpenExpandView(
                                  processedContent,
                                  '변수가 적용된 프롬프트'
                                )}
                                className="absolute bottom-2 right-2 p-1 bg-white/70 hover:bg-white rounded-md border border-gray-200 shadow-sm text-gray-500 hover:text-blue-500"
                                title="확대 보기"
                              >
                                <Maximize2 size={16} />
                              </button>
                            </div>
                          </Panel>
                        </PanelGroup>
                      </div>
                    </Panel>

                    {/* 수평 리사이즈 핸들 */}
                    <PanelResizeHandle className="h-2 my-1 flex items-center justify-center cursor-row-resize">
                      <div className="h-1 w-16 bg-gray-300 rounded hover:bg-blue-400 transition-colors flex items-center justify-center">
                        <GripVertical size={12} className="text-gray-500" />
                      </div>
                    </PanelResizeHandle>

                    {/* 하단: 메모 영역 */}
                    <Panel
                      defaultSizePercentage={vPanelSizes[1]}
                      minSizePercentage={10}
                    >
                      <div className="w-full h-full p-3 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-gray-800 flex items-center">
                            <span className="mr-2">📝</span>
                            메모
                          </h3>
                          {savingMemo && (
                            <span className="text-xs text-blue-500">저장 중...</span>
                          )}
                        </div>
                        {/* 메모 textarea 감싸는 div 추가 및 relative 설정 */}
                        <div className="flex-1 relative">
                          <textarea
                            value={memo}
                            onChange={(e) => handleMemoChange(e.target.value)}
                            onBlur={() => { // 포커스 잃었을 때 최종 저장
                              if (memoTimerRef.current) {
                                clearTimeout(memoTimerRef.current);
                                memoTimerRef.current = null;
                              }
                              // selectedPrompt가 유효할 때만 저장 시도
                              if (selectedPrompt) {
                                 triggerMemoSave(memo);
                              }
                            }}
                            className="w-full h-full resize-none border rounded-lg p-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" // 오른쪽 패딩 추가(pr-10)
                            placeholder="메모를 입력하세요..."
                          />
                          {/* 메모 확장 버튼 추가 */}
                          <button
                            onClick={handleOpenMemoExpand}
                            className="absolute bottom-2 right-2 p-1 bg-white/70 hover:bg-white rounded-md border border-gray-200 shadow-sm text-gray-500 hover:text-blue-500"
                            title="메모 확장"
                          >
                            <Maximize2 size={16} />
                          </button>
                        </div>
                      </div>
                    </Panel>
                  </PanelGroup>
                </div>
              </Panel>

              {/* 수직 리사이즈 핸들 (좌우 분할) */}
              <PanelResizeHandle className="w-2 mx-1 flex items-center justify-center cursor-col-resize">
                <div className="w-1 h-20 bg-gray-300 rounded hover:bg-blue-400 transition-colors flex items-center justify-center">
                  <GripVertical size={12} className="text-gray-500 rotate-90" />
                </div>
              </PanelResizeHandle>

              {/* 우측 사이드바 */}
              <Panel 
                defaultSizePercentage={mainSizes[1]} 
                minSizePercentage={15}
              >
                <div className="h-full border-l overflow-hidden">
                  <PromptPanel
                    selectedPromptId={selectedPrompt?.id}
                    onPromptSelect={(prompt) => {
                      openOverlayModal(prompt);
                    }}
                    onClose={() => {}}
                  />
                </div>
              </Panel>
            </PanelGroup>
          )}

          {/* 패널이 준비되지 않았을 때 로딩 표시 */}
          {!panelsReady && (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">로딩 중...</div>
            </div>
          )}

          {/* 하단 유사 프롬프트 섹션 */}
          <div className="flex-shrink-0 border-t p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">유사한 프롬프트</h3>
              {similarPrompts.length > 0 && (
                <span className="text-xs text-gray-500">옆으로 스크롤하여 더 보기</span>
              )}
            </div>
            {isLoadingSimilar ? (
              <div className="text-center text-gray-500 py-3">로딩 중...</div>
            ) : similarError ? (
              <div className="text-center text-red-500 py-3">{similarError}</div>
            ) : similarPrompts.length === 0 ? (
              <div className="text-center text-gray-500 py-3">유사한 프롬프트가 없습니다.</div>
            ) : (
              <div className="flex overflow-x-auto space-x-3 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 snap-x overflow-y-hidden" style={{ scrollbarWidth: 'thin', scrollBehavior: 'smooth' }}>
                {similarPrompts.map(prompt => (
                  <div key={prompt.id} className="flex-shrink-0 w-80 snap-start">
                    <PromptItemCard 
                      prompt={prompt}
                      onClick={(p) => openOverlayModal(p)} 
                      cardType="similar"
                      onSwitchPrompt={handleSwitchToPrompt}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* 메타데이터 영역 - 다시 추가 */}
            <div className="text-xs text-gray-600 mt-3 flex-shrink-0">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {/* 폴더, 생성일, 사용횟수, 마지막 사용, 태그 정보 */}
                <div className="flex items-center">
                  <span className="mr-1">📁</span>
                  <span>폴더: {selectedPrompt.folder || '없음'}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1">🕒</span>
                  <span>생성일: {new Date(selectedPrompt.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1">👤</span>
                  <span>사용 횟수: {selectedPrompt.use_count || 0}회</span>
                </div>
                {selectedPrompt.last_used_at && (
                  <div className="flex items-center">
                    <span className="mr-1">🕒</span>
                    <span>마지막 사용: {selectedPrompt.last_used}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <span className="mr-1">🏷️</span>
                  <span>태그: </span>
                  <div className="flex flex-wrap gap-1 ml-1">
                    {selectedPrompt.tags && selectedPrompt.tags.length > 0 ? (
                      selectedPrompt.tags.map(tag => (
                        <span
                          key={tag.id}
                          className={`px-1.5 py-0.5 rounded-full text-xs ${getTagColorClasses(tag.color)}`}
                        >
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span>없음</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 텍스트 에디터 모달 */}
        {isTextEditorOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100]" onClick={closeTextEditor}>
            <div ref={textEditorRef} className="bg-white rounded-lg shadow-xl w-2/3 max-w-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* 에디터 헤더 */}
              <div className="flex justify-between items-center border-b px-4 py-2">
                <h3 className="font-medium">
                  "{editingVariable?.name}" 변수 편집
                </h3>
                <button
                  onClick={closeTextEditor}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span>✕</span>
                </button>
              </div>
              {/* 에디터 내용 */}
              <div className="p-4">
                <textarea
                  value={textEditorValue}
                  onChange={(e) => setTextEditorValue(e.target.value)}
                  className="w-full h-56 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="내용을 입력하세요..."
                />
              </div>
              <div className="border-t p-3 flex justify-end space-x-2">
                <button
                  onClick={closeTextEditor}
                  className="px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={saveTextEditorValueAsDefault}
                  className="px-3 py-1.5 border rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  기본값으로 저장
                </button>
                <button
                  onClick={saveTextEditorValue}
                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                >
                  적용 (현재만)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 프롬프트 확대 보기 컴포넌트 */}
        <PromptExpandView
          isOpen={expandViewOpen}
          onClose={handleCloseExpandView}
          title={expandViewTitle}
          content={expandViewContent}
          highlightedContent={
            <HighlightedContent
              content={selectedPrompt?.content}
              variableValues={expandViewIsOriginal ? {} : variableValues}
            />
          }
          useHighlightedContent={true}
        />

        {/* MemoExpandModal 추가 */} 
        {isMemoExpanded && (
          <MemoExpandModal
            title="메모 편집"
            memo={memo}
            isOpen={isMemoExpanded}
            onClose={handleCloseMemoExpand}
            onMemoChange={handleMemoChange} // 기존 메모 핸들러 전달
            readOnly={false} // 편집 가능하도록 설정
          />
        )}
      </div>
    </div>
  );
};

export default PromptDetailModal;
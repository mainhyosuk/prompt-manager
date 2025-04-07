/**
 * 클립보드 관련 유틸리티 함수
 */

// 텍스트를 클립보드에 복사
export const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      return false;
    }
  };
  
  // 복사 성공 메시지 표시 (나중에 UI 컴포넌트로 개선 가능)
  export const showCopySuccess = () => {
    alert('클립보드에 복사되었습니다.');
  };
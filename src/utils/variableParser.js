/**
 * 프롬프트 내 변수를 추출하고 관리하는 유틸리티 함수
 */

// 프롬프트 내용에서 변수 추출 (중괄호 {} 안에 있는 내용)
export const extractVariables = (content) => {
    if (!content) return [];
    
    // {변수명} 형태의 패턴을 찾음
    const regex = /{([^}]+)}/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    
    // 중복 제거
    return [...new Set(matches)];
  };
  
  // 변수를 프롬프트에 적용
  export const applyVariables = (content, variableValues) => {
    if (!content) return '';
    if (!variableValues || Object.keys(variableValues).length === 0) return content;
    
    let result = content;
    
    // 각 변수값을 프롬프트에 적용
    Object.entries(variableValues).forEach(([name, value]) => {
      const regex = new RegExp(`{${name}}`, 'g');
      result = result.replace(regex, value || `{${name}}`);
    });
    
    return result;
  };
  
  // 프롬프트 내용을 변수 부분과 일반 텍스트로 분할
  export const splitContentByVariables = (content) => {
    if (!content) return [];
    
    const regex = /{([^}]+)}/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        // 변수 앞의 일반 텍스트 추가
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }
      
      // 변수 추가
      parts.push({
        type: 'variable',
        name: match[1],
        content: match[0]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // 마지막 변수 이후의 텍스트 추가
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }
    
    return parts;
  };
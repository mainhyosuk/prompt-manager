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
  
  // 변수명이 불일치할 때 유사한 변수명 찾기
  const findBestMatchingVariable = (templateVarName, userVarNames) => {
    // 동일한 변수명이 있으면 그것을 사용
    if (userVarNames.includes(templateVarName)) {
      return templateVarName;
    }
    
    // 템플릿 변수명과 사용자 변수명 간의 유사도 검사
    const commonNames = {
      '버전 기록': ['v1.345 버전', 'v1.351 버전', '버전', '버전명'],
      '일자': ['2025-04-07 월', '날짜', '날짜'],
      '개선사항': ['주요 개선사항']
    };
    
    // 공통 매핑 확인
    for (const [userVar, templateVars] of Object.entries(commonNames)) {
      if (templateVars.includes(templateVarName) && userVarNames.includes(userVar)) {
        return userVar;
      }
    }
    
    // 하드코딩된 매핑 (프로젝트 고유 매핑)
    const hardcodedMapping = {
      'v1.345 버전': '버전 기록',
      '2025-04-07 월': '일자',
      '주요 개선사항': '개선사항'
    };
    
    if (hardcodedMapping[templateVarName] && userVarNames.includes(hardcodedMapping[templateVarName])) {
      return hardcodedMapping[templateVarName];
    }
    
    // 매칭되는 것이 없으면 null 반환
    return null;
  };
  
  // 변수를 프롬프트에 적용
  export const applyVariables = (content, variableValues) => {
    if (!content) return '';
    if (!variableValues) return content;
    
    // 원본 프롬프트에서 모든 변수 추출
    const templateVariables = extractVariables(content);
    
    // 사용자가 입력한 변수명 목록
    const userVariableNames = Object.keys(variableValues);
    
    let result = content;
    
    // 원본 프롬프트의 각 변수에 대해
    for (const templateVarName of templateVariables) {
      // 매칭되는 사용자 변수 찾기
      const matchedVarName = findBestMatchingVariable(templateVarName, userVariableNames);
      
      if (matchedVarName) {
        const value = variableValues[matchedVarName];
        
        // 값이 존재하는지 확인
        const hasValue = value && value.trim() !== '';
        
        if (hasValue) {
          // 변수명에 특수문자가 있는 경우를 위해 정규식 이스케이프
          const escapedName = templateVarName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`{${escapedName}}`, 'g');
          
          result = result.replace(regex, value);
        }
      }
    }
    
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
<PromptVariableWrapper>
  {variables?.map((variable, index) => (
    <PromptVariableItem key={index}>
      <PromptVariableName>{variable}:</PromptVariableName>
      <PromptVariableInput
        value={variableValues[variable] || ''}
        onChange={(e) => handleVariableChange(variable, e.target.value)}
        onClick={(e) => {
          console.log('[PromptOverlayModal] 변수 입력 필드 클릭');
          e.stopPropagation();
          if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation();
          }
        }}
      />
    </PromptVariableItem>
  ))}
</PromptVariableWrapper>

{similarPrompts && similarPrompts.length > 0 && (
  <div>
    <SimilarPromptsTitle>유사한 프롬프트</SimilarPromptsTitle>
    <SimilarPromptsList>
      {similarPrompts.map((similarPrompt, index) => (
        <SimilarPromptItem key={index}>
          <SimilarPromptItemContent>
            <div>
              <SimilarPromptName>{similarPrompt.name}</SimilarPromptName>
              <SimilarPromptDescription>
                {similarPrompt.description}
              </SimilarPromptDescription>
            </div>
            <SimilarPromptActions>
              <SimilarPromptExpandButton
                onClick={(e) => {
                  console.log('[PromptOverlayModal] 유사 프롬프트 확장 버튼 클릭');
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.nativeEvent) {
                    e.nativeEvent.stopImmediatePropagation();
                  }
                  setExpandedPrompt(similarPrompt);
                  setIsExpandViewOpen(true);
                }}
              >
                <RiExpandLine />
              </SimilarPromptExpandButton>
            </SimilarPromptActions>
          </SimilarPromptItemContent>
        </SimilarPromptItem>
      ))}
    </SimilarPromptsList>
  </div>
)}

<ModalBackground 
  isOpen={isOpen} 
  onClick={(e) => {
    console.log('[PromptOverlayModal] 모달 배경 클릭');
    if (isExpandViewOpen) {
      console.log('[PromptOverlayModal] 확장 보기가 열려 있어 모달 배경 클릭 무시');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    if (e.target === e.currentTarget) {
      console.log('[PromptOverlayModal] 모달 배경 클릭으로 닫기');
      onClose();
    }
  }}
>
  <ModalContent 
    ref={modalRef} 
    onClick={(e) => {
      console.log('[PromptOverlayModal] 모달 컨텐츠 클릭');
      e.stopPropagation();
    }}
  > 
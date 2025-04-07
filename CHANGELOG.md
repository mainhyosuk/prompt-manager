# Changelog

모든 주요 변경 사항이 이 파일에 기록됩니다.

## [v1.3] - 2025-04-07

### 주요 개선사항

- 4단계: 프롬프트 추가/편집 모달 개선
  - 변수 자동 추출 및 관리 시스템
  - 태그 선택 및 생성 인터페이스
  - 폴더 구조 탐색 및 선택
  - 데이터 유효성 검사
  - 변수 값을 적용한 프롬프트 미리보기
  - 클립보드 복사 및 사용 기록 추적

### 코드 변경 사항

- **React 프론트엔드**:
  - `src/modals/PromptAddEditModal.jsx`: 프롬프트 추가/편집 모달 개선
  - `src/modals/PromptDetailModal.jsx`: 프롬프트 상세 모달 개선
  - `src/components/variables/`: 변수 관리 컴포넌트 추가
    - `VariableList.jsx`: 변수 목록 및 편집 컴포넌트
    - `VariableHighlighter.jsx`: 변수 하이라이팅 컴포넌트
  - `src/components/tags/TagSelector.jsx`: 태그 선택 및 생성 컴포넌트
  - `src/components/folders/FolderSelector.jsx`: 폴더 선택 및 생성 컴포넌트
  - `src/utils/variableParser.js`: 변수 추출 및 적용 유틸리티
  - `src/utils/clipboard.js`: 클립보드 관련 유틸리티

## [v1.2] - 2025-04-07

### 주요 개선사항

- 2단계: 데이터베이스 구현 및 기본 CRUD 기능
  - SQLite 데이터베이스 설정 완료
  - 프롬프트 추가, 조회, 수정, 삭제 기능 구현
  - API 엔드포인트 구성
- 3단계: 메인 대시보드 기능 구현
  - 프롬프트 목록 및 그리드 뷰 구현
  - 폴더 트리 네비게이션 추가
  - 검색 및 필터링 컴포넌트 개발
  - 사이드바 및 헤더 레이아웃 개선

### 코드 변경 사항

- **Python 백엔드**:
  - `python/db/database.py`: SQLite 데이터베이스 스키마 및 연결 기능 구현
  - `python/api/app.py`: Flask API 서버 및 CORS 설정
  - 데이터베이스 CRUD 작업을 위한 엔드포인트 추가

- **React 프론트엔드**:
  - `src/components/prompts/*`: 프롬프트 카드, 목록, 그리드 컴포넌트 개선
  - `src/components/layout/*`: 헤더 및 사이드바 레이아웃 구현
  - `src/components/folders/FolderTree.jsx`: 폴더 트리 네비게이션 기능 추가
  - `src/context/AppContext.jsx`: 애플리케이션 상태 관리 기능 구현
  - `src/pages/Dashboard.jsx`: 메인 대시보드 페이지 개발
  - `src/api/`: API 통신을 위한 유틸리티 함수 추가
  - `src/hooks/`: 커스텀 React 훅 구현
  - `src/utils/`: 유틸리티 헬퍼 함수 추가
  - `src/components/filters/`: 필터링 컴포넌트 구현
  - `src/components/search/`: 검색 기능 구현

## [v1.0] - 2025-04-07

### 주요 기능

- 1단계: 프로젝트 초기 설정 및 기본 구조 구현
  - React + Vite 환경 설정 및 프로젝트 생성
  - Tailwind CSS 설정 및 기본 스타일 적용
  - 폴더 구조 설정 및 핵심 컴포넌트 구현
  - 상태 관리를 위한 Context API 구현
  - 기본 UI 레이아웃 (사이드바, 헤더, 대시보드) 구현
  - 기본 데이터베이스 스키마 설계

### 코드 변경 사항

- **프로젝트 설정**:
  - `package.json`: 프로젝트 의존성 및 스크립트 구성
  - `vite.config.js`: Vite 빌드 도구 설정
  - `tailwind.config.js`: Tailwind CSS 구성
  - `src/styles/index.css`: 기본 스타일 및 컴포넌트 스타일 정의

- **핵심 컴포넌트**:
  - `src/App.jsx`: 메인 앱 컴포넌트 구현
  - `src/main.jsx`: 진입점 설정 및 앱 렌더링
  - `src/context/AppContext.jsx`: 애플리케이션 상태 관리
  - `src/pages/*`: 메인 페이지 컴포넌트
  - `src/components/*`: 레이아웃, 프롬프트, 폴더, 태그 컴포넌트
  - `src/modals/*`: 모달 컴포넌트 (프롬프트 추가/편집, 상세보기)

- **Python 백엔드**:
  - `python/main.py`: 메인 애플리케이션 진입점
  - `python/db/database.py`: 기본 데이터베이스 구조 설정 
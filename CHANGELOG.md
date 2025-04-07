# Changelog

All notable changes to this project will be documented in this file.

## [v1.342] - 2025-04-07

### Added
- 특정 폴더에서 프롬프트 추가 기능 구현
  - 폴더 선택 상태를 저장하여 프롬프트 추가 시 자동 적용
  - handleAddPrompt 함수 개선으로 폴더 ID와 이름 전달 기능 추가

### Changed
- AppContext 상태 관리 개선
  - initialFolderInfo 상태 추가로 프롬프트 생성 시 폴더 정보 유지
  - 컨텍스트 API 확장으로 컴포넌트 간 상태 공유 향상

### Improved
- 사용자 경험 개선
  - 폴더 선택 후 프롬프트 생성 시 불필요한 선택 과정 제거
  - 직관적인 폴더 기반 프롬프트 생성 워크플로우 구현

## [v1.341] - 2025-04-07

### Added
- 커스텀 훅 도입으로 코드 재사용성 향상
  - useContextMenuPosition: 컨텍스트 메뉴 위치 계산 로직 분리
  - useContextMenu: 컨텍스트 메뉴 상태 관리 로직 추출

### Changed
- FolderTree.jsx 코드 리팩토링
  - 디버깅용 로깅 코드 제거
  - 중복 코드 통합 및 이벤트 리스너 코드 간소화
  - 불필요한 주석 정리 및 코드 가독성 개선
  - useCallback 활용으로 성능 최적화
  - 코드 구조 개선 및 관련 기능 그룹화

### Improved
- 코드 길이 약 30% 감소로 유지보수성 향상
- 성능 최적화 및 리소스 사용 효율성 개선

## [v1.34] - 2025-04-07

### Added
- 폴더 컨텍스트 메뉴 개선
  - 사이드바 영역 제한 제거로 메뉴의 자유로운 표시 가능
  - 폴더 요소 위치 기반 메뉴 표시 방식 개선
  - 화면 경계 처리 로직 개선
  - fixed 포지셔닝 적용으로 스크롤 독립성 확보

### Changed
- FolderTree.jsx의 컨텍스트 메뉴 위치 계산 로직 수정
  - 마우스 클릭 위치 대신 폴더 요소 위치 기준으로 변경
  - 화면 경계 처리 로직 단순화
  - 불필요한 사이드바 영역 제한 제거

### Fixed
- 컨텍스트 메뉴가 사이드바 영역을 벗어나지 못하는 문제 해결
- 메뉴가 마우스 클릭 위치와 멀리 표시되는 문제 해결
- 스크롤 시 메뉴 위치가 어긋나는 문제 해결

## [v1.33] - 2025-04-07

### 주요 개선사항

- 사이드바 크기 조절 기능 추가
  - 마우스로 사이드바 너비 조절 가능
  - 설정된 너비 로컬 스토리지에 저장
  - 드래그 시 시각적 피드백 제공
- 테마 설정 기능 추가
  - 라이트/다크 모드 전환 지원
  - 테마 설정 유지 기능

### 코드 변경 사항

- **UI 레이아웃 개선**:
  - `src/components/layout/Sidebar.jsx`: 사이드바 크기 조절 기능 추가
  - `src/pages/Dashboard.jsx`: 사이드바 크기 변경에 맞춰 레이아웃 조정
  
- **테마 관련 기능**:
  - `src/context/AppContext.jsx`: 테마 관련 상태 및 함수 추가
  - `tailwind.config.js`: 다크 모드 설정 추가
  - `src/styles/index.css`: 다크 모드 관련 스타일 추가
  - `src/pages/Settings.jsx`: 테마 전환 UI 구현

## [v1.32] - 2025-04-07

### 주요 개선사항

- 모달 닫기 기능 개선
  - 모달 외부 영역 클릭 시 모달 닫기 기능 추가
  - ESC 키 입력 시 모달 닫기 기능 추가
  - 사용자 경험 개선

### 코드 변경 사항

- **모달 컴포넌트 개선**:
  - `src/modals/PromptDetailModal.jsx`: 외부 클릭 및 ESC 키 감지 기능 추가
  - `src/modals/PromptAddEditModal.jsx`: 외부 클릭 및 ESC 키 감지 기능 추가

## [v1.31] - 2025-04-07

### 주요 개선사항

- CORS 포트 오류 해결
  - Vite 프록시 설정 추가
  - API 호출을 상대 경로로 변경
  - CORS 설정 개선

### 코드 변경 사항

- **Vite 설정**:
  - `vite.config.js`: API 프록시 설정 추가 (/api -> http://localhost:8000)
  
- **Python 백엔드**:
  - `python/api/app.py`: 포트를 5000에서 8000으로, CORS 설정 개선

- **API 호출 방식 변경**:
  - `src/api/config.js`: API_FETCH_OPTIONS 추가
  - `src/api/promptApi.js`: 상대 경로로 API 호출 변경
  - `src/api/folderApi.js`: 상대 경로로 API 호출 변경
  - `src/api/tagApi.js`: 상대 경로로 API 호출 변경
  - `src/api/settingsApi.js`: 상대 경로로 API 호출 변경

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


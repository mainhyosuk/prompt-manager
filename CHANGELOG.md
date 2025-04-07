# Changelog

모든 주요 변경 사항이 이 파일에 기록됩니다.

## [v1.21] - 2025-04-07

### 주요 개선사항

- CORS 정책 오류 해결
  - Flask 백엔드 포트 충돌 문제 해결 (5000번에서 8000번으로 변경)
  - CORS 헤더 설정 개선 및 OPTIONS 메서드 처리 추가

### 코드 변경 사항

- **Python 백엔드**:
  - `python/api/app.py`: Flask 서버 포트 변경 (5000 → 8000) 및 CORS 설정 개선
  - OPTIONS 메서드에 대한 글로벌 라우트 추가

- **React 프론트엔드**:
  - `src/api/config.js`: API 베이스 URL 포트 업데이트 (5000 → 8000)

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

- 프로젝트 초기 설정
- 기본 파일 구조 구현
- React + Vite 환경 설정
- Flask 백엔드 API 기본 구성 
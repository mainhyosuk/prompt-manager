# v1.21: CORS 정책 오류 해결 및 통신 개선

배포일: 2025-04-07 (월)

## 주요 개선사항

- **CORS 정책 오류 해결**
  - Flask 백엔드와 React 프론트엔드 간 통신 문제 해결
  - Flask 애플리케이션의 포트 충돌 문제 해결 (5000번에서 8000번으로 변경)
  - OPTIONS 메서드에 대한 글로벌 라우트 추가
  - CORS 헤더 설정 개선

## 코드 변경 사항

### Python 백엔드
- `python/api/app.py`: 
  - Flask 서버 포트 변경 (5000 → 8000)
  - CORS 설정 간소화 및 모든 오리진 허용
  - OPTIONS 메서드에 대한 글로벌 라우트 추가
  - CORS 헤더 설정 개선

### React 프론트엔드
- `vite.config.js`: 프록시 설정 개선 및 대상 포트 변경
- `src/api/config.js`: API 요청 설정 변경 및 credentials 옵션 수정
- `src/api/*.js`: 모든 API 요청을 상대 경로로 통일하여 프록시 활용
- API 요청 옵션 통일 및 일관성 확보

## 문제 원인 및 해결 방법

1. **포트 충돌**: macOS의 Control Center가 기본 Flask 포트인 5000번을 이미 사용 중이었음
   - 해결: Flask 서버를 8000번 포트로 변경

2. **CORS 설정 문제**: 프론트엔드와 백엔드 간의 CORS 설정이 올바르게 구성되지 않았음
   - 해결: CORS 설정 간소화 및 모든 오리진 허용으로 개발 환경 최적화

3. **API 요청 경로 문제**: 프론트엔드에서 절대 경로로 API 요청을 보내고 있었음
   - 해결: 모든 API 요청을 상대 경로로 변경하여 Vite 프록시 활용

## 설치 방법

1. 프로젝트 클론: `git clone https://github.com/mainhyosuk/prompt-manager.git`
2. 종속성 설치: 
   - 프론트엔드: `npm install`
   - 백엔드: `pip install -r requirements.txt`
3. 실행:
   - 프론트엔드: `npm run dev`
   - 백엔드: `python python/api/app.py`

---

# v1.2: 데이터베이스 구현 및 대시보드 기능 개발

배포일: 2025-04-07 (월)

## 주요 개선사항

- **2단계: 데이터베이스 구현 및 기본 CRUD 기능**
  - SQLite 데이터베이스 설정 완료
  - 프롬프트 추가, 조회, 수정, 삭제 기능 구현
  - API 엔드포인트 구성
- **3단계: 메인 대시보드 기능 구현**
  - 프롬프트 목록 및 그리드 뷰 구현
  - 폴더 트리 네비게이션 추가
  - 검색 및 필터링 컴포넌트 개발
  - 사이드바 및 헤더 레이아웃 개선

## 코드 변경 사항

### Python 백엔드
- `python/db/database.py`: SQLite 데이터베이스 스키마 및 연결 기능 구현
- `python/api/app.py`: Flask API 서버 및 CORS 설정
- 데이터베이스 CRUD 작업을 위한 엔드포인트 추가

### React 프론트엔드
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

## 설치 방법

1. 프로젝트 클론: `git clone https://github.com/mainhyosuk/prompt-manager.git`
2. 종속성 설치: 
   - 프론트엔드: `npm install`
   - 백엔드: `pip install -r requirements.txt`
3. 실행:
   - 프론트엔드: `npm run dev`
   - 백엔드: `python python/api/app.py`

---

# v1.0: 프로젝트 초기 설정 및 기본 구조 구현

배포일: 2025-04-07 (월)

## 주요 기능

- **1단계: 프로젝트 초기 설정 및 기본 구조 구현**
  - React + Vite 환경 설정 및 프로젝트 생성
  - Tailwind CSS 설정 및 기본 스타일 적용
  - 폴더 구조 설정 및 핵심 컴포넌트 구현
  - 상태 관리를 위한 Context API 구현
  - 기본 UI 레이아웃 (사이드바, 헤더, 대시보드) 구현
  - 기본 데이터베이스 스키마 설계

## 코드 변경 사항

### 프로젝트 설정
- `package.json`: 프로젝트 의존성 및 스크립트 구성
- `vite.config.js`: Vite 빌드 도구 설정
- `tailwind.config.js`: Tailwind CSS 구성
- `src/styles/index.css`: 기본 스타일 및 컴포넌트 스타일 정의

### 핵심 컴포넌트
- `src/App.jsx`: 메인 앱 컴포넌트 구현
- `src/main.jsx`: 진입점 설정 및 앱 렌더링
- `src/context/AppContext.jsx`: 애플리케이션 상태 관리
- `src/pages/*`: 메인 페이지 컴포넌트
- `src/components/*`: 레이아웃, 프롬프트, 폴더, 태그 컴포넌트
- `src/modals/*`: 모달 컴포넌트 (프롬프트 추가/편집, 상세보기)

### Python 백엔드
- `python/main.py`: 메인 애플리케이션 진입점
- `python/db/database.py`: 기본 데이터베이스 구조 설정

## 설치 방법

1. 프로젝트 클론: `git clone https://github.com/mainhyosuk/prompt-manager.git`
2. 종속성 설치: 
   - 프론트엔드: `npm install`
3. 실행:
   - 프론트엔드: `npm run dev` 
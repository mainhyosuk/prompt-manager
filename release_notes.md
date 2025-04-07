# v1.32: 모달 닫기 기능 개선

배포일: 2025-04-07 (월)

## 주요 개선사항

- **모달 닫기 기능 개선**
  - 모달 외부 영역 클릭 시 모달 닫기 기능 추가
  - ESC 키 입력 시 모달 닫기 기능 추가
  - 모든 모달 컴포넌트에 일관된 닫기 기능 적용

## 코드 변경 사항

### 모달 컴포넌트 개선
- `src/modals/PromptDetailModal.jsx`: 
  - useRef를 사용하여 모달 요소 참조 설정
  - 외부 클릭 감지 이벤트 리스너 추가
  - ESC 키 입력 감지 이벤트 리스너 추가
  - 모달 관련 이벤트 리스너 정리 로직 추가
  
- `src/modals/PromptAddEditModal.jsx`: 
  - useRef를 사용하여 모달 요소 참조 설정
  - 외부 클릭 감지 이벤트 리스너 추가
  - ESC 키 입력 감지 이벤트 리스너 추가
  - 모달 관련 이벤트 리스너 정리 로직 추가

## 사용자 경험 개선

1. **모달 상호작용 개선**
   - 모달 외부 영역 클릭으로 빠르게 모달 닫기 가능
   - ESC 키를 통한 키보드 접근성 향상
   - 웹 애플리케이션 표준 UI/UX 패턴 준수

2. **불편함 감소**
   - 모달 닫기 버튼을 명시적으로 클릭하지 않아도 빠르게 닫기 가능
   - 연속적인 작업 흐름 개선
   - 다양한 사용자 선호도 반영

## 설치 방법

1. 프로젝트 클론: `git clone https://github.com/mainhyosuk/prompt-manager.git`
2. 종속성 설치: 
   - 프론트엔드: `npm install`
   - 백엔드: `pip install -r requirements.txt`
3. 실행:
   - 프론트엔드: `npm run dev`
   - 백엔드: `python python/api/app.py`

---

# v1.31: CORS 포트 오류 해결

배포일: 2025-04-07 (월)

## 주요 개선사항

- **CORS 포트 오류 해결**
  - Vite 프록시 설정 추가
  - API 호출을 상대 경로로 변경
  - Flask 서버 포트 통일
  - CORS 설정 개선

## 코드 변경 사항

### Vite 설정
- `vite.config.js`: API 프록시 설정 추가
  - `/api` 경로를 `http://localhost:8000`로 프록시
  - CORS와 보안 설정 개선

### Python 백엔드
- `python/api/app.py`: Flask 서버 설정 변경
  - 포트를 5000에서 8000으로 변경
  - CORS 설정 개선하여 인증 허용
  - OPTIONS 요청에 대한 전역 처리 추가
  - 응답 헤더에 CORS 헤더 자동 추가

### API 호출 방식 변경
- `src/api/config.js`: 
  - API_FETCH_OPTIONS 추가 (credentials, mode 등)
  - 공통 헤더 및 타임아웃 설정
- `src/api/promptApi.js`: 상대 경로로 API 호출 변경
- `src/api/folderApi.js`: 상대 경로로 API 호출 변경
- `src/api/tagApi.js`: 상대 경로로 API 호출 변경
- `src/api/settingsApi.js`: 상대 경로로 API 호출 변경

## 사용자 경험 개선

1. **프론트엔드-백엔드 통신 안정화**
   - 브라우저의 CORS 정책으로 인한 API 통신 오류 해결
   - API 요청이 안정적으로 처리되어 사용자 경험 향상

2. **개발 환경 개선**
   - 프록시 설정으로 개발 시 API 호출 간소화
   - 상대 경로 사용으로 환경에 따른 설정 변경 불필요

## 설치 방법

1. 프로젝트 클론: `git clone https://github.com/mainhyosuk/prompt-manager.git`
2. 종속성 설치: 
   - 프론트엔드: `npm install`
   - 백엔드: `pip install -r requirements.txt` (flask-cors 필요)
3. 실행:
   - 프론트엔드: `npm run dev`
   - 백엔드: `python python/api/app.py`

---

# v1.3: 프롬프트 추가/편집 모달 개선

배포일: 2025-04-07 (월)

## 주요 개선사항

- **4단계: 프롬프트 추가/편집 모달 개선**
  - 변수 자동 추출 및 관리 시스템
  - 태그 선택 및 생성 인터페이스
  - 폴더 구조 탐색 및 선택
  - 데이터 유효성 검사
  - 변수 값을 적용한 프롬프트 미리보기
  - 클립보드 복사 및 사용 기록 추적

## 코드 변경 사항

### React 프론트엔드
- `src/modals/PromptAddEditModal.jsx`: 프롬프트 추가/편집 모달 개선
  - 폼 유효성 검사 기능 추가
  - 변수 자동 추출 로직 구현
  - 태그 및 폴더 선택 통합
- `src/modals/PromptDetailModal.jsx`: 프롬프트 상세 모달 개선
  - 변수 값 입력 기능 추가
  - 변수 적용된 프롬프트 미리보기
  - 클립보드 복사 기능 개선
  - 사용 기록 추적 연동
- `src/components/variables/`: 변수 관리 컴포넌트 추가
  - `VariableList.jsx`: 변수 목록 및 편집 기능
  - `VariableHighlighter.jsx`: 변수 하이라이팅 시각화
- `src/components/tags/TagSelector.jsx`: 태그 선택 및 생성 인터페이스
  - 기존 태그 선택 기능
  - 새 태그 생성 및 색상 선택
  - 선택된 태그 시각화
- `src/components/folders/FolderSelector.jsx`: 폴더 선택 및 생성 인터페이스
  - 계층적 폴더 구조 시각화
  - 새 폴더 생성 및 부모 폴더 지정
  - 드롭다운 네비게이션 구현
- `src/utils/variableParser.js`: 변수 추출 및 적용 유틸리티
  - 텍스트에서 변수 추출 기능
  - 변수 값을 텍스트에 적용하는 기능
  - 텍스트를 변수와 일반 텍스트로 분할하는 기능
- `src/utils/clipboard.js`: 클립보드 관련 유틸리티
  - 텍스트 복사 기능 구현
  - 복사 성공/실패 처리

## 사용자 경험 개선

1. **변수 관리 간소화**
   - 프롬프트 내용에서 변수를 자동으로 추출
   - 변수별 기본값 지정 가능
   - 시각적으로 구분된 변수 하이라이팅

2. **데이터 관리 개선**
   - 태그와 폴더를 사용한 조직화
   - 한 화면 내에서 태그 및 폴더 생성 가능
   - 계층적 구조로 프롬프트 정리

3. **프롬프트 활용성 향상**
   - 변수 값을 입력하여 실시간 미리보기
   - 완성된 프롬프트를 클립보드에 복사
   - 사용 이력 자동 기록

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
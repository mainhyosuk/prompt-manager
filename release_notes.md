## [v1.341] - 2025-04-07

### 주요 개선사항

- FolderTree.jsx 코드 리팩토링:
    - 커스텀 훅 도입으로 코드 재사용성 및 가독성 향상
    - 중복 코드 제거 및 로직 단순화
    - 성능 최적화 및 메모리 사용 효율성 개선
    - 유지보수성 향상을 위한 코드 구조 개선

### 코드 변경 사항

- src/components/folders/FolderTree.jsx:
    - useContextMenuPosition 훅 추가: 컨텍스트 메뉴 위치 계산 로직 분리
    - useContextMenu 훅 추가: 컨텍스트 메뉴 상태 관리 통합
    - 디버깅용 로깅 코드 제거로 프로덕션 코드 최적화
    - 이벤트 리스너 등록/제거 코드 간소화
    - useCallback 활용으로 불필요한 함수 재생성 방지
    - 관련 기능 그룹화로 코드 가독성 개선
    - 코드 길이 약 30% 감소

### 기술적 개선

- 컴포넌트 성능 최적화:
    - 불필요한 리렌더링 감소
    - 메모리 사용량 개선
    - 가독성 및 유지보수성 향상
- 코드 간결화로 로딩 시간 개선
- 개발자 경험 향상 및 버그 발생 가능성 감소

## [v1.34] - 2025-04-07

### 주요 개선사항

- 사이드바의 폴더 컨텍스트 메뉴 개선:
    - 사이드바 영역 제한 해제로 메뉴의 자유로운 표시 가능
    - 폴더 요소 위치 기반의 직관적인 메뉴 표시
    - 화면 경계 처리 로직 개선으로 가시성 향상
    - 스크롤 독립성 확보로 사용성 개선

### 코드 변경 사항

- src/components/folders/FolderTree.jsx:
    - 컨텍스트 메뉴 위치 계산 로직 전면 개선
    - 사이드바 영역 제한 관련 코드 제거
    - 폴더 요소 위치 기반 메뉴 표시 방식 구현
    - 화면 경계 처리 로직 단순화
    - fixed 포지셔닝 적용으로 스크롤 독립성 확보
    - 불필요한 위치 조정 코드 정리

### 버그 수정

- 컨텍스트 메뉴 관련 여러 UI 버그 수정:
    - 사이드바 영역 제한으로 인한 메뉴 표시 제한 문제 해결
    - 마우스 클릭 위치와 메뉴 표시 위치 불일치 문제 해결
    - 스크롤 시 메뉴 위치가 어긋나는 문제 해결

# v1.33: 사이드바 크기 조절 및 테마 설정

배포일: 2025-04-07 (월)

## 주요 개선사항

- **사이드바 크기 조절 기능 추가**
  - 마우스로 사이드바 너비를 자유롭게 조절 가능
  - 사용자가 설정한 너비 로컬 스토리지에 저장하여 지속 유지
  - 드래그 상태에 따른 시각적 피드백 제공

- **테마 설정 기능 추가**
  - 라이트/다크 모드 전환 지원
  - 테마 설정 유지 기능
  - 설정 페이지에서 테마 변경 UI 제공

## 코드 변경 사항

### UI 레이아웃 개선
- `src/components/layout/Sidebar.jsx`: 
  - 사이드바 크기 조절 기능 구현
  - 마우스 드래그로 너비 조절 가능한 핸들 추가
  - 최소/최대 너비 제한 설정
  - 로컬 스토리지를 통한 사용자 설정 저장

- `src/pages/Dashboard.jsx`: 
  - 사이드바 크기 변경에 따른 레이아웃 대응
  - overflow 처리 개선
  - 텍스트 잘림 방지를 위한 스타일 조정

### 테마 관련 기능
- `src/context/AppContext.jsx`: 
  - 테마 상태 및 함수 추가
  - 테마 변경 함수 구현
  - 로컬 스토리지에 테마 설정 저장 기능

- `tailwind.config.js`: 
  - 다크 모드 설정 추가 (`darkMode: 'class'`)

- `src/styles/index.css`: 
  - 다크 모드 관련 스타일 추가
  - 테마 전환 시 스타일 변경 로직 구현

- `src/pages/Settings.jsx`: 
  - 테마 전환 UI 구현
  - 현재 테마 표시 및 변경 인터페이스 제공

## 사용자 경험 개선

1. **맞춤형 레이아웃**
   - 사용자가 자신의 화면 크기에 맞게 사이드바 크기 조절 가능
   - 넓은 화면에서는 폴더 구조를 더 자세히 볼 수 있고, 좁은 화면에서는 콘텐츠 영역을 넓게 사용 가능
   - 웹앱의 UI를 사용자 취향에 맞게 커스터마이징 가능

2. **사용자 선호에 맞는 테마**
   - 라이트/다크 모드를 통한 시각적 편안함 제공
   - 다양한 환경 및 시간대에 따른 사용성 개선
   - 시스템 설정과 독립적인 테마 설정 가능

3. **지속성 있는 사용자 경험**
   - 브라우저를 닫았다 열어도 사용자 설정 유지
   - 일관된 UI 경험 제공
   - 사용자 설정 데이터 영속성 확보

## 설치 방법

1. 프로젝트 클론: `git clone https://github.com/mainhyosuk/prompt-manager.git`
2. 종속성 설치: 
   - 프론트엔드: `npm install`
   - 백엔드: `pip install -r requirements.txt`
3. 실행:
   - 프론트엔드: `npm run dev`
   - 백엔드: `python python/api/app.py`

---

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


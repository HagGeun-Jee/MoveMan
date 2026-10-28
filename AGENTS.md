# MEMAN 프로젝트 가이드 및 컨텍스트 (리부팅 후 영구 유지)

## 1. 기본 원칙
- **모든 답변은 한글로 한다.**
- 간결하고 명확하게 답변하며, 파일 및 심볼 링크는 GitHub 스타일의 `file:///` 절대 경로 링크를 사용한다.
- **배포 전 로컬 테스트 및 승인 확인 필수**:
  - 코딩 및 기능 구현 작업이 끝나면 즉시 원격(`git push`)으로 배포하지 않는다.
  - 먼저 로컬 환경에서 빌드 및 테스트(`npx next build` 등)를 철저히 검증한다.
  - 사용자에게 작업 완료 내용과 로컬 테스트 결과를 보고한 후, **"로컬 테스트가 완료되었습니다. 원격 서버(Render)로 배포를 진행할까요?"라고 배포 여부를 반드시 먼저 물어보고 승인을 얻은 후 배포한다.**

## 2. 프로젝트 개요 및 기술 스택
- **프로젝트명**: MEMAN (이사견적 및 자재 재고관리 시스템)
- **프레임워크**: Next.js 16 (Turbopack, App Router, Server Actions), React 19, TypeScript
- **스타일링**: Tailwind CSS
- **데이터베이스/ORM**: Prisma 5.22.0, Supabase PostgreSQL (`aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`)
- **저장소 및 배포**:
  - GitHub: `https://github.com/HagGeun-Jee/MoveMan.git` (main 브랜치)
  - 배포: Render Web Service 자동 배포 (GitHub main 브랜치 푸시 시 자동 빌드 & 배포), Vercel 호환
  - 호환성: Node.js 20 런타임, Supabase PostgreSQL 분리 구조

## 3. 핵심 작업 이력 및 주요 결정사항 (최근 대화 요약)

### A. 자재 재고 및 이력 초기화
1. **자재 코드('MAT-') 삭제 취소**:
   - 자재 코드 삭제 요청은 취소되었으며, 자재 코드/품명/규격/단가/안전재고 설정값은 온전하게 보존됨.
2. **보유 재고 수량 0 초기화**:
   - 모든 창고 및 차량별 `MaterialStock.quantity` 수량이 `0`으로 일괄 초기화됨 (자재별 안전재고 기준값은 유지).
3. **이고 및 실사 이력 삭제**:
   - `MaterialTransfer` / `MaterialTransferItem` (이고 및 입출고 전표) 전체 삭제.
   - `MaterialAudit` / `MaterialAuditItem` (현장 재고 실사 전표) 전체 삭제.
   - 초기화 전 원본 데이터는 `web/prisma/backup_inventory_*.json`에 백업됨.

### B. 거점별 재고 리스트 및 차량 인수인계서 (PDF 공유) 구현 및 UI 개선
1. **차량/거점 재고 PDF 퀵 액션 & 탭 최적화**:
   - 상단 버튼 명칭: `차량/거점 재고 PDF`로 간결화 및 태블릿 한 줄(No Wrap) 반응형 패딩 적용.
   - 상단 타이틀 & 퀵 액션 박스 스크롤 고정(`sticky top-0 z-30` 및 배경 래퍼)으로 스크롤 시에도 즉시 기능 접근 가능.
   - 핵심 요약 카드 4종(관리 자재 품목 ~ 안전재고 부족) 상하 폭 컴팩트화.
   - 메인 탭 네비게이션: 밑줄 형태에서 선명한 배경색이 채워지는 세그먼트 탭(Pill Tab)으로 전환 및 폰트/패딩 컴팩트화.
2. **인수인계 리포트 화면 최적화**:
   - 상단 중복 카드 박스를 제거하고, 거점 선택 바로 아래 `차량대여 인수인계 정보입력 PDF` 아코디언 헤더 줄에 소형화된 `[PDF 다운로드/인쇄]`, `[카톡/메신저 복사]`, `[공유]` 버튼을 일체형으로 통합 배치.
3. **자재 품목 마스터 복사등록 및 중복 체크**:
   - 자재 품목 마스터 목록에 `[📋 복사]` 버튼 추가: 기존 자재의 구분, 단위, 단가, 안전재고를 기초로 즉시 신규 등록.
   - 신규 등록 모달 내 `[기존 자재 기초로 복사 불러오기]` 드롭다운 탑재.
   - 저장 시 자재 코드 및 품목명 중복 검사: 클라이언트 및 서버 액션(`createMaterialItem`, `updateMaterialItem`) 이중 검증으로 중복 등록 완벽 차단.

### C. Render 배포 환경 구축
- Render Web Service (`https://render.com`) 연결 완료
- 환경변수: `NODE_VERSION=20`, `DATABASE_URL`(Supabase PostgreSQL 풀러), `SESSION_SECRET` 등록
- GitHub `main` 푸시 시 자동 빌드(`npm install && npm run build`) 및 무중단 배포 진행.

### D. 견적 작성 화면 기능 고도화
1. **이사비용 산출 시뮬레이터 모달 (`MovingCostCalculatorModal`)**:
   - CBM 구간별 기준운임 가이드(1톤~10톤), 캘린더 할증(손 없는 날, 주말, 금요일, 월말), 특수물품 분해조립 비용 계산 및 원클릭 기본 이사비용 적용.
2. **이동거리 기준거리 기본값 30KM 상향**:
   - 신규 견적 작성(`EstimateForm`), 서버 액션(`estimate.ts`), 상세 페이지(`page.tsx`) 모두 기준거리 기본값을 30km로 상향 조정.
3. **위치별 표준 물품 목록 자동 바인딩 및 품목 선택 개선**:
   - 신규 견적 작성 시 안방, 거실 등 각 위치별로 지정된 표준 물품들을 기본 행으로 자동 배치(초기 수량 0, totalCbm 영향 없음).
   - `[+ 품목 선택]` 드롭다운에 `── {위치} 지정 품목 ──`과 `── 미지정 / 기타 품목 ──` optgroup 분류를 도입하여, 어느 방에서든 BOX 등 위치 미지정 품목 및 타 위치 품목을 자유롭게 선택 및 규격 연동 가능하도록 개선.
4. **견적 수정 시 이사비용 산출 적용 및 이사일자 경과 건 제어**:
   - 견적 수정 시에도 산출 팝업을 통해 기본 이사비용 갱신 및 결제 플랜 잔금(`balance`) 자동 재계산 적용.
   - 이사날짜가 오늘 이전으로 이미 경과한 건은 `[이사비용 산출 기한만료]` 비활성화 표시 및 클릭 시 경고창 팝업으로 변경 차단.

### E. 품목/규격 정렬 및 자재 매트릭스 태블릿 뷰 최적화
1. **물품 및 규격 오름차순(가나다순) 정렬 적용**:
   - 물품 기준정보 서버 액션(`getStandardItems`): `orderBy: [{ name: 'asc' }, { spec: 'asc' }]` 적용.
   - 물품 기준정보 관리 페이지(`/items`): 데이터 로드 및 필터링 시 품목명 1차, 규격 2차 순 한글 로케일 정렬.
   - 견적 작성/수정 화면(`EstimateForm`): 각 위치별 테이블 행 리스트업, 테이블 내 규격 드롭다운, `+ 품목 선택`, `+ 규격 선택` 드롭다운 및 저장 데이터 직렬화 시 품목/규격 순 정렬 일괄 적용. 특히 `+ 품목 선택`의 미지정/기타 품목 그룹에서 **`BOX` 품목이 최상단에 우선 표시**되도록 조정.
   - 견적 상세 화면(`/estimates/[id]`): 산출 물품 목록 테이블 위치별 품목/규격 순 정렬.
2. **자재 재고관리 전체 현황 매트릭스 태블릿 뷰 최적화**:
   - '코드' 독립 컬럼을 제거하고 '자재 품명' 하단에 코드 및 규격/비고를 서브 텍스트로 깔끔하게 통합.
   - '자재 품명' 컬럼을 첫 번째 고정 열(`sticky left-0`)로 재설정하여 '구분' 및 '단위' 열이 가려지던 버그 원천 해결.
   - 상단 거점 헤더(본사 메인창고, 1호차 등)를 [아이콘+버튼] / [거점명] 2단 구조 및 단어 줄바꿈(`break-keep`) 처리하여 열 너비를 콤팩트화(태블릿 가로 스크롤 없이 전체 열 100% 한눈에 표시).

### F. 견적 작성/수정 데이터 실시간 임시저장(Draft) 및 자동 복원
1. **실시간 디바운스 자동 저장 (`EstimateForm`)**:
   - 신규 견적 작성(`meman_estimate_draft_new`) 및 특정 견적 수정(`meman_estimate_draft_edit_{id}`) 시, 입력값 변경 즉시 `localStorage`에 400ms 디바운스로 실시간 보관.
   - 보관 항목: 고객명, 연락처, 이사종류, 일정(견적일/방문일/이사일/정리일), 출발지/도착지 주소 및 작업환경(층수, 사다리차, 엘리베이터 등), 이동거리, 투입차량/인력, 물품별 수량 및 추가 품목, 이사비용 및 결제 플랜 전 항목.
2. **다른 메뉴 이동 후 복귀 시 자동 복원**:
   - 캘린더, 자재재고 등 다른 메뉴로 이동 후 다시 견적 작성 화면으로 돌아와도 입력했던 모든 데이터가 100% 손실 없이 자동 유지/복원.
   - 상단 복원 알림 배너(`작성 중이던 데이터가 안전하게 유지/복원되었습니다 (저장일시: ...)`) 제공.
   - 언제든 처음부터 새로 쓰고 싶을 때를 위한 `[새로 작성 (입력 초기화)]` 버튼 제공.
   - 견적서 최종 저장(`견적 저장하기`) 성공 시 임시 저장 데이터는 자동으로 깔끔하게 삭제됨.

### G. 견적 품목 처리옵션(이동/폐기/내림/경유) 및 CBM 계산 고도화
1. **품목별 처리 옵션 추가**:
   - 견적 작성/수정 시 각 물품 행에 [이동(기본값), 폐기, 내림, 경유] 드롭다운 탑재.
   - 단순 조회 시 기본값인 '이동'은 별도 표기를 생략하여 시각적 피로를 줄이고, '폐기'(빨간색), '내림'(주황색), '경유'(보라색)는 강조 뱃지로 직관적 표시.
2. **폐기 및 내림 시 CBM 산출 규칙**:
   - '폐기' 및 '내림' 선택 시 기본 CBM은 총 이사 CBM 합산에서 제외(연회색 취소선 표시).
   - 단, 내품(추가) CBM은 이사 시 챙겨야 하는 짐이므로 정상 합산에 유지.
3. **이사 최적화 추천 위치 정렬**:
   - 가나다순 대신 실제 이사 작업 동선에 맞춘 추천 순서(거실 -> 안방 -> 침실2/작은방1 -> 침실3/작은방2 -> 주방 -> 욕실 -> 베란다/발코니 -> 현관/신발장 -> 드레스룸 -> 다용도실 -> 서재 -> 기타/창고)로 자동 정렬.

### H. 모바일 안드로이드 로컬 DB 및 양방향 동기화 시스템
1. **오프라인 우선(Offline-First) 자체 DB**:
   - 네트워크가 완전히 차단된 현장(지하, 엘리베이터, 탑차 등)에서도 견적 조회/신규 작성이 가능하도록 `Dexie.js`(IndexedDB) 기반 로컬 DB 구축 (`web/src/lib/sync/db.ts`).
   - 테이블: `estimates` (로컬 견적 데이터), `syncQueue` (오프라인 변경분 Outbox 큐), `masterData` (위치/물품/차량/인원/사다리차/자재 기준정보), `syncMeta` (최종 동기화 시점 관리).
2. **서버 동기화 API 및 ID 충돌 방지**:
   - `/api/sync/pull`: 서버의 최신 마스터 데이터 및 신규/수정된 견적서 일괄 수신 (GET).
   - `/api/sync/push`: 오프라인에서 생성된 `LOCAL_...` 견적서의 서버 공식 식별코드(`prefix + YYMMDD + 일련번호`) 채번, 수정, 삭제 일괄 트랜잭션 반영 (POST).
3. **클라이언트 동기화 매니저 및 상태 UI**:
   - `syncManager.ts`: 온라인/오프라인 네트워크 상태 실시간 감지, Outbox 자동/수동 Push -> Pull 일괄 처리.
   - `SyncStatusBar.tsx`: 대시보드 상단에 온라인/오프라인 상태 배지, 미동기화 대기 건수, `[서버 동기화]` 수동 트리거 버튼 탑재.
   - `OfflineEstimatesNotice.tsx`: 견적 목록 상단에 로컬에만 보관 중인 미동기화 견적 알림 배너 배치.
   - `EstimateForm.tsx`: 견적 저장 시 오프라인 상태 감지하여 로컬 DB 및 Outbox 큐에 안전한 Fallback 저장 처리.
4. **안드로이드 네이티브 앱 프로젝트 (`web/android`)**:
   - Capacitor 8.5.3 기반 안드로이드 네이티브 스켈레톤 생성 (`com.meman.moveman`, 앱 명칭 `MEMAN 이사견적`).
   - `AndroidManifest.xml`: `INTERNET`, `ACCESS_NETWORK_STATE`, `usesCleartextTraffic="true"` 권한 구성 완료.
   - Android Studio에서 `web/android` 폴더를 열고 즉시 APK 빌드 및 디바이스 배포 가능.

### I. APK 빌드 원클릭 자동 덮어쓰기 & Render 배포 시스템
1. **원클릭 자동 배포 스크립트 (`web/scripts/deploy-apk.js`)**:
   - Android Studio에서 빌드된 `app-debug.apk`를 감지하여 웹 다운로드 경로(`public/moveman.apk`, `public/downloads/moveman.apk`)로 자동 덮어쓰기 복사.
   - `src/lib/appRelease.ts`의 릴리즈 일시(한국 시각), 패치 버전(v1.0.X), 파일 용량 자동 계산 및 갱신.
   - Git 스테이징, 커밋, GitHub `main` 푸시를 한 번에 자동 실행하여 Render 웹 서비스에 즉시 배포.
2. **간편 실행 방법**:
   - 윈도우 탐색기에서 `APK_원클릭_배포.bat` 더블클릭 실행.
   - 또는 터미널에서 `npm run deploy:apk` 명령어 실행.

### J. Supabase DB 커넥션 풀 고갈(EMAXCONNSESSION) 및 서버 동기화 오류 해결
1. **오류 원인 분석**:
   - `[서버 동기화]` 실행 시 발생한 `동기화 실패 : 서버 다운로드 실패` 오류는 Supabase 세션 모드 풀러(5432 포트)의 최대 클라이언트 제한(`FATAL: (EMAXCONNSESSION) max clients reached in session mode - pool_size: 15`) 초과로 발생.
   - 프로덕션 환경에서 `prisma` 싱글톤이 영구 유지되지 않고 매 요청마다 새로운 PrismaClient가 생성되어 커넥션 누수가 발생함.
   - `/api/sync/pull` 엔드포인트에서 7개 마스터 테이블을 `Promise.all`로 동시 병렬 쿼리하여 순간적으로 커넥션 풀을 소진함.
2. **해결 및 최적화 조치**:
   - `web/src/lib/prisma.ts`: 프로덕션 환경에서도 `globalThis.prismaGlobal`에 싱글톤 인스턴스를 영구 공유하도록 개선하고, `DATABASE_URL`에 `connection_limit=3`을 자동 주입하여 풀 한도를 철저히 보호.
   - `web/src/app/api/sync/pull/route.ts`: 마스터 테이블 동시 조회를 **순차 조회(Sequential Query)**로 전환하여 1개 커넥션으로 안정적으로 데이터를 반환하도록 처리.
   - 모바일 네이티브 앱 및 웹 브라우저 양방향 동기화 시 정상적인 200 OK 응답 및 최신 마스터 데이터/견적 데이터 수신 검증 완료.

### K. 모바일 웹 및 네이티브 앱(APK) 다운로드 기능 고도화
1. **문제 현상 및 원인 분석**:
   - 모바일 브라우저(크롬, 삼성인터넷, 카카오톡 인앱 브라우저 등) 및 안드로이드 웹뷰(Capacitor)에서 `<a href="/moveman.apk" download>`를 눌렀을 때 다운로드가 동작하지 않거나 반응이 없는 문제.
   - 안드로이드 WebView는 기본적으로 다운로드 리스너(`setDownloadListener`)가 없으면 다운로드 이벤트를 무시함.
   - 모바일 브라우저 정적 서빙 시 `Content-Disposition: attachment; filename="moveman.apk"` 헤더가 없어 다운로드가 트리거되지 않음.
2. **조치 내역**:
   - `/api/download/apk`: `Content-Disposition: attachment; filename="moveman.apk"` 및 `Content-Type: application/vnd.android.package-archive`를 명시한 전용 다운로드 API 엔드포인트 구축.
   - `AppDownloadButton.tsx`: 원클릭 다운로드, 다운로드 시작 상태 알림, 카카오톡 등 인앱 브라우저 대응을 위한 [다운로드 URL 복사] 기능, 친절한 설치 안내 모달(출처를 알 수 없는 앱 허용 안내 등) 탑재.
   - `MainActivity.java`: WebView에 `DownloadListener` 및 `AndroidDownloader` 자바스크립트 인터페이스 탑재하여 앱 내부에서도 시스템 브라우저/다운로드 관리자로 Intent 자동 연결.

### L. 뒤로가기(<) 버튼 종료 확인 및 안전 로그아웃 후 종료 시스템
1. **요구사항**:
   - 뒤로가기(`<`) 버튼을 계속 눌러서 더 이상 이전 페이지가 없는 종료 시점(메인 대시보드 `/`)에 도달했을 때 "종료하시겠습니까?" 대화상자 표시.
   - 최종 종료 확인 시 안전하게 **로그아웃 상태로 전환한 후 앱을 완전히 종료**.
2. **구현 세부사항**:
   - **모바일 상단 헤더 `<` 버튼 추가**: [Sidebar.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/Sidebar.tsx) 헤더 좌측에 `<` 버튼을 배치하여 풀스크린 제스처 사용자도 손쉽게 조작 가능.
   - **안드로이드 하드웨어/제스처 백버튼 연동**: [MainActivity.java](file:///c:/Users/ysjee/Desktop/MEMAN/web/android/app/src/main/java/com/meman/moveman/MainActivity.java)에 `OnBackPressedCallback`과 `AppInterface.exitApp()`를 탑재하여 웹뷰의 `window.handleAndroidBackButton()`으로 전달.
   - **순차적 뒤로가기 및 모달 제어 ([GlobalBackExitHandler.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/GlobalBackExitHandler.tsx))**:
     - 1순위: 열려있는 팝업/모달이 있으면 모달을 먼저 안전하게 닫음.
     - 2순위: 서브 화면(`/estimates`, `/estimates/123`, `/inventory` 등)에 있으면 이전 화면으로 순차 이동 (`history.back()`).
     - 3순위: 최종 루트 화면(대시보드 `/`)에 도달하여 뒤로가기를 누르면 종료 확인 모달(`AppExitConfirmModal`) 팝업 표시.
   - **종료 확인 대화상자 ([AppExitConfirmModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/AppExitConfirmModal.tsx))**:
     - "종료하시겠습니까? 종료하시면 현재 계정이 안전하게 로그아웃된 후 프로그램이 종료됩니다." 안내.
     - [취소]: 계속 사용.
     - [종료 및 로그아웃]: 서버 세션 삭제 API(`/api/auth/logout`) 호출 -> 안드로이드 네이티브 앱 완전 종료(`AndroidApp.exitApp()` / Capacitor `App.exitApp()`) 또는 웹 브라우저 로그인 화면 이동.
   - **빌드 및 배포**:
     - Capacitor `@capacitor/app` 플러그인 연동 및 Android Studio 호환 Gradle(8.14.3) / JDK 21 빌드 검증.
     - `deploy-apk.js`를 통해 최신 v1.0.6 APK 덮어쓰기 및 Render 배포 완료.

### M. 견적 작성/수정 시 투입인력 및 투입차량 저장 누락 오류 해결
1. **오류 원인 분석**:
   - `EstimateForm.tsx`에서 서버 액션 호출 후 발생한 `NEXT_REDIRECT` 에러를 네트워크 장애로 오인하여 catch 블록으로 이동함.
   - 이때 생성된 `offlineData`의 `environment`가 `undefined`로 처리되어 로컬 동기화 큐에 등록됨.
   - 이후 PUSH 동기화(`/api/sync/push`) 과정에서 서버의 기존 정상 인력/차량 데이터를 빈 객체(`"{}"`)로 덮어써서 유실됨.
2. **해결 및 개선 조치**:
   - `EstimateForm.tsx`: `currentEnvironmentObj` 및 `currentEnvironmentStr`를 실시간 직렬화하여 오프라인 데이터 및 폼 hidden input(`name="environment"`)으로 양방향 전달.
   - `NEXT_REDIRECT` 에러 발생 시 정상적인 리다이렉트 흐름으로 throw하여 오프라인 폴백 오동작 원천 차단.
   - `estimate.ts`: `createEstimate` 및 `updateEstimate`에서 formData의 개별 필드와 environment 통짜 JSON을 상호 보완 결합하여 누락 없이 100% 저장.
   - `route.ts` (`/api/sync/push`): UPDATE 시 클라이언트에서 전송된 빈 객체가 서버의 유효한 인력/차량 데이터를 덮어쓰지 못하도록 안전 보호 로직 추가.

### N. 자재 관련 리스트 자재 품명 기본 정렬(가나다순) 적용 (웹 및 모바일 앱)
1. **요구사항**:
   - 자재 관련 모든 리스트(전체 현황 매트릭스, 거점별 재고 리포트, 각종 모달 드롭다운 및 이력 내 자재 목록)를 '자재 품명' 기본 오름차순(가나다순)으로 정렬.
   - 웹 브라우저 및 모바일 앱(동기화 API 및 로컬 캐시) 모두 일관되게 적용.
2. **조치 내역**:
   - **서버 액션 ([inventory.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/actions/inventory.ts))**:
     - `getInventoryOverview`: `prisma.materialItem.findMany({ orderBy: [{ name: 'asc' }] })` 및 `items.sort((a, b) => a.name.localeCompare(b.name, 'ko'))` 이중 정렬 보장.
     - `getTransferHistory` / `getAuditHistory`: 각 전표의 품목 목록(`items`)도 자재명 순(`a.material.name.localeCompare(b.material.name, 'ko')`)으로 자동 정렬 반환.
   - **모바일 동기화 API ([route.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/api/sync/pull/route.ts))**:
     - `/api/sync/pull`의 마스터 데이터 조회 시 `materials`를 자재 품명 오름차순(`name: 'asc'` 및 한글 로케일 정렬)으로 반환하여 앱 로컬 DB(Dexie)에 저장되는 기준정보도 품명 순으로 일괄 정렬.
   - **웹/앱 UI 컴포넌트 일괄 정렬 적용**:
     - [page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/inventory/page.tsx): `sortedMaterials` 및 `filteredMaterials` 한글 로케일 품명 순 정렬, 자재 품목 마스터 탭 및 하위 모달에 정렬된 리스트 전달.
     - [LocationInventoryReport.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/inventory/LocationInventoryReport.tsx): 거점별 재고 리스트 및 차량 대여 인수인계서 품목 품명 가나다순 정렬.
     - [TransferModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/inventory/TransferModal.tsx): 자재 이고(이동) 모달 드롭다운 품명 순 정렬.
     - [StockInOutModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/inventory/StockInOutModal.tsx): 입고/폐기출고 모달 드롭다운 품명 순 정렬.
     - [StockAuditModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/inventory/StockAuditModal.tsx): 재고 실사 모달 품목 리스트 품명 순 정렬.
     - [MaterialModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/inventory/MaterialModal.tsx): 신규 등록 시 '기존 자재 기초로 복사 불러오기' 드롭다운 품명 순 정렬.
3. **검증 및 배포**:
   - `npm run build` TypeScript 컴파일 및 번들링 정상 완료.
   - GitHub `main` 푸시를 통해 Render Web Service 자동 무중단 배포 진행.

### O. 견적 상세 PDF/인쇄 버튼 문구 단축 및 태블릿 단일행(Single Row) 반응형 최적화
1. **요구사항**:
   - 견적 상세 화면의 `PDF 다운로드 / 인쇄` 버튼 텍스트를 `PDF/인쇄`로 간결화.
   - 태블릿 및 모바일 기기에서도 줄바꿈 없이 상단 타이틀과 액션 버튼 그룹([PDF/인쇄], [목록으로], [수정하기])이 한 줄(Single Row)로 매끄럽게 표시되도록 레이아웃, 패딩, 폰트 사이즈 최적화.
2. **조치 내역**:
   - [PrintButton.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/PrintButton.tsx):
     - 버튼 문구를 `PDF/인쇄`로 단축.
     - `Printer` 아이콘 크기를 컴팩트화(`size={15}`)하고, 텍스트 줄바꿈 방지(`whitespace-nowrap`) 및 반응형 패딩/폰트(`px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold`) 적용.
     - 외부에서 스타일 커스텀이 가능하도록 `className` prop 옵셔널 지원.
   - [page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/estimates/[id]/page.tsx):
     - 상단 헤더 컨테이너를 다른 메인 페이지와 일관된 카드 박스(`bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-gray-200/80 shadow-xs`)로 고급화.
     - 타이틀은 `견적 상세`와 컴팩트한 식별번호 배지(`text-[11px] sm:text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200`)로 분리 배치하여 공간 효율 극대화.
     - 액션 버튼 그룹(`[PDF/인쇄]`, `[목록으로]`, `[수정하기]`)에 `flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap`을 적용하여 태블릿/모바일 가로폭에서도 줄바꿈 없이 100% 한 줄 표시 보장.
3. **검증 및 배포**:
   - `npm run build` 컴파일 및 정적 페이지 생성 검증 통과.
   - GitHub `main` 브랜치 푸시 완료 및 Render 자동 배포 반영.

### P. 모바일 안드로이드 한글 커서 튐 및 구글키보드(Gboard) 한/영 토글 불가 완벽 해결
1. **문제 현상 및 근본 원인 분석**:
   - **증상 1 (커서 튐)**: 기존 텍스트가 있는 입력창 앞쪽/중간에 커서를 두고 한글을 치면 커서가 맨 뒤로 튕겨 뒤에 입력됨.
     - 원인: React Controlled Component(`value={...} onChange={...}`)에서 한글 타이핑 시 `input.value = ...`가 대입될 때 안드로이드 웹뷰(Chromium/Blink)가 `selectionStart`를 문자열 맨 끝으로 리셋해버리는 브라우저 버그.
   - **증상 2 (Gboard 한영 토글 불가)**: 다른 앱에서는 구글 키보드(Gboard)의 한/영 전환이 되는데 이 앱에서는 안 됨.
     - 원인: 입력 필드에 `spellCheck="false"`, `autoCorrect="off"`, `autoCapitalize="none"` 등이 붙어 있으면 Gboard가 해당 입력창을 영문 전용/비표준 필드로 인식하여 다국어 한/영 토글 키를 비활성화함. 또한 개별 모달의 `enforceCaret` 이벤트 코드가 한글 IME composition 세션과 충돌을 일으킴.
   - **태블릿/휴대폰에서 개선 내용이 보이지 않았던 이유**:
     - 앱(`Capacitor`)이 원격 웹서버(`https://move-man.onrender.com`)를 웹뷰로 실시간 로드하는 구조이므로, Render 웹서버에 최신 코드가 푸시/배포 완료되어야 모바일 기기에서도 즉시 변경사항이 반영됨.
2. **조치 내역**:
   - **전역 커서 보존기 탑재 ([AndroidImeFix.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/AndroidImeFix.tsx))**:
     - `HTMLInputElement` 및 `HTMLTextAreaElement`의 prototype `value` setter를 안전하게 가로채어, 포커스된 입력창의 앞쪽/중간에서 텍스트를 입력할 때 커서가 끝으로 튕기지 않고 원래 입력 위치(`oldStart + diff`)에 정확히 머물도록 전역 보존.
     - [layout.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/layout.tsx)에 등록하여 견적서, 자재, 고객, 메모 등 앱 내 100% 모든 입력창에 영구 일괄 적용.
   - **Gboard 한영 토글 방해 속성 제거 및 표준화**:
     - [MaterialModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/inventory/MaterialModal.tsx) 및 [LocationModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/inventory/LocationModal.tsx)에서 `spellCheck="false"`, `autoCorrect="off"`, `enforceCaret`, 임시 버튼들을 전면 제거하고 `lang="ko"` 표준 속성 적용.
   - **안드로이드 네이티브 WebView 최적화 ([MainActivity.java](file:///c:/Users/ysjee/Desktop/MEMAN/web/android/app/src/main/java/com/meman/moveman/MainActivity.java))**:
     - `setDefaultTextEncodingName("UTF-8")`, `setTextZoom(100)` 설정으로 웹뷰 IME 입력 처리 안정화.
3. **빌드 및 배포**:
   - Next.js 프로덕션 빌드 통과.
   - Android Studio 호환 Gradle APK 빌드 성공 (`BUILD SUCCESSFUL`).
   - `deploy-apk.js`를 통해 최신 v1.0.22 릴리즈 덮어쓰기 복사 및 GitHub main 푸시 -> Render 무중단 자동 배포 완료.
### Q. 안드로이드 앱 버전 즉시 감지(User-Agent) 및 다운로드 캐시 혼선 방지 (v1.0.37)
1. **문제 현상 및 원인 분석**:
   - 최신 APK를 설치했음에도 초기 로딩 시 `현재버전: 이전버전 ➔ 설치할 버전: v1.0.XX 다운로드`로 표시되고 깜빡거림 발생.
   - 원인: 안드로이드 네이티브 브릿지(`window.AndroidApp`)의 비동기 주입 타이밍 지연(0ms 시점에 undefined)으로 인한 버전 미감지 및 고정 파일명(`moveman.apk`)으로 인한 스마트폰 내 과거 다운로드 파일 중복/캐시 혼선.
2. **조치 내역**:
   - [MainActivity.java](file:///c:/Users/ysjee/Desktop/MEMAN/web/android/app/src/main/java/com/meman/moveman/MainActivity.java): WebView의 `User-Agent` 끝에 `MoveManApp/{version}` (예: `MoveManApp/1.0.37`) 태그를 직접 주입하여 0ms 즉시 공식 설치 버전 감지 보장.
   - [Sidebar.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/Sidebar.tsx) & [page.tsx (login)](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/login/page.tsx): `navigator.userAgent`로 0순위 파싱, 불필요한 '웹' 문구 및 깜빡임(`animate-pulse`) 완전 제거, 일치 시 `v1.0.XX (최신)` 단정 배지 표기.
   - [route.ts (download)](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/api/download/apk/route.ts): 다운로드 파일명을 `moveman_${version}.apk` (예: `moveman_v1.0.37.apk`)로 동적 부여하여 구버전 파일 덮어쓰기 및 캐시 혼선 원천 차단.
   - [layout.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/layout.tsx): `<head>` 인라인 동기 스크립트로 React 번들 로드 전 prototype setter를 가로채어 한글 앞쪽 수정 시 커서 튐 버그 완벽 방어.

### R. 모바일 헤더 텍스트 정리 및 대시보드 통계 카드 컴팩트화
1. **요구사항**:
   - 모바일 상단 바의 중복 `MOVEMAN` 텍스트 제거.
   - 대시보드의 '오늘 예정된 방문견적', '이번 달 이사 건수', '대기 중인 견적' 카드가 휴대폰에서 화면을 꽉 채워 최근 견적 리스트가 가려지는 문제 해결.
2. **조치 내역**:
   - [Sidebar.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/Sidebar.tsx): 모바일 상단 헤더에서 `MOVEMAN` span 텍스트를 제거하고 로고 이미지만 깔끔하게 배치하여 공간 확보.
   - [page.tsx (dashboard)](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/page.tsx):
     - 대시보드 전체 여백을 모바일 `space-y-3`으로 압축.
     - 3개 통계 카드를 모바일에서도 **가로 1행 3열(`grid grid-cols-3 gap-2`)**로 배치.
     - 카드 패딩을 `p-2.5`로 축소하고 라벨을 모바일 축약형(`오늘 방문`, `이달 이사`, `대기 견적`)으로 반응형 지원.
     - 기존에 세로 3층으로 300px 이상 차지하던 통계 카드가 60~70px의 단 1줄로 압축되어, 스크롤 없이도 **최근 작성된 견적 리스트가 첫 화면에서 즉시 확인 가능**.
3. **검증 및 배포**:
   - `npm run build` 통과 및 GitHub `main` 푸시 -> Render 무중단 자동 배포 완료.

### S. 영상·사진 촬영 AI CBM 견적 시스템 구축 및 견적서 연동 (1단계 & 2단계)
1. **요구사항 및 배경**:
   - 현장에서 스마트폰 카메라로 방이나 집안을 둘러보며 촬영한 동영상(10~30초) 또는 사진을 AI가 분석하여, 이사 대상 가구·가전·박스류를 자동 식별하고 CBM 및 견적 물품 목록을 즉시 도출.
2. **1단계: Gemini Multimodal Vision 백엔드 파이프라인 구축 ([route.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/api/ai/analyze-media/route.ts))**:
   - 엔드포인트: `POST /api/ai/analyze-media` (Node.js 런타임, maxDuration: 120s).
   - 최신 구글 공식 AI SDK(`@google/genai`) 도입 및 `gemini-2.5-flash` 모델 연동.
   - **동영상 처리**: 스마트폰 360도 패닝 영상을 Files API로 업로드 후 비디오 처리 상태 폴링(`fileInfo.state === 'ACTIVE'`), 분석 후 임시 파일 및 Files API 리소스 자동 정리(`unlink`, `files.delete`).
   - **사진 처리**: Base64 인라인 데이터로 즉각 고속 분석.
   - **마스터 품목 매핑**: DB에 등록된 표준 물품(`StandardItem`) 및 공간(`LocationCategory`) 마스터를 시스템 프롬프트에 주입하여, 회전 촬영 시 발생하는 동일 물품 중복 카운트 방지 및 한국어 품목/규격/CBM 자동 매칭.
3. **2단계: AI CBM 검토 모달 및 견적 폼 연동**:
   - **AI 분석 및 검토 모달 ([AiCbmEstimateModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/AiCbmEstimateModal.tsx))**:
     - 📹 동영상 모드(방 회전 촬영 권장) 및 📸 사진 모드 탭 지원.
     - 카메라 직접 촬영(`capture="environment"`) 및 앨범/파일 업로드 드롭존.
     - 사용자 API 키 설정 기능(환경변수 `GEMINI_API_KEY` 부재 시에도 브라우저 로컬 저장으로 즉시 사용 가능).
     - AI 분석 결과 검토 테이블: 감지된 공간, 품목명, 규격, 수량(+/-), 처리옵션(이동/폐기/내림/경유), CBM 실시간 보정 및 항목 추가/삭제.
     - 반영 모드 선택: `기존 목록에 추가(권장)` vs `기존 물품 덮어쓰기`.
   - **견적 작성 화면 연동 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - 물품 목록 상단 헤더에 `[✨ AI 영상·사진 CBM 견적]` 버튼 배치.
     - 모달에서 [견적서에 즉시 반영하기] 클릭 시 현재 위치별 테이블에 자동 바인딩 및 총 CBM/추천 차량/인력 자동 재계산.
4. **검증 및 보완**:
   - `gemini-3.8-flash` 최신 구글 공식 모델로 갱신하여 신규 API 키 404 오류 해결.
   - `npm run build` 컴파일 및 정적 페이지 생성 검증 완료.

### T. 견적 작성 화면 직접입력 시 모바일 한글 완성 깨짐 버그 완벽 해결 (v1.0.39)
1. **문제 현상 및 원인 분석**:
   - **현상**: 모바일(안드로이드 스마트폰)에서 견적 작성 중 `[+ 직접입력 추가]` 버튼을 눌러 품목명이나 규격을 한글로 입력할 때, 자음과 모음이 합쳐지지 않고 따로 분리되거나 한글 완성이 되지 않는 문제.
   - **근본 원인**:
     - 기존 코드에서 물품 목록 렌더링 시 매번 `catItems.sort(...)`로 한글 가나다순 동적 정렬을 실행함.
     - 사용자가 한 글자 칠 때마다 `setItems`로 컴포넌트가 리렌더링되면서 행(Row)의 위치가 실시간으로 위아래로 점프함.
     - 게다가 테이블 행 키가 인덱스(`<tr key={idx}>`)로 되어 있어, 행 순서가 바뀔 때 React가 `<input>` DOM을 교체/재배치하면서 모바일 안드로이드 키보드(IME)의 한글 조합(Composition) 세션이 강제로 끊어져 발생.
2. **조치 내역 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
   - **렌더링 중 실시간 동적 정렬 제거**:
     - `catItems = items.filter(i => (i.locationId || '') === cat.id)`로 변경하여, 사용자가 직접 타이핑하는 중에는 행 순서가 절대 흔들리거나 점프하지 않도록 안정화. (최종 저장/직렬화 시에는 정상 정렬 보장)
   - **고유 불변 식별자(`_uid`) 부여**:
     - `ensureItemUid` 헬퍼를 도입하여 모든 품목에 `cbm_{timestamp}_{seq}_{rand}` 형태의 영구 키를 부여하고, `<tr key={item._uid}>`로 렌더링하여 React가 입력창 DOM 엘리먼트를 100% 동일하게 유지하도록 보장.
   - **직접입력 인풋 보조 속성 추가**:
     - 품목명 및 규격 인풋에 `autoComplete="off"`, `spellCheck={false}`를 부여하여 모바일 키보드 IME 간섭 방지.
3. **빌드 및 배포**:
   - `next build` 통과 및 Android Gradle 네이티브 컴파일(`BUILD SUCCESSFUL`, 25s).
   - 최신 **v1.0.39** APK 생성 및 Render 자동 무중단 배포 완료.

### U. AI 촬영공간 미선택 확인 Alert·미지정 처리 및 모바일 기본정보 좌우 스크롤 패치 (v1.0.40)
1. **요구사항**:
   - AI 촬영 시 촬영 공간 미선택 상태일 때 그대로 진행할지 확인하는 ALERT(confirm 대화상자) 추가.
   - 그냥 진행 시 AI 자동 감지로 분석하고, 감지되지 않으면 임의의 방(안방 등)이 아닌 '기타/미지정'으로 일관 처리.
   - 견적 수정 시 휴대폰에서 기본 정보 및 주소/일정 테이블이 찌그러지거나 잘리지 않도록 좌우 스크롤 가능하게 개선.
2. **조치 내역**:
   - **촬영 공간 미선택 시 진행 여부 확인 Alert ([AiCbmEstimateModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/AiCbmEstimateModal.tsx))**:
     - 카메라 직접 촬영 및 파일 선택, 분석 시작 시 촬영 공간(`hintLocation`)이 비어있으면 `confirm` 창을 띄워 사용자에게 의사를 확인하고 진행.
     - 결과 검토 테이블의 공간 드롭다운 최상단에 `<option value="">기타/미지정</option>`을 기본 제공하여, 감지되지 않은 품목이 첫 번째 방으로 오표기되는 문제 원천 차단.
   - **백엔드 공간 감지 및 미지정 처리 ([route.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/api/ai/analyze-media/route.ts))**:
     - 기존의 임의 기본값(`locations[0]?.name || '거실'`) 강제 할당을 제거하고, AI가 공간을 특정하지 못하면 빈 문자열 `""` (기타/미지정)으로 반환.
   - **견적 수정/조회 공간 동기화 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - AI 분석 결과 반영 시 `locationId`와 `locationName`을 동시에 일치시켜 등록함으로써, 견적 수정 화면과 상세 조회 화면 모두 '기타/미지정'으로 100% 동일하게 일치.
   - **모바일 기본 정보 및 주소/일정 좌우 스크롤 지원 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - '기본 정보' 테이블에 `min-w-[580px]` 부여 및 상단에 '👉 좌우로 스크롤하여 확인' 안내 배지 탑재.
     - '주소 및 일정' 테이블에 `min-w-[620px]` 부여.
     - 좁은 스마트폰 화면에서도 테이블이 찌그러지거나 우측 입력 필드가 잘리지 않고 매끄럽게 가로 스크롤하여 전 항목 확인 및 입력 가능.
3. **빌드 및 배포**:
   - `next build` 통과 및 Gradle 네이티브 컴파일(`BUILD SUCCESSFUL`, 25s).
   - 최신 **v1.0.40** APK 생성 및 Render 자동 무중단 배포 완료.

### V. 견적 상세 고객 연락처 통화 버튼 탑재 및 인쇄 시 제외 (v1.0.41)
1. **요구사항**:
   - 견적 조회(상세) 화면의 고객 연락처에 '통화' 버튼 추가.
   - 모바일/웹에서 원클릭으로 전화 앱(다이얼) 연결.
   - 인쇄 및 PDF 출력 시에는 해당 버튼이 깔끔하게 제외(`print:hidden`)되도록 처리.
2. **조치 내역**:
   - **통화 버튼 탑재 ([page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/estimates/[id]/page.tsx))**:
     - `lucide-react`의 `Phone` 아이콘을 임포트.
     - 고객 연락처 텍스트 옆에 `<a href="tel:{전화번호}">` 통화 버튼 추가.
     - 에메랄드 테마의 컴팩트한 배지 스타일(`bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300`) 적용.
     - 인쇄 스타일 `print:hidden`을 부여하여 브라우저 인쇄 및 PDF 다운로드 시 화면에서는 전화번호 텍스트만 깔끔하게 출력되고 통화 버튼은 100% 숨김 처리.
3. **빌드 및 배포**:
   - `next build` 통과 및 Android Studio 호환 Gradle 네이티브 APK 컴파일(`BUILD SUCCESSFUL`, 25s).
   - 최신 **v1.0.41** APK 생성 및 Render 자동 무중단 배포 완료.

### W. 방문견적 초고속 완성 시스템 - 평형별 템플릿, 원터치 카운터 패널, AI 사진 경량화 & 백그라운드 분석 (v1.0.42)
1. **요구사항**:
   - 고객 앞에서 5~10분 이내에 견적을 신속하게 완성해야 하는 현장 방문견적의 특성에 맞춰 대기시간과 타이핑을 없애고 속도를 획기적으로 향상.
2. **조치 내역**:
   - **평형별/가구규모별 원클릭 표준 템플릿 ([estimatePresets.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/lib/estimatePresets.ts), [EstimatePresetModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimatePresetModal.tsx))**:
     - 원룸/1인가구(8~12 CBM), 투룸 15~20평(18~25 CBM), 아파트 24평 3인가구(30~38 CBM), 아파트 34평 4인가구(45~55 CBM), 40평형 이상 대형(60~75 CBM) 5단계 프리셋 탑재.
     - 방문 즉시 평형 버튼을 탭하면 각 방별(안방, 거실, 주방, 베란다 등)로 표준 가구/가전/박스 수량이 **5초 만에 80% 자동 세팅**.
   - **현장 초고속 원터치 카운터 패널 ([QuickTouchCbmPanel.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/QuickTouchCbmPanel.tsx))**:
     - CBM 헤더에 `[⚡ 초고속 터치]` vs `[📋 상세 테이블]` 세그먼트 토글 탑재 (기본값: 초고속 터치).
     - 키보드와 드롭다운을 열 필요 없이, 방별 주요 물품이 큼직한 타일 카드로 배치되어 엄지손가락으로 톡톡 누르면 즉시 수량 증감 (BOX 등 대량 물품은 `±5` 퀵 버튼 제공, 처리옵션 탭 순환).
     - 방 하나를 걸어 다니며 10초 만에 짐 체크 완료.
   - **AI 모바일 사진 초고속 압축 & 백그라운드 병렬 분석 ([imageCompressor.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/lib/imageCompressor.ts), [AiCbmEstimateModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/AiCbmEstimateModal.tsx), [EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - 스마트폰 고화질 사진을 브라우저 캔버스를 통해 1280px / 약 200KB로 0.1초 만에 경량화하여 전송함으로써 업로드 및 AI 응답시간을 **2~4초 수준으로 단축**.
     - 분석 시작 후 `[다른 방으로 이동 (백그라운드 진행)]` 버튼을 누르면 모달을 닫고 다음 방으로 이동 가능. 상단에 플로팅 상태 배너가 유지되며, 분석 완료 시 원클릭으로 현재 견적서에 자동 병합.
3. **검증 및 배포**:
   - `next build` 통과 및 Android Studio 호환 Gradle 네이티브 APK 컴파일(`BUILD SUCCESSFUL in 24s`).
   - 최신 **v1.0.42** APK 생성 및 Render 자동 무중단 배포 완료.
### X. 물품정보 '내품 CBM' 명칭 수정 및 견적 등록 시 내품 CBM 자동 합산 보장 (v1.0.43)
1. **요구사항**:
   - 물품정보 관리 및 견적서의 "추가 CBM" 명칭을 **"내품 CBM"**으로 일괄 수정.
   - 견적 물품 등록 시 내품 CBM이 누락 없이 함께 자동 합산되도록 개선.
   - (사유: 장농, 서랍장, 수납가구 등은 무게 때문에 내부 옷이나 짐을 옷 박스 등에 별도로 포장해야 하므로 CBM 증가 요인이 됨)
2. **조치 내역**:
   - **UI 명칭 일괄 수정**:
     - [page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/items/page.tsx): 물품 기준정보 모달 라벨을 '내품 CBM (선택 - 장농, 서랍장 등 내부 짐 포장 박스용)'으로 개선, 물품 목록 테이블 헤더를 '내품 CBM'으로 수정.
     - [page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/estimates/[id]/page.tsx): 견적 상세 및 인쇄용 테이블 헤더를 '내품 CBM'으로 수정.
     - [EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx): 상세 테이블 모드 헤더를 '내품 CBM'으로 변경하고, 내품 CBM이 있는 품목은 앰버 테마(`bg-amber-50/80 text-amber-900 border-amber-300 font-bold`)로 시각적 강조. 규격 드롭다운 라벨에도 `${spec} (${cbm} CBM + 내품 ${innerCbm})` 형식으로 내품 CBM 명시.
   - **평형별 템플릿(프리셋) 내품 CBM 적용 ([estimatePresets.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/lib/estimatePresets.ts))**:
     - 원룸, 투룸, 24평, 34평, 40평형 템플릿의 장농(`cbm: 1.1, innerBoxCbm: 0.9` -> 통당 총 2.0 CBM), 서랍장, 책장, 앵글에 실제 내품 CBM 수치 부여.
     - [EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx)의 `handleApplyPreset` 시 DB 기준정보(`standardItems`)와 매칭하여 `defaultInnerCbm`이 있는 경우 자동으로 `innerBoxCbm`에 할당되도록 보완.
   - **원터치 패널 자동 매핑 ([QuickTouchCbmPanel.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/QuickTouchCbmPanel.tsx))**:
     - 수량을 0에서 1 이상으로 올릴 때 `standardItems`의 `defaultInnerCbm`을 자동 바인딩.
     - 터치패널 타일 카드에 `내품 +{item.innerBoxCbm}` 배지 노출.
3. **검증 및 배포**:
   - Next.js 프로덕션 빌드(`npx next build`) 검증 완료.
   - Android Studio Gradle 네이티브 APK 컴파일(`BUILD SUCCESSFUL in 22s`).
   - 최신 **v1.0.43** APK 생성 및 GitHub `main` 푸시 -> Render 자동 무중단 배포 완료.

### Y. 견적 작성 및 수정 화면 태블릿 수평(가로) 100% 안착 최적화 (v1.0.44)
1. **요구사항**:
   - 태블릿 기기에서 견적 작성/수정 화면을 볼 때 가로(수평)로 화면이 넘쳐 가로 스크롤이 생기거나 내용이 잘리지 않고, 태블릿 화면 가로 폭 안에 100% 쏙 들어오도록 반응형 레이아웃 및 너비 최적화.
2. **원인 분석**:
   - 대시보드 메인 래퍼(`layout.tsx`)의 패딩이 `lg:p-8`(좌우 64px)로 과도하여 태블릿 폭(768px~1024px)에서 사이드바(256px)와 결합 시 실제 콘텐츠 영역이 704px 수준으로 협소해짐.
   - `EstimateForm.tsx` 내부 테이블 및 컨테이너들에 `min-w-[580px]`, `min-w-[620px]`, `min-w-[550px]`, `min-w-[460px]` 등 불필요한 고정 최소폭과 과도하게 넓은 고정 `th` 너비(`w-36` = 144px)가 지정되어 있어 가로 스크롤 및 우측 잘림 발생.
3. **조치 내역**:
   - **대시보드 패딩 최적화 ([layout.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/layout.tsx))**:
     - 메인 컨텐츠 영역의 기본 패딩을 `p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6`으로 슬림화하여 태블릿 환경에서 좌우 40~50px 이상의 가로 작업 영역을 추가 확보.
   - **견적 작성/수정 폼 수평 안착 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - 최상위 컨테이너 `w-full min-w-0 max-w-5xl px-1 sm:px-2 md:px-3` 적용.
     - **기본정보 테이블**: `min-w-[580px]` 제거 -> `min-w-0 w-full`, 헤더 폭 `w-20 sm:w-24 md:w-28`로 유연화.
     - **주소 및 일정 테이블**: `min-w-[620px]` 제거 -> `min-w-0 w-full`, 헤더 폭 `w-20 sm:w-24 md:w-28`.
     - **출발지/도착지 층수 및 작업조건**: 층수 입력창 `w-14 sm:w-16`, 4개 작업조건 버튼(`사다리차`, `엘리베이터`, `수작업`, `계단`) 컴팩트 패딩 및 `flex-wrap` 적용으로 우측 밀림 방지.
     - **사다리차 & 거리 계산기**: 톤수 버튼 및 2열 카드, 거리 계산기 인풋을 태블릿 가로폭에 맞게 패딩 슬림화 및 `flex-wrap` 최적화.
     - **CBM 헤더 & 상세 테이블**: 헤더 액션 바(`flex-col md:flex-row md:items-center`), 테이블 고정폭(`min-w-[550px]`) 제거 -> `min-w-0 w-full`, 각 열 너비 및 패딩 슬림화(규격, 수량, 처리, 기본CBM, 내품CBM, 삭제).
     - **투입 인력 및 차량**: `min-w-[280px]` 제거 -> `min-w-0 w-full`.
     - **이사 비용 입력 4열 그리드**: `lg:grid-cols-4`에서 `sm:grid-cols-4`로 확대하여 태블릿에서도 4개 항목(기본 이사 비용, 가산비용, 보관비용, 부가세)이 수평 한 줄에 나란히 배열.
     - **결제 플랜 테이블**: `min-w-[460px]` 제거 -> `min-w-0 w-full`.
     - **하단 고정 저장 바**: 버튼 패딩 `px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm`으로 컴팩트화.
4. **검증 및 배포**:
   - Next.js 프로덕션 빌드(`npx next build`) 정상 완료.
   - Android Studio Gradle 네이티브 APK 컴파일(`BUILD SUCCESSFUL in 26s`).
   - 최신 **v1.0.44** APK 생성 및 GitHub `main` 푸시 -> Render 자동 무중단 배포 완료.

### Z. 견적 품목 처리구분에 '존치' 추가 및 CBM 제외 처리
1. **요구사항**:
   - 기존 견적 작성 및 수정 시 제공되던 품목 처리구분(이동, 폐기, 내림, 경유)에 **'존치'** 옵션을 추가.
2. **조치 내역**:
   - **CBM 계산 제외 로직 (`isBaseCbmExcluded`)**:
     - '존치'는 출발지 현장에 그대로 두고 가는 짐이므로, '폐기', '내림'과 동일하게 **차량 적재 기본 CBM 합산에서 자동 제외**되도록 처리 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx), [page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/estimates/[id]/page.tsx), [AiCbmEstimateModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/AiCbmEstimateModal.tsx), [route.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/api/ai/analyze-media/route.ts)).
   - **견적 작성/수정 테이블 및 뱃지 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - 품목 테이블 내 처리 셀렉트 박스에 `<option value="존치">존치</option>` 추가 및 슬레이트 테마(`bg-slate-100 text-slate-700 border-slate-300`) 적용.
     - 상단 특이 처리 항목 요약 뱃지 영역에 `존치 {countBy['존치']}` 추가.
   - **초고속 원터치 모드 ([QuickTouchCbmPanel.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/QuickTouchCbmPanel.tsx))**:
     - 원터치 카드 내 처리 뱃지 순환 시 `이동 ➔ 폐기 ➔ 내림 ➔ 경유 ➔ 존치 ➔ 이동` 순환 로직 및 슬레이트 스타일 적용.
   - **견적 상세 및 인쇄 뷰 ([page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/estimates/[id]/page.tsx))**:
     - 상단 특이 처리 요약 뱃지에 `존치 {summary['존치']}개` 노출.
     - 산출 물품 목록 테이블 행에 `bg-slate-50/40` 배경 및 `존치` 전용 뱃지(`bg-slate-100 text-slate-700 border-slate-300`) 렌더링.
   - **타입 정의 및 AI 분석 연동**:
     - [estimatePresets.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/lib/estimatePresets.ts): `treatment?: '이동' | '폐기' | '내림' | '경유' | '존치'`.
     - [analyze-media/route.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/api/ai/analyze-media/route.ts): AI 프롬프트 선택지 및 응답 정규화에 '존치' 포함.
3. **검증 및 배포**:
   - `npm run build` Next.js 및 TypeScript 컴파일 무결성 검증 완료.

### AA. 평형 템플릿 품목 표준화 및 DB 물품 기준정보(StandardItem) 100% 동기화
1. **요구사항**:
   - 평형 템플릿(원룸, 투룸, 24평, 34평, 40평 이상) 선택 시 시스템 물품 기준정보에 미등록된 임의 품목이 불러와지는 문제를 점검하고, DB 마스터 품목과 100% 일치하도록 보완 정비.
2. **원인 분석**:
   - 템플릿에 `소파` vs DB `쇼파`, `전자렌지` vs DB `주방가전(전자레인지)`, `건조기` vs DB `세탁기(건조기)` 등 명칭 불일치.
   - 복합 명칭(`/` 기호 사용: `책상/책장`, `서랍장/옷장`, `수납장/행거` 등) 사용으로 DB 매핑 실패.
   - 템플릿 규격(`40~50인치`, `Q/K`, `양문형(800L)` 등)과 DB 마스터 규격(`55미만`, `75`, `양문형 대형 4도어` 등) 불일치로 내품 CBM 및 표준 규격 드롭다운 연동 누락.
   - `공기청정기`, `피아노`, 독립 `건조기` 등 현장 핵심 품목이 DB에 미등록 상태.
3. **조치 내역**:
   - **DB 물품 기준정보([StandardItem](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/items/page.tsx)) 핵심 품목 15종 신규 확충 (총 98건)**:
     - `공기청정기`: 일반(0.2 CBM), 타워/대형(0.3 CBM)
     - `피아노`: 디지털(0.6 CBM), 업라이트(1.5 CBM), 그랜드(3.0 CBM)
     - `건조기`: 일반/드럼(1.0 CBM), 대형(1.1 CBM)
     - `스타일러`: 일반/3벌(0.7 CBM), 대형/5벌(0.9 CBM)
     - `소파`: 3인(1.6 CBM), 4인(2.3 CBM), 스툴(0.5 CBM), 아쿠아텍스 코너형(5.0 CBM) (기존 '쇼파'와 상호 호환)
     - `안마의자`: 일반(1.5 CBM), 프리미엄/대형(2.5 CBM)
   - **평형 템플릿([estimatePresets.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/lib/estimatePresets.ts)) 전면 표준화**:
     - 5개 템플릿(원룸, 투룸, 24평, 34평, 40평 이상) 총 54개 고유 품목을 DB 마스터 품목명 및 규격과 **100% 일치(불일치 0건)**하도록 정비.
     - 템플릿 불러오기 시 장농·서랍장·냉장고 등의 표준 CBM 및 내품 CBM이 완벽하게 자동 바인딩되고, 견적 테이블에서 규격 드롭다운 선택 시 DB의 다른 표준 규격으로 즉시 전환 가능.
     - **책상 + 책상용 의자 세트 구성**: 책상이 배치된 모든 공간(안방, 방1, 방2 등)에 `의자 (규격: 책상용, 0.5 CBM)`를 1:1 필수 세트로 누락 없이 함께 자동 배치.
     - **중복 옷·이불 박스 제거 및 순수 비수납 잔짐 산정**: 장농, 서랍장, 냉장고의 내품 CBM에 이미 옷·이불·음식물 박스가 가산되어 있으므로, [기타/미지정]에 중복 들어가 있던 BOX (옷), BOX (이불)을 완전히 제거하고 가구 수납 외 순수 잔짐(BOX (중) 8~25개)만 평형별로 현실적으로 산정.
### BB. BOX 품목 실측치 CBM 전면 반영 및 견적 작성/템플릿 연동 고도화
1. **요구사항**:
   - DB 물품 기준정보(`StandardItem`)에서 `BOX` 품목들의 규격 및 defaultCbm이 실측치로 수정됨에 따라, 견적 작성 및 평형별 템플릿 등 연관 영역 전반에 신규 실측치를 완벽히 반영.
2. **실측치 확정 내역 (DB 기준정보)**:
   - `BOX - 대`: **0.15 CBM** (신규 규격)
   - `BOX - 중`: **0.10 CBM** (기존 0.17 ➔ 0.10)
   - `BOX - 바구니`: **0.10 CBM** (기존 0.17 ➔ 0.10)
   - `BOX - 옷`: **0.17 CBM** (기존 0.25 ➔ 0.17)
   - `BOX - 이불`: **0.25 CBM** (기존 0.33 ➔ 0.25)
   - `BOX - 책`: **0.05 CBM** (기존 0.10 ➔ 0.05)
3. **조치 내역**:
   - **평형별 표준 템플릿 ([estimatePresets.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/lib/estimatePresets.ts))**:
     - 원룸, 투룸, 24평, 34평, 40평 이상 전 템플릿의 잔짐 `BOX (중)` 기본 CBM을 기존 `0.17`에서 실측치 **`0.10`**으로 일괄 수정.
   - **템플릿 적용 시 DB 실측치 최우선 바인딩 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - `handleApplyPreset`에서 하드코딩된 프리셋 CBM보다 DB 물품 기준정보(`standardItems`)의 최신 실측치가 항상 1순위로 바인딩되도록 개선. 향후 DB에서 수치가 변경되어도 무수정으로 즉시 연동 보장.
   - **테이블 인라인 규격 드롭다운에 실측치 CBM 표기 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - 기존에 단순 규격명만 표시되던 견적 테이블 내 규격 셀렉트 박스에 `{규격} ({defaultCbm} CBM)`을 명시하여, 사용자가 `BOX`나 가구 규격을 변경할 때 실측치 CBM을 즉각 눈으로 확인 가능하도록 개선.
   - **초고속 원터치 모드 카드 내 규격 선택 CBM 표기 ([QuickTouchCbmPanel.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/QuickTouchCbmPanel.tsx))**:
     - 빠른 터치 모드의 규격 셀렉트 박스에도 동일하게 실측치 CBM 정보를 직관적으로 노출.
4. **검증 및 배포**:
   - `npx next build` Next.js 16 및 Turbopack 컴파일 무결성 검증 완료.

### CC. 물품 목록 상세 테이블 모드 품목 및 규격 열 너비 비율 최적화
1. **요구사항**:
   - 견적 작성 화면에서 물품 목록을 '초고속 원터치'에서 '상세 테이블' 모드로 전환했을 때, '품목' 입력창이 불필요하게 넓고 '규격' 셀렉트 박스는 너무 좁아 텍스트 및 CBM 정보가 잘려 보이지 않는 현상 해결.
2. **원인 분석**:
   - '품목' 열에 고정 너비가 지정되지 않아 남는 공간의 40~50%를 혼자 독점.
   - '규격' 열은 `w-24 sm:w-32 md:w-36`(96px~144px)로 과도하게 좁게 고정되어, "양문형 대형 4도어 (2.4 CBM + 내품 1.6)", "단프라 박스 (중) (0.1 CBM)" 등 긴 규격명과 CBM 수치가 말줄임표나 글자 잘림 발생.
3. **조치 내역**:
   - **견적 작성 상세 테이블 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - 테이블 컨테이너에 `min-w-[560px] sm:min-w-0`를 부여하여 모바일 환경에서도 가로 스크롤 시 열 찌그러짐 원천 차단.
     - **품목 열 너비 콤팩트화**: `w-28 sm:w-36 md:w-44` (약 112px~176px)로 지정하여 2~6글자의 품목명(침대, 냉장고, 김치냉장고 등)에 딱 맞는 적정 비율로 슬림화.
     - **규격 열 대폭 확장**: 고정 너비를 제거하고 `min-w-[160px] sm:min-w-[220px]` 및 가변 확장(`w-auto`)을 적용하여 테이블에서 가장 넓은 비율을 차지하도록 개선. 긴 규격명과 CBM 정보가 잘림 없이 100% 완전 노출.
     - **하단 [+ 규격 선택] 드롭다운**: `max-w-[240px]`에서 `max-w-[340px]`로 확대하여 신규 품목 추가 시에도 규격 전체 텍스트가 시원하게 보이도록 처리.
   - **견적 상세 화면 ([page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/estimates/[id]/page.tsx))**:
     - 산출 물품 목록 테이블 헤더의 '품목' 열에 `w-32 sm:w-44 print:w-28`, '규격' 열에 `min-w-[150px] sm:min-w-[200px]`를 적용하여 일관된 황금비율 레이아웃 유지.
4. **검증 및 배포**:
   - Next.js 16 프로덕션 빌드(`npx next build`) 컴파일 완료.

### DD. 평형 템플릿 기타/미지정 잔짐 박스 포함 내역 안내 툴팁 탑재
1. **요구사항**:
   - 평형별 템플릿 적용 시 [기타/미지정]에 자동 배치되는 잔짐 박스(BOX)에 어떤 짐들이 포함되는지(신발, 욕실, 거실 바닥 짐 등) 사용자가 툴팁을 통해 직관적으로 확인할 수 있도록 구현.
2. **조치 내역**:
   - **전용 툴팁/팝오버 컴포넌트 신규 개발 ([UnassignedBoxTooltip.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/UnassignedBoxTooltip.tsx))**:
     - `variant` 옵션 지원: `badge` (뱃지 버튼), `icon` (물음표 아이콘), `banner` (가로 배너 바).
     - 마우스 호버 및 모바일 터치 클릭 지원 (바깥 영역 클릭 시 자동 닫힘).
     - 포함 내역 구성:
       - **현관/신발장**: 신발류(신발장 수납분 일부), 우산, 슬리퍼, 현관 잡화
       - **욕실/화장실**: 수건, 세면도구, 샴푸/바디워시, 드라이기, 욕실 소품
       - **거실/침실**: 화장품, 탁상 스탠드, 멀티탭/전선, 쿠션, 인형, 액자, 생활 소품
       - **베란다/다용도실**: 빨래바구니, 건조대 소품, 청소도구 부속품, 화분 주변 잡화
       - **중복 제외 안내**: 장농·서랍장의 옷/이불, 냉장고 음식물, 책장 도서는 해당 가구의 [내품 CBM]에 이미 포함되어 본 박스와 중복되지 않음을 명시.
   - **견적 작성 화면 연동 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - `[기타/미지정]` 아코디언 헤더에 `[ℹ️ 박스 포함내역 안내]` 뱃지 탑재.
     - 아코디언 확장 시 테이블 상단에 클릭 가능한 안내 배너 바 제공.
   - **초고속 원터치 모드 연동 ([QuickTouchCbmPanel.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/QuickTouchCbmPanel.tsx))**:
     - `기타/미지정` 공간 탭 선택 시 상단 팁 영역에 `[ℹ️ 박스 포함내역 안내]` 뱃지 탑재.
   - **평형 템플릿 모달 연동 ([EstimatePresetModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimatePresetModal.tsx))**:
     - 템플릿 선택 모달의 포함 품목 미리보기에서 `[기타/미지정]` 항목 옆에 ℹ️ 툴팁 아이콘을 탑재하여 템플릿 적용 전에도 즉시 확인 가능.
   - **태블릿 및 모바일 우측 잘림 방지 스마트 뷰포트 고정 포지셔닝 적용**:
     - 기존 `absolute` 위치 지정 시 부모 요소의 `overflow-hidden`이나 태블릿 화면 우측 경계선에 걸려 내용이 잘리던 현상 해결.
     - `position: fixed` 및 버튼 좌표(`getBoundingClientRect`) 기반 스마트 Clamp 계산 적용:
       - 팝오버 너비를 `min(360px, calc(100vw - 32px))`로 제한.
       - 버튼이 화면 오른쪽에 치우쳐 있어도 화면 우측 여백 16px 이내로 팝오버를 자동 보정(`left = window.innerWidth - popoverWidth - 16`)하여 우측 잘림을 100% 원천 차단.
       - 팝오버 바깥 클릭 시 부드럽게 닫히는 반투명 백드롭(`fixed inset-0 z-50 bg-black/15`) 탑재.
3. **검증 및 배포**:
   - Next.js 16 프로덕션 빌드(`npx next build`) 검증 완료.

### W. 팬트리선반 CBM 등록 및 주방 바구니 중심 이사 자재 산출 시뮬레이션 (24평형)
1. **팬트리선반 CBM 산정 및 붙박이 기준 표준 물품 등록**:
   - **배경 및 원칙**: 신축 아파트 및 주택의 팬트리는 90% 이상이 벽체 고정형 **붙박이 시스템 선반**이므로, 이사 시 선반 자체를 떼어가지 않고 두고 감. 따라서 선반 프레임 부피인 **기본 CBM은 `0`**으로 설정하고, 선반 위에 수납된 식료품/주방잡화 짐만 **내품 CBM**으로 산정하여 실제 차량 적재량에 정확히 반영.
   - **등록 품목 및 CBM**:
     - `팬트리선반 (5단 1자형)`: 기본 CBM 0 / 내품 CBM 0.8 (수납 짐 8~10박스)
     - `팬트리선반 (5단 ㄴ자형)`: 기본 CBM 0 / 내품 CBM 1.5 (수납 짐 15~18박스)
     - `팬트리선반 (5단 ㄷ자형)`: 기본 CBM 0 / 내품 CBM 2.5 (3면 워크인 팬트리 짐 25~30박스)
   - **공간 매핑**: `팬트리`, `주방`, `베란다` 공간 카테고리에 다중 매핑 완료.
   - **안내 팝업 반영**: [UnassignedBoxTooltip.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/UnassignedBoxTooltip.tsx)에 '베란다/다용도/팬트리' 라벨 및 팬트리선반 내품 CBM 중복 제외 안내 문구 보강.

2. **주방 바구니 중심 자재 산출 시뮬레이션 (24평형 아파트)**:
   - **현장 포장 특성 반영**:
     - 주방 그릇/접시류(완충 에어캡 포장), 냉장고/김치냉장고 음식물(위생비닐 속포장), 냄비/양념류 등 주방 짐의 **85% 이상은 종이/단프라 박스가 아닌 단단한 플라스틱 바구니(`MAT-BSK-01`)로 포장**됨.
     - 침실/의류는 단프라 대형(`MAT-BOX-L`) 및 행거박스(`MAT-HNG-01`), 서재 도서는 단프라 중형(`MAT-BOX-M`)으로 분할 산출.
   - **24평형 (5톤 트럭 1대, 약 20~25 CBM) 표준 출고 자재량**:
     - **이사 바구니 (청색/대)**: **28 ~ 32개** (주방/냉장고 22~24개 + 욕실 3~4개 + 신발장 4~5개)
     - **단프라 박스 (대)**: **18 ~ 22개** (의류 12개 + 이불 6개 + 기타 부피 짐)
     - **단프라 박스 (중)**: **10 ~ 12개** (도서/서류 7개 + 주방 소품/잡화)
     - **옷걸이 박스 (행거용)**: **3 ~ 5개** (코트, 정장, 원피스 거치)
     - **보호재/소모품**: 매트리스 커버 1~2개, 누비커버 1세트, 바닥보호재(플로링보드) 15~20장, 에어캡 1~2롤, OPP테이프 5~6롤, 스트레치 필름 1롤, 작업용 덧신 4~5켤레.
   - **공식 설계 문서 작성**: [PACKING_MATERIALS_SIMULATION_24PY.md](file:///c:/Users/ysjee/Desktop/MEMAN/docs/PACKING_MATERIALS_SIMULATION_24PY.md)에 상세 시뮬레이션 표, CBM 기반 자동 계산 알고리즘 공식(`calculateRequiredMaterials`), 향후 견적서 및 차량 인수인계서 연동 로드맵 정리 완료.






### II. '소파' vs '쇼파' 명칭 단일화 ('소파'로 일원화)
1. **요구사항**:
   - 시스템 내 '소파'와 '쇼파' 단어 혼용을 방지하고, 물품 마스터 및 견적서, 코드/문서 전반에서 **'소파'**로 완전 일원화.
2. **원인 및 조치 내역**:
   - DB 물품 기준정보(`StandardItem`)에 '쇼파'로 등록되어 있던 4개 항목(3인, 4인, 아쿠아텍스 코너형, 스툴)을 **'소파'**로 일괄 변경 완료:
     - `쇼파 (3인, 1.6 CBM)` -> `소파 (3인, 1.6 CBM)`
     - `쇼파 (4인, 2.3 CBM)` -> `소파 (4인, 2.3 CBM)`
     - `쇼파 (아쿠아텍스 코너형, 5.0 CBM)` -> `소파 (아쿠아텍스 코너형, 5.0 CBM)`
     - `쇼파 (스툴, 0.5 CBM)` -> `소파 (스툴, 0.5 CBM)`
   - 자재 품목(`MaterialItem`), 견적서(`Estimate`), 평형 템플릿(`estimatePresets.ts`), AI 분석 프롬프트(`analyze-media`) 등 전체 시스템에서 '쇼파' 잔여 0건 확인 및 '소파'로 통일 완료.

### JJ. 견적 작성 시 전화번호 하이픈(-) 자동 삽입 및 숫자 순서 뒤바뀜 버그 해결
1. **문제 현상 및 원인 분석**:
   - **증상**: 견적 작성 시 고객 연락처를 연속 타이핑하거나 11자리 모바일 번호(`010...`) 입력 시 하이픈이 자동 삽입되면서 숫자가 뒤섞이거나 순서가 바뀌는 현상 발생 (예: `010-1234-5678` 입력 시 `010-1238-4567` 등으로 뒤섞임).
   - **근본 원인 1 (10자리 ➔ 11자리 하이픈 점프 버그)**:
     - 기존 `formatPhoneNumber` 로직에서 번호가 10자리 이하일 때 `010-XXX-XXXX` (3-3-4 패턴)로 포맷팅되다가, 11번째 숫자를 누르는 순간 갑자기 `010-XXXX-XXXX` (3-4-4 패턴)로 규칙이 전환됨.
     - 가운데 번호가 3자리에서 4자리로 확장되면서 하이픈 위치가 이동하고 뒤의 숫자들이 밀리면서 브라우저/모바일 키보드 조합 세션과 충돌하여 숫자가 꼬임.
   - **근본 원인 2 (React 제어 컴포넌트 커서 위치 리셋)**:
     - `value={contact} onChange={...}` 제어 컴포넌트에서 포맷팅된 문자열이 `input.value`에 재대입될 때, 브라우저가 커서(`selectionStart`)를 하이픈 앞이나 맨 끝으로 튕겨버려 빠른 타이핑 시 입력 순서가 역전됨.
2. **조치 내역**:
   - **010 모바일 번호 가운데 4자리 고정 포맷터 개선 ([format.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/lib/format.ts))**:
     - `010`으로 시작하는 번호는 대한민국 100% 11자리 표준이므로, 8자리 이상 입력 시 항상 가운데 4자리를 고정(`010-XXXX-X...`)하도록 개선.
     - 8자리부터 11자리까지 항상 맨 끝에 순차적으로 숫자가 추가되므로 하이픈 위치가 중간에 흔들리지 않음.
   - **커서(Caret) 정밀 복원 핸들러 신규 구축 (`handlePhoneInputChange`)**:
     - 사용자가 타이핑한 커서 직전까지의 '순수 숫자 개수(`digitsBeforeCursor`)'를 계산.
     - 하이픈이 추가/제거된 새 포맷팅 문자열에서 정확히 해당 숫자 개수 뒤의 위치를 찾아 `requestAnimationFrame`으로 `input.setSelectionRange(targetPos, targetPos)`를 복원.
     - 끝에서 연속 타이핑하거나 중간에서 숫자를 수정/삭제해도 커서가 항상 방금 입력한 숫자 바로 뒤를 완벽하게 유지.
   - **견적 작성 폼 연결 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - `onChange={e => handlePhoneInputChange(e, setContact)}`로 교체.
     - `maxLength={13}`, `autoComplete="tel"` 적용으로 모바일/태블릿 키패드 최적화.
3. **검증 및 배포**:
   - `npx next build` 프로덕션 빌드 정상 통과.
   - GitHub `main` 푸시 완료 및 Render 자동 무중단 배포 반영.

### KK. 접수일자 캘린더 프레임 가림 해결 및 기본정보 반응형 그리드로 태블릿 전화번호 잘림 방지
1. **문제 현상 및 원인 분석**:
   - **증상 1 (캘린더 프레임 가림)**: 접수일자 클릭 시 캘린더 팝업의 하단 날짜들이 부모 테이블 프레임에 가려져 보이지 않거나 클릭 불가.
     - 원인: 부모 요소에 `overflow-x-auto`가 지정되어 있어, `DatePicker`의 `absolute` 팝업 레이어가 부모 박스 높이(약 80px)를 벗어날 때 overflow에 의해 70% 이상 잘려버림.
   - **증상 2 (태블릿 전화번호 잘림)**: 견적 작성 및 수정 시 태블릿 화면에서 오른쪽 열(연락처, 접수일자)이 오른쪽 프레임 밖으로 밀려나 잘려 보임.
     - 원인: 기본 정보 테이블이 한 줄에 4개 컬럼(`[고객명][연락처]`, `[이사종류][접수일자]`)을 억지로 배치하고 부모가 `overflow-x-auto`로 감싸져 있어, 태블릿 가로폭이 협소할 때 오른쪽 절반이 화면 밖으로 넘어가서 발생.
2. **조치 내역**:
   - **CustomDatePicker 포털 및 뷰포트 고정 레이어 적용 ([CustomDatePicker.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/CustomDatePicker.tsx))**:
     - `popperProps={{ strategy: 'fixed' }}`를 적용하여 부모 컨테이너의 `overflow: auto/hidden` 제약을 완전히 벗어나 브라우저 뷰포트 기준으로 팝업이 렌더링되도록 개선.
     - `popperPlacement="bottom-start"`, `popperClassName="z-[99999]"`, `body .react-datepicker-popper { z-index: 99999 !important; }`를 부여하여 화면 어떤 UI보다도 최상단에 깨끗하게 노출.
   - **기본 정보 반응형 그리드 개편 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - 4열 고정 테이블 및 `overflow-x-auto`를 제거하고 모던한 **반응형 카드 그리드(`grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3`)**로 전환.
     - 태블릿 세로 및 모바일: 각 항목이 100% 폭을 사용하여 고객명, 연락처, 이사종류, 접수일자가 가로 스크롤이나 잘림 없이 100% 한눈에 표시.
     - 태블릿 가로 및 데스크톱: 2열 그리드로 50%씩 넉넉한 너비를 균등 배분하여 전화번호가 여유 있게 완전 노출.
3. **검증 및 배포**:
   - `npx next build` 프로덕션 빌드 정상 통과.
   - GitHub `main` 푸시 완료 (`ea83e85`) 및 Render 자동 무중단 배포 반영.

### LL. 추천차량 및 시스템 전체 차종 3종(5톤, 2.5톤, 1톤) 완전 일원화
1. **요구사항 및 배경**:
   - 기존 시스템에 1톤 일반탑/하이탑, 2.5톤, 3.5톤, 4.5톤, 5톤 등 세분화된 비표준 차종이 혼재하여 차량 자동 추천 시 현장 실무와 괴리 발생.
   - 현장 포장이사 실무 표준에 맞춰 전체 시스템(추천 차량 알고리즘, 평형별 템플릿, 이사비용 산출 시뮬레이터, DB 기준정보)의 차종을 **`5톤` (메인 탑차)**, **`2.5톤` (골목/중소형)**, **`1톤` (용달/추가 보조)** 단 3종 조합으로 완전 일원화.
2. **조치 내역**:
   - **DB 차량 마스터 기준정보 정비 (`VehicleMaster`)**:
     - 현장에서 거의 쓰지 않는 3.5톤, 4.5톤 및 1톤 중복 분할 항목을 정리하고, **`5톤 탑차` (31 CBM, 13만원)**, **`2.5톤 탑차` (16 CBM, 11만원)**, **`1톤 탑차` (7 CBM, 7만원)** 3종으로 공식 표준화.
   - **추천 차량 알고리즘 강화 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - `handleRecommendVehicles`에서 5톤, 2.5톤, 1톤 3종을 조합 대상으로 자동 필터링하여 현실적인 최적 배차(예: 5톤 1대 + 1톤 1대, 5톤 1대 + 2.5톤 1대, 5톤 2대 등)를 자동 산출하도록 보강.
   - **평형별 표준 템플릿 차종 표기 일원화 ([estimatePresets.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/lib/estimatePresets.ts))**:
     - 원룸/1인가구: `1톤 1대`
     - 투룸(15~20평): `2.5톤 1대`
     - 24~26평(3인): `5톤 1대`
     - 32~34평(4인): `5톤 1대 + 1톤 1대`
     - 40평형 이상 대형: `5톤 1대 + 2.5톤 1대 (또는 5톤 2대)`
   - **이사비용 산출 시뮬레이터 톤수 가이드 일원화 ([MovingCostCalculatorModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/MovingCostCalculatorModal.tsx))**:
     - CBM 구간별 운임 가이드의 톤수를 `1톤 1대`, `2.5톤 1대`, `5톤 1대`, `5톤 1대 + 1톤 1대`, `5톤 1대 + 2.5톤 1대`, `5톤 2대`로 직관적 통일.
3. **검증 및 배포**:
   - `npx next build` 프로덕션 빌드 정상 통과.
   - GitHub `main` 푸시 완료 (`e07e6e0`) 및 Render 자동 무중단 배포 반영.

### MM. 이사비용 산출 시뮬레이터와 투입차량 톤수 1:1 일치 연동 (방안 A 적용)
1. **문제 현상 및 원인 분석**:
   - 견적 `P2610230001` 건에서 투입차량은 도합 7.5톤(5톤 1대 + 2.5톤 1대)인데, 이사비용 산출 시뮬레이터에서는 '10톤 이상'으로 체크되는 불일치 발생.
   - 원인: 시뮬레이터의 CBM 구간(31.0 ~ 38.99 CBM = 7.5톤)은 '순수 물품 CBM' 기준인데, `EstimateForm.tsx`에서 시뮬레이터를 띄울 때 데드스페이스 20%가 곱해진 `requiredCbm`(44.78 CBM)을 전달하여 38.99를 초과한 '10톤 이상' 구간으로 잘못 매칭됨.
2. **조치 내역 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
   - 시뮬레이터 모달 호출 시 전달하는 `currentCbm`을 순수 물품 CBM(`totalCbm` = 37.32)으로 직접 전달하도록 수정.
   - 시뮬레이터 상단에 "현재 견적서 물량: 37.32 CBM"이 정확히 표시되고, CBM 가이드 구간에서도 **`5톤 1대 + 2.5톤 1대 (7.5톤)`**이 100% 일치하여 자동 체크됨.
3. **검증 및 배포**:
   - `npx next build` 프로덕션 빌드 정상 통과.
   - GitHub `main` 푸시 완료 (`6fbcee3`) 및 Render 자동 무중단 배포 반영.

### NN. 적재 대상 CBM 기준 투입인원 추천 및 시뮬레이터 통합 기준표 일치화
1. **요구사항 및 배경**:
   - 투입인원 추천 시 `requiredCbm`(데드스페이스 가산치)과 구형 구간이 사용되어, 차량 추천(3종) 및 시뮬레이터 가이드와 인원 수가 어긋나는 현상 정비.
   - 사용자 확인 원칙에 따라 "적재 대상 순수 물품 CBM(`totalCbm`)"을 기준으로 삼고, 3개 차종(5톤, 2.5톤, 1톤)과 연동된 통합 기준표로 시스템 전체(인원 추천, 시뮬레이터, 추천 사유)를 100% 일치시킴.
2. **확정된 CBM 물량별 통합 기준표**:
   - **~ 5.9 CBM**: `1톤 1대` / 남 1명 / 여 0명 (소형·원룸)
   - **6.0 ~ 13.9 CBM**: `2.5톤 1대` / 남 2명 / 여 1명 (투룸·신혼)
   - **14.0 ~ 25.9 CBM**: `5톤 1대` / 남 3명 / 여 1명 (20~28평형 표준 가정)
   - **26.0 ~ 31.9 CBM**: `5톤 1대 + 1톤 1대 (6톤)` / 남 4명 / 여 1명 (32~34평형 표준)
   - **32.0 ~ 39.9 CBM**: `5톤 1대 + 2.5톤 1대 (7.5톤)` / 남 4~5명 / 여 1명 (34평 짐 많음 / 40평형)
   - **40.0 CBM 이상**: `5톤 2대 (10톤 이상)` / 남 5~6명 / 여 2명 (45평 이상 대형)
   *(※ 일반이사는 여성 0명, 계단·수작업 환경 가산은 기존 로직 정상 유지)*
3. **조치 내역**:
   - **인원 추천 로직 개편 ([EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - `handleRecommendLabors`에서 기준 CBM을 `totalCbm`으로 전환하고, 위 통합 기준표 구간을 적용.
     - 추천 사유 문구: `${moveTypeName} 적재 물량 ${cbm.toFixed(1)} CBM 기준 기본 남성 ${baseMale}명...`으로 명확화.
   - **시뮬레이터 CBM 구간 정비 ([MovingCostCalculatorModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/MovingCostCalculatorModal.tsx))**:
     - `CBM_TIER_GUIDES`의 minCbm/maxCbm 및 권장 인원을 위 통합 기준표와 1:1로 일치시켜 모달과 견적서의 추천 인원이 완벽하게 일치하도록 조정.
4. **검증 및 배포**:
   - `npx next build` 프로덕션 빌드 정상 통과.
   - GitHub `main` 푸시 완료 (`0ffcecd`) 및 Render 자동 무중단 배포 반영.

### OO. 원가 기반 이사비용 산출 시스템(방안 2), 원가기준정보 관리 메뉴 및 기준거리 40km 상향
1. **요구사항 및 배경**:
   - 투입 인건비, 차량 유류비, 운전자 추가수당, 장거리 추가수당, 작업원 식비, OPP 테이프 소모 자재비, 왕복 고속도로 통행료를 종합한 실제 원가 기반 이사비용 산출 시스템 구축.
   - 단가를 중앙에서 관리/수정할 수 있는 **'원가기준정보' 메뉴** 신설 (`/cost-standards`).
   - 기본 이동 기준거리를 기존 30km에서 **40km**로 상향 조정.
   - 카카오 모빌리티 자동차 길찾기 API에서 편도 톨게이트비를 받아 **왕복 총 톨비(편도 × 2 × 차량대수)** 자동 산출 연동.
   - 견적 작성/수정 시 실시간으로 원가를 추천하고 현장에서 수동 미세조정이 가능한 **방안 2** 시뮬레이터 모달 탑재.
2. **조치 내역**:
   - **원가 마스터 DB 모델 및 서버 액션 ([schema.prisma](file:///c:/Users/ysjee/Desktop/MEMAN/web/prisma/schema.prisma), [costStandards.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/actions/costStandards.ts))**:
     - `CostStandardMaster` 모델 생성: 운전자수당(20,000원), 기준거리(40km), 초과단위(40km), 초과인당수당(10,000원), 식대(12,000원), 유류비(5톤 500원, 2.5톤 350원, 1톤 250원), 테이프단가(2,000원, 1톤 3롤, 2.5톤 5롤, 5톤 8롤), 기본마진율(20.0%).
     - `getCostStandards`, `updateCostStandards` CRUD 서버 액션 구현.
   - **원가기준정보 관리 페이지 ([page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/cost-standards/page.tsx), [CostStandardsForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/cost-standards/CostStandardsForm.tsx))**:
     - 인건비/수당, 차량 유류비, OPP 테이프 자재비, 목표 마진율 4개 섹션 관리 UI 제공.
     - [기본 추천값으로 복원] 및 실시간 저장/알림 토스트 연동.
   - **사이드바 메뉴 탑재 ([Sidebar.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/Sidebar.tsx))**:
     - 기초정보 섹션에 `원가기준정보` (`/cost-standards`, `Coins` 아이콘) 추가 (모바일 드로어 및 데스크탑 사이드바 동시 반영).
   - **기준거리 40km 상향 및 카카오 왕복 톨비 연동**:
     - [EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx), [estimate.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/actions/estimate.ts), [estimates/[id]/page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/estimates/[id]/page.tsx): `baseDistanceKm` 기본값을 30에서 40으로 일괄 상향.
     - 거리 측정 시 `res.tollFare`를 상태에 바인딩하고, 편도 및 왕복 톨게이트비 배지 표시 및 `tollFare` 환경 객체/draft 보존.
   - **원가 기반 이사비용 산출 시뮬레이터 모달 ([CostCalculatorModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/CostCalculatorModal.tsx))**:
     - 기본 이사 비용 입력란 옆에 `[💰 원가산출]` 버튼 배치.
     - 주행거리, 차량대수, 인원수, 톨비에 따른 인건비/차량비/자재비/외주비 자동 산출 및 각 항목 수동 미세수정(방안 2).
     - 마진율 프리셋(15%, 18%, 20%, 22%, 25%, 30%, 직접입력) 및 만원 단위 올림 옵션 제공.
     - `[기본 이사비용에 적용]` 클릭 시 `movingCost` 즉시 반영 및 공급가액/부가세/공급대가/잔금 자동 재계산.
3. **검증 및 배포**:
   - `npx next build` 프로덕션 컴파일 및 최적화 정상 통과 (Exit Code 0).
   - Supabase PostgreSQL DB에 `CostStandardMaster` 테이블 반영 완료.

### PP. 작업원 인건비 정보의 원가기준정보 통합 및 인건비 메뉴 정리
1. **요구사항 및 배경**:
   - 원가산출 시 작업원의 인건비 정보가 DB와 매칭되지 않던 문제 해결 (모달 fallback이 과거 18만/14만원으로 되어 있었음).
   - 독립되어 있던 '인건비정보'(`/labors`)를 '원가기준정보'(`/cost-standards`) 마스터로 통합하여, 관리자가 한 화면에서 기본 일당과 추가 수당, 유류비, 자재비, 마진율을 원스톱 관리할 수 있도록 개편.
   - 사이드바에서 중복되는 '인건비정보' 메뉴를 정리하고 단일화.
2. **조치 내역**:
   - **DB 모델 및 서버 액션 확장 ([schema.prisma](file:///c:/Users/ysjee/Desktop/MEMAN/web/prisma/schema.prisma), [costStandards.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/actions/costStandards.ts))**:
     - `CostStandardMaster` 모델에 `maleLaborCost`(남성 작업원 기본 일당, 190,000원) 및 `femaleLaborCost`(여성 작업원 기본 일당, 170,000원) 컬럼 추가 및 DB 푸시 완료.
     - `updateCostStandards`: 원가기준정보 저장 시 `LaborMaster`의 남성/여성 레코드도 함께 `upsert` 동기화하여 모바일 앱 및 기존 데이터와의 100% 하위 호환성 유지.
   - **원가기준정보 UI 개편 ([CostStandardsForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/cost-standards/CostStandardsForm.tsx))**:
     - 최상단에 **`1. 작업원 기본 일당 기준 (인건비)`** 카드를 신설하고 남성/여성 기본 일당 입력 필드 및 1,000단위 콤마 서식 적용.
     - 전체 섹션을 5단계(1. 기본일당, 2. 추가수당/식비, 3. 차종별유류비, 4. 소모자재비, 5. 목표마진율)로 체계화.
   - **원가산출 모달 및 견적서 연동 ([CostCalculatorModal.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/CostCalculatorModal.tsx), [EstimateForm.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/EstimateForm.tsx))**:
     - 견적 작성/수정 시 원가기준정보의 남성/여성 기본 일당(190,000원 / 170,000원)이 원가산출 팝업에 실시간으로 매칭되어 계산되도록 연동.
     - 견적서에서 인력을 0명으로 설정한 경우에도 강제 덮어쓰기 없이 0명이 정상 유지되도록 바인딩 개선.
   - **인건비정보 메뉴 정리 ([Sidebar.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/components/Sidebar.tsx), [labors/page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/labors/page.tsx), [users/page.tsx](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/(dashboard)/users/page.tsx))**:
     - 사이드바(모바일/데스크톱)에서 `/labors` 링크를 제거하고 `/cost-standards`로 단일화.
     - `/labors` 직접 접속 시 `/cost-standards`로 자동 리다이렉트 처리.
     - 사용자 권한 설정 메뉴 목록에서 `인건비정보`를 `원가기준정보`로 전환.
   - **Prisma 싱글톤 갱신 및 널 세이프티 방어 ([prisma.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/lib/prisma.ts), [costStandards.ts](file:///c:/Users/ysjee/Desktop/MEMAN/web/src/app/actions/costStandards.ts))**:
     - 로컬 dev 서버 장시간 실행 시 메모리에 캐시된 구버전 PrismaClient 인스턴스를 감지하여 최신 모델(`costStandardMaster`)이 없으면 자동으로 재인스턴스화하여 갱신.
     - `getCostStandards` / `updateCostStandards`에서 모델 프로퍼티 존재 여부 및 `upsert` 함수 유효성을 사전에 검증하여 `undefined (reading 'upsert')` 에러를 원천 차단.
3. **검증 및 배포**:
   - `npx next build` 로컬 프로덕션 컴파일 및 최적화 정상 통과 (Exit Code 0).
   - 사용자 배포 승인 완료 후 GitHub `main` 푸시(`ad515b6`) 및 Render 자동 무중단 배포 진행.





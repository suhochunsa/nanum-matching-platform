# 인수인계 — 나눔 매칭 플랫폼 프론트엔드

Claude(Cowork)에서 계획서와 UI 스케치를 보고 프론트엔드 뼈대를 만든 뒤,
이후 개발은 Claude Code에서 이어가기로 해서 남기는 인수인계 문서입니다.

## 프로젝트 개요

- **프로젝트명**: 기부자·기관 프로필과 기부 크레딧을 기반으로 한 나눔 자동 매칭 플랫폼
- **문제**: 기부하고 싶은 사람은 어디에 기부해야 할지 모르고, 물자가 필요한 복지 기관은
  기부자를 찾기 어렵다.
- **핵심 기능**: 기부자가 물품 범주·상태·수량·사진을 입력 → 그 물품을 찾는 기관·기부 방법·
  예상 적립 크레딧을 보여줌. 기관이 필요 물품 범주·수량을 입력 → DB 내 조건에 맞는
  잔여 기부 물품을 보여줌.
- **원본 계획 문서**: `~/Desktop/정보과학 프로젝트/계획서(2414 정수호).hwpx`,
  `~/Desktop/정보과학 프로젝트/ui구상.pptx` (화면 스케치 원본)
- **전체 개발 순서(계획서 기준)**: ① 잘 동작하는 웹 프론트 완성 → ② Supabase DB 연동

## 지금까지 한 것 (Claude Cowork)

1. 계획서(hwpx)와 `ui구상.pptx`의 화면 스케치 3장(기부자 신청 UI / 기관 UI / 홈 화면·로그인)을
   확인
2. React(Vite) + Tailwind CSS v4 + react-router-dom으로 프론트엔드 스캐폴딩
3. 스케치를 그대로 반영한 4개 화면 구현 (아래 "화면 구성" 참고)
4. 더미 데이터 기반의 임시 매칭 로직 연결 (버튼 눌러서 결과 확인 가능한 상태)
5. `npm run build` 성공 확인, Playwright로 스크린샷 찍어 시각 검증 완료

## 기술 스택 / 결정 사항

- Vite + React 19, react-router-dom v7 (SPA 라우팅)
- Tailwind CSS v4 (`@tailwindcss/vite` 플러그인, `src/index.css`의 `@theme`에 브랜드 색상 정의)
- 색상: 어두운 청록색 계열(`brand-*`, UI 스케치의 남색 박스 색감 참고) + 주황색 강조색(`accent-*`)
- GitHub 저장소: https://github.com/suhochunsa/nanum-matching-platform (private, `main` 브랜치)
- 배포: https://nanum-matching-platform.vercel.app (Vercel Hobby, 프로젝트명 nanum-matching-platform)
  - `vercel.json`의 rewrites로 `/donor` 등을 새로고침해도 index.html로 연결됨
  - 현재는 CLI로 배포 (`vercel deploy --prod`). GitHub 자동 배포는 Vercel GitHub 앱에
    이 비공개 저장소 접근 권한을 준 뒤 `vercel git connect`로 연결해야 함
- 아직 Supabase 연동 없음 — 전부 `src/data/mockData.js`의 더미 데이터로 동작

## 화면 구성 (구현 완료, mock 데이터 기반)

| 경로 | 파일 | 설명 |
|---|---|---|
| `/` | `src/pages/HomePage.jsx` | 서비스 소개, 기부자/기관 진입 버튼, 기부 등록 물품·기관 필요 물품 카드 목록 |
| `/login` | `src/pages/LoginPage.jsx` | 개인(기부자)/기관 토글, 아이디·비밀번호 (제출 시 선택한 유형 화면으로 이동만 함) |
| `/donor` | `src/pages/DonorPage.jsx` | 기부자 정보(이름·연락처·지역) + 물품 정보(사진·이름·범주·수량·상태·상세 정보) + 가능한 전달 방법 입력 → 입력값 요약·매칭 결과·기관별 기부 방법·예상 크레딧 표시, DB 등록 |
| `/institution` | `src/pages/InstitutionPage.jsx` | 필요 물품(이름·범주·수량) + 기관 정보(기관명·위치·연락처·방문 가능 시간) + 받을 수 있는 방법 입력 → 입력값 요약·DB 내 일치 결과·물품별 수령 방법 표시, DB 등록 |

공통 레이아웃은 `src/components/Layout.jsx`(헤더/푸터), 카드 UI는
`src/components/ItemCard.jsx`. 폼 공통 부품은 `FormField.jsx`(라벨·오류 표시),
`formStyles.js`(입력칸 스타일), `InputSummary.jsx`(제출값 요약 카드),
`CategoryTree.jsx`(범주 트리 다중 선택), `MethodPicker.jsx`(전달 방법 다중 선택),
`GuideBox.jsx`(기부·수령 방법 안내), `RegisterButton.jsx`(DB 등록 버튼).

기부 방법·수령 방법 (5차시, `src/data/delivery.js`):
- 전달 방법 3가지: 직접 전달(dropoff) / 택배(parcel) / 방문 수거(pickup)
- 기부자는 "가능한 방법", 기관은 "받을 수 있는 방법"을 고르고, 둘 다 가능한 방법만 안내
- 기부자 화면: 매칭 항목의 "기부 방법 보기" → 기관 주소·방문 시간·연락처 등
- 기관 화면: "수령 방법 보기" → 기부자 지역 등 (기부자 연락처는 매칭 확정 후 공개 예정)
- 겹치는 방법이 없으면 그 사실과 상대가 가능한 방법을 안내
- 아직 매칭 점수에는 반영 안 함 (전달 방법이 안 맞아도 순위는 같음)

기부 가능 기간 (`src/data/dates.js`):
- 기부자 폼에서 "기부 가능 마감일"(오늘 이후) 또는 "기한 없음" 중 하나 필수 (유통기한 등)
- 저장값 `availableUntil`: 'YYYY-MM-DD' 또는 null(기한 없음). 마감일 당일까지 기부 가능
- 홈 카드: 지나면 빨간 테두리 + "기부 가능 기간 만료", 3일 이내면 주황 강조, 그 외 "~까지 · D-n"
- 기관 매칭 결과에서는 만료된 물품을 제외
- mock 데이터 마감일은 오늘 기준 상대 날짜(daysFromToday)라 언제 열어도 만료 3개·오늘 마감 1개가 보임

DB 등록 (`src/data/store.js`, 임시):
- 매칭 확인 후 "데이터베이스에 등록하기" → 제출했던 값을 저장, 한 결과당 한 번
- mock 데이터 + 이 브라우저 localStorage(`nanum-mock-db-v1`)에 추가한 항목을 합쳐서 돌려줌
- 등록한 항목은 홈 목록 맨 앞과 상대편 매칭 결과에 바로 나타남
- 다른 브라우저·기기에서는 안 보임. 7차시에 store.js의 함수만 Supabase로 바꾸면 됨
- 기부자 연락처는 저장 안 함
- 사진: 등록할 때 `src/data/image.js`로 긴 변 640px JPG(보통 50~150KB)로 줄여 data URL로 저장.
  홈 카드와 기관 매칭 결과에 썸네일로 보이고, 누르면 크게 보임(`PhotoThumb.jsx`).
  localStorage 용량(약 5MB) 때문에 사진 30~50장 정도가 한계 → 7차시에 Supabase Storage로 옮길 것

범주는 2단 트리(`src/data/categories.js`의 `CATEGORY_TREE`, 큰 범주 → 세부 범주)이고
여러 개를 고를 수 있음. 값은 `'의류/아우터'` 같은 문자열 배열(`categories`)로 다룸.
큰 범주 체크박스는 하위 전체 선택/해제, 일부만 고르면 '−'(indeterminate) 표시.

입력값 검사는 `src/data/validation.js` (3차시 "입력값 확인"):
- 필수: 이름·연락처·물품 이름·범주(1개 이상)·수량 (기관은 기관명·위치·연락처·필요 물품 이름·범주·수량)
- 연락처: 휴대폰/일반 전화 형식, 수량: 1~999 정수, 상세 정보: 300자 이하
- 사진: 선택, 이미지 파일만, 5MB 이하 (선택하면 미리보기 표시)
- 첫 제출 시도 이후부터 입력할 때마다 재검사, 제출 시 첫 오류 칸으로 포커스
- 요청일·등록일은 입력받지 않고 제출 시점 날짜로 자동 기록

## 지금은 가짜(mock)인 부분 — 다음 단계에서 교체할 곳

`src/data/mockData.js`에 전부 모여 있고, 각 폼 컴포넌트 안에 `TODO` 주석으로 표시해둠.

- `donorItems`, `institutionNeeds`, `institutions`(mockData.js): 실제로는 Supabase 테이블에서 조회해야 함.
  화면은 모두 `store.js`를 거쳐 읽으므로 store.js만 바꾸면 됨
- `matchDonorToInstitutions`, `matchInstitutionToDonors`(`src/data/matching.js`): 로직은
  4차시에 고도화 완료, 데이터 소스만 mock이라 Supabase 조회로 교체 필요
- 크레딧 계산(`CATEGORY_BASE_CREDIT`): 임시 값. 실제 정책 정하면 교체
- 로그인: 실제 인증 없음, 그냥 화면 전환만 함 (Supabase Auth 연동 필요)
- 이미지 업로드: 줄인 사진을 localStorage에 임시 저장 (Supabase Storage로 교체 필요)
- 폼 입력값 저장: localStorage 임시 저장만 됨 (각 페이지 `handleRegister`의 TODO, `store.js`)

## 매칭 점수 규칙 (4차시, `src/data/matching.js`)

점수(0~100) = 카테고리 35% + 이름 유사도 30% + 수량 충족률 20% + 상태 15%

- 카테고리(여러 개): 양쪽이 고른 세부 범주 각각에 대해 상대편에서 가장 잘 맞는 것을 찾아
  (같은 세부 범주 1 / 같은 큰 범주 0.5 / 그 외 0) 전부 평균. 많이 겹칠수록 높고,
  관계없는 범주를 많이 고르면 낮아짐. 0이어도 이름 유사도가 0.25 이상이면 후보에 포함
  (둘 다 아니면 결과에서 제외)
- 이름 유사도: 글자 2개 단위 Dice 계수와 단어 단위 일치(포함 관계 포함) 중 큰 값
- 수량 충족률: 공급 수량 ≥ 필요 수량이면 1, 모자라면 공급/필요 비율
- 상태: 새 상품 1 / 사용감 적음 0.7 / 사용감 있음 0.4 (기부 물품의 상태 기준)
- 결과는 점수 내림차순, 화면(`MatchList`)에서 상위 10개 + "더보기"(10개씩)
- 크레딧 계산은 아직 임시 규칙 그대로 (상태 미반영). 큰 범주를 여러 개 고르면 그중 가장 높은 기본 점수 사용
- 한계: "패딩" ↔ "외투"처럼 글자가 다른 동의어는 못 잡음 (동의어 사전 필요)

## Supabase 테이블 (6차시 준비, `supabase/`)

- `migrations/20261026000000_init.sql`: 테이블 6개 + 제약조건 + RLS
  - institutions, institution_needs, donors, donor_items, matches, credit_logs
  - 컬럼은 앱 값 형식과 같음 (범주·전달 방법은 text[], 마감일 date/null)
  - donor_items.donor_display에 가린 이름(정OO) 저장 → donors(연락처)는 공개하지 않음
  - RLS: 공개 키(anon)는 institutions·institution_needs·donor_items 읽기만 가능. 쓰기는 7차시에 정책 추가
- `seed.sql`: mockData.js와 같은 테스트 데이터 51행 (마감일은 current_date 기준 상대값)
- 둘 다 PGlite(로컬 Postgres)로 실행 검증 완료: 제약조건 위반 거부, anon 쓰기 거부 확인
- 적용 방법: Supabase 대시보드 SQL Editor에 init.sql → seed.sql 순서로 붙여넣어 실행

## Supabase 연결 (6차시)

- 프로젝트: https://ibozvofahtvozuzynkqe.supabase.co (리전 Seoul)
- 접속 정보: `.env.local`(로컬, git 제외)과 Vercel 환경변수(Production/Preview/Development)에
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. 변수 이름은 `.env.example` 참고
  (publishable 키는 공개용. secret 키·DB 비밀번호는 저장소·채팅에 두지 않음)
- `src/lib/supabase.js`: 클라이언트. `src/data/store.js`의 `loadData()`가 기관·필요 물품·기부 물품을 한 번에 불러옴
  - DB 행(snake_case) → 화면용 객체(mockData와 같은 필드)로 변환
  - 연결 실패(표 없음, 환경변수 없음 등) 시 mock 데이터로 대체하고 화면에 노란 안내(`DataNotice.jsx`) 표시
  - 이 브라우저에서 등록한 localStorage 항목을 앞에 합침 (쓰기는 7차시에 DB로)
- 매칭 함수는 `matchX(입력값, loadData() 결과)` 형태. 폼 제출 때마다 최신 데이터를 불러옴

## 로그인·프로필 (7차시, `supabase/migrations/20261026020000_auth_profiles.sql`)

- Supabase Auth 이메일+비밀번호. 로그인 화면에서 기부자/기관을 고르고 로그인·회원가입
  - 고른 역할과 계정 역할이 다르면 로그아웃시키고 안내
  - 이메일 인증이 켜져 있으면 가입 후 메일 링크를 눌러야 로그인 가능 (대시보드 설정)
- `profiles` 표: role, nickname(기부자), org_name(기관, 가입 후 변경 불가), avatar_url
  - 가입 시 user metadata로 트리거(handle_new_user)가 자동 생성. 누구나 읽기, 본인은 닉네임·사진만 수정
  - 프로필 사진: avatars 버킷 `<내 id>/<무작위>.jpg` (본인 폴더만 업로드, 256px로 줄여서)
- donor_items.owner_id, institutions.owner_id 추가 → 홈 카드 오른쪽 아래에 올린 사람(사진+이름)
  - 테스트 데이터는 주인이 없어 김OO/기관명 + 첫 글자 아이콘
- 등록 함수는 로그인한 계정만: 기부자 → register_donor_item, 기관 → register_institution_need
  - 기관명은 계정의 기관명을 DB가 사용. 내 기관이 있으면 위치·연락처 등을 새 값으로 갱신
  - 같은 이름의 주인 없는 테스트 기관은 위치·연락처가 같아야 내 계정에 연결
- 화면: `src/lib/AuthProvider.jsx`(로그인 상태), `authContext.js`(useAuth), 헤더는 로그인 버튼 하나 /
  로그인 시 역할 링크+프로필+로그아웃, `/profile`(사진·닉네임 변경)
- PGlite로 24가지 경우 검증 (역할·본인 확인, 남의 프로필·폴더 차단, 로그아웃 상태 쓰기 차단)

## 마이페이지 (`/mypage`, `supabase/migrations/20261028000000_mypage.sql`)

- 헤더의 내 프로필 사진을 누르면 열림. 탭 2개
  - 내 기부 물품(기부자) / 내 필요 물품(기관): 목록·통계, 수정(수량·마감일·상태 / 필요 수량·상태), 삭제(확인 후)
  - 프로필 수정: 프로필 사진, 닉네임(기부자), 기관 정보 위치·연락처·방문 시간·받는 방법(기관)
- 상태: 기부 물품 available(기부 가능)/donated(기부 완료), 필요 물품 open(모집 중)/fulfilled(모집 완료)
  - 홈 화면·매칭(loadData)은 기부 가능·모집 중인 것만 불러옴
- DB 권한: 표 단위 쓰기 권한을 회수하고, 주인에게만 정해진 칸 수정·삭제 허용 (RLS + 칼럼 GRANT)
  - 기부 물품을 지우면 트리거가 그 물품의 기부자 연락처(donors)도 삭제
  - 기관 연락처 형식 CHECK 추가
- PGlite로 22가지 경우 검증 (남의 물품·기관 수정/삭제 0행, 허용 안 된 칸 거부, 로그아웃 거부)
- `/profile`은 `/mypage`로 이동 (ProfilePage는 mypage/ProfileSettings로 옮김)

## 디자인 (DESIGN-mobbin.md 기반)

- 토큰은 `src/index.css`의 `@theme`: ink #141414, canvas #fff, canvas-soft #f3f3f3, field #f0f0f0,
  hairline #e0e0e0, accent #0066ff. 글꼴 Pretendard Variable(제목 650, 본문 450, 부제 300)
- 공통 스타일은 `src/components/ui.js`: `buttonClass(variant, size)`(전부 알약), `fieldClass`(테두리 없는 회색 칸,
  포커스 시 2px 잉크 링), `chipClass`, `pageTitleClass`
- 규칙: 그림자 없이 회색 단계·1px 옅은 테두리로 구분 / 카드 24px(rounded-3xl), 입력·사진 16px(rounded-2xl)
  / 파란 accent는 매칭 점수·마감 임박에만, 빨강은 만료·오류에만
- 떠 있는 알약 메뉴(sticky), 위가 둥근 잉크 푸터, 로고는 잉크 스쿼클(30%) '나'
- 홈: 큰 소개 문장 + 로그인 상태별 버튼, 현황 숫자 3개, 이용 방법 3단계,
  목록은 기부 물품/필요 물품 전환 + 큰 범주 필터 + 이름 검색 + 9개씩 더 보기

## 주의: 예전 마이그레이션을 다시 실행하지 말 것

- 2026-10-29: `20261026010000_register_functions.sql`이 다시 실행되어 등록 함수가 로그인 없는 옛 버전으로
  덮어써짐 → 로그인해도 주인 없이 "정OO"로 저장되는 문제. `20261029000000_restore_login_register.sql`로 복구
- 확인 방법: 로그아웃 상태로 `rpc/register_donor_item`을 부르면 "permission denied"가 나와야 정상

## 다음 단계 (계획서의 차시별 개발 계획 기준)

- [x] 1차시: GitHub 저장소 개설 — 완료 (suhochunsa/nanum-matching-platform, private)
- [x] 2차시: 메인 화면 뼈대 (완료 — HomePage)
- [x] 3차시: 기부자·기관 입력 폼 + 입력값 확인 (완료 — 계획서 입력 항목 전부 반영, validation.js)
- [x] 4차시: 매칭 처리 로직 고도화 — 완료 (`src/data/matching.js`, 아래 "매칭 점수 규칙" 참고)
- [x] 5차시: 결과 화면 — 기부 방법·수령 방법·DB 등록 버튼 완료 (mock + localStorage), Vercel 첫 배포 완료
- [ ] 6차시: Supabase 프로젝트 생성 및 연결
- [ ] 7차시: 기부자·기관·물품 정보 저장 기능
- [ ] 8차시: 저장 데이터 기반 매칭·크레딧 반영

## 실행 방법

```bash
npm install
npm run dev
```

## 참고

- `node_modules`는 OS별 네이티브 바인딩이 달라서 Cowork(리눅스)에서 설치한 걸 맥에서 못 씀.
  빌드 에러가 나면 `rm -rf node_modules && npm install`
- 프론트엔드 코드 위치: `~/Dev/정보과학 프로젝트 앱`
- 계획서·발표자료·탐구일지 원본: `~/Desktop/정보과학 프로젝트`

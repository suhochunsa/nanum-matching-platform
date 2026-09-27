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
- 아직 Supabase 연동 없음 — 전부 `src/data/mockData.js`의 더미 데이터로 동작

## 화면 구성 (구현 완료, mock 데이터 기반)

| 경로 | 파일 | 설명 |
|---|---|---|
| `/` | `src/pages/HomePage.jsx` | 서비스 소개, 기부자/기관 진입 버튼, 기부 등록 물품·기관 필요 물품 카드 목록 |
| `/login` | `src/pages/LoginPage.jsx` | 개인(기부자)/기관 토글, 아이디·비밀번호 (제출 시 선택한 유형 화면으로 이동만 함) |
| `/donor` | `src/pages/DonorPage.jsx` | 기부자 정보(이름·연락처) + 물품 정보(사진·이름·범주·수량·상태·상세 정보) 입력 → 입력값 요약·매칭 결과·예상 크레딧 표시 |
| `/institution` | `src/pages/InstitutionPage.jsx` | 필요 물품(이름·범주·수량) + 기관 정보(기관명·위치·연락처) 입력 → 입력값 요약·DB 내 일치 결과 표시 |

공통 레이아웃은 `src/components/Layout.jsx`(헤더/푸터), 카드 UI는
`src/components/ItemCard.jsx`. 폼 공통 부품은 `FormField.jsx`(라벨·오류 표시),
`formStyles.js`(입력칸 스타일), `InputSummary.jsx`(제출값 요약 카드).

입력값 검사는 `src/data/validation.js` (3차시 "입력값 확인"):
- 필수: 이름·연락처·물품 이름·수량 (기관은 기관명·위치·연락처·필요 물품 이름·수량)
- 연락처: 휴대폰/일반 전화 형식, 수량: 1~999 정수, 상세 정보: 300자 이하
- 사진: 선택, 이미지 파일만, 5MB 이하 (선택하면 미리보기 표시)
- 첫 제출 시도 이후부터 입력할 때마다 재검사, 제출 시 첫 오류 칸으로 포커스
- 요청일·등록일은 입력받지 않고 제출 시점 날짜로 자동 기록

## 지금은 가짜(mock)인 부분 — 다음 단계에서 교체할 곳

`src/data/mockData.js`에 전부 모여 있고, 각 폼 컴포넌트 안에 `TODO` 주석으로 표시해둠.

- `donorItems`, `institutionNeeds`: 실제로는 Supabase 테이블에서 조회해야 함
- `matchDonorToInstitutions`, `matchInstitutionToDonors`(`src/data/matching.js`): 로직은
  4차시에 고도화 완료, 데이터 소스만 mock이라 Supabase 조회로 교체 필요
- 크레딧 계산(`CATEGORY_BASE_CREDIT`): 임시 값. 실제 정책 정하면 교체
- 로그인: 실제 인증 없음, 그냥 화면 전환만 함 (Supabase Auth 연동 필요)
- 이미지 업로드: 선택·미리보기·검사까지만, 실제 업로드/저장은 안 됨 (Supabase Storage 필요)
- 폼 입력값: 검사 후 화면에만 표시, 저장 안 됨 (각 페이지 `handleSubmit`의 TODO)

## 매칭 점수 규칙 (4차시, `src/data/matching.js`)

점수(0~100) = 카테고리 35% + 이름 유사도 30% + 수량 충족률 20% + 상태 15%

- 카테고리: 같으면 1, 다르면 0. 다르더라도 이름 유사도가 0.25 이상이면 후보에 포함
  (둘 다 아니면 결과에서 제외)
- 이름 유사도: 글자 2개 단위 Dice 계수와 단어 단위 일치(포함 관계 포함) 중 큰 값
- 수량 충족률: 공급 수량 ≥ 필요 수량이면 1, 모자라면 공급/필요 비율
- 상태: 새 상품 1 / 사용감 적음 0.7 / 사용감 있음 0.4 (기부 물품의 상태 기준)
- 결과는 점수 내림차순, 화면(`MatchList`)에서 상위 10개 + "더보기"(10개씩)
- 크레딧 계산은 아직 임시 규칙 그대로 (상태 미반영)
- 한계: "패딩" ↔ "외투"처럼 글자가 다른 동의어는 못 잡음 (동의어 사전 필요)

## 다음 단계 (계획서의 차시별 개발 계획 기준)

- [x] 1차시: GitHub 저장소 개설 — 완료 (suhochunsa/nanum-matching-platform, private)
- [x] 2차시: 메인 화면 뼈대 (완료 — HomePage)
- [x] 3차시: 기부자·기관 입력 폼 + 입력값 확인 (완료 — 계획서 입력 항목 전부 반영, validation.js)
- [x] 4차시: 매칭 처리 로직 고도화 — 완료 (`src/data/matching.js`, 아래 "매칭 점수 규칙" 참고)
- [x] 5차시: 결과 화면 (완료, mock 기반) — **Vercel 첫 배포는 아직**
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

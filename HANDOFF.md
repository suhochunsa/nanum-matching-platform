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
| `/donor` | `src/pages/DonorPage.jsx` | 사진 업로드, 범주·수량·상태 입력 → 매칭 결과·예상 크레딧 표시 |
| `/institution` | `src/pages/InstitutionPage.jsx` | 필요 범주·수량·기관 정보 입력 → DB 내 일치 결과 표시 |

공통 레이아웃은 `src/components/Layout.jsx`(헤더/푸터), 카드 UI는
`src/components/ItemCard.jsx`.

## 지금은 가짜(mock)인 부분 — 다음 단계에서 교체할 곳

`src/data/mockData.js`에 전부 모여 있고, 각 폼 컴포넌트 안에 `TODO` 주석으로 표시해둠.

- `donorItems`, `institutionNeeds`: 실제로는 Supabase 테이블에서 조회해야 함
- `matchDonorToInstitutions`, `matchInstitutionToDonors`: 지금은 "카테고리 일치"만
  보는 단순 규칙. 계획서 4차시 목표대로 수량·상태 조건과 유사도 계산을 추가해야 함
- 크레딧 계산(`CATEGORY_BASE_CREDIT`): 임시 값. 실제 정책 정하면 교체
- 로그인: 실제 인증 없음, 그냥 화면 전환만 함 (Supabase Auth 연동 필요)
- 이미지 업로드: 파일 선택 UI만 있고 실제 업로드/저장은 안 됨

## 다음 단계 (계획서의 차시별 개발 계획 기준)

- [x] 1차시: GitHub 저장소 개설 — 완료 (suhochunsa/nanum-matching-platform, private)
- [x] 2차시: 메인 화면 뼈대 (완료 — HomePage)
- [x] 3차시: 기부자·기관 입력 폼 (완료 — DonorPage/InstitutionPage)
- [ ] 4차시: 매칭 처리 로직 고도화 (수량·상태 조건, 유사도 계산)
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

- 프론트엔드 코드 위치: `~/Dev/정보과학 프로젝트 앱`
- 계획서·발표자료·탐구일지 원본: `~/Desktop/정보과학 프로젝트`

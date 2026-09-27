# 나눔 매칭 플랫폼 (프론트엔드)

기부자·기관 프로필과 기부 크레딧을 기반으로 한 나눔 자동 매칭 플랫폼의 프론트엔드입니다.
계획서와 `ui구상.pptx`의 화면 스케치를 바탕으로 만들었습니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 터미널에 표시되는 주소(기본 http://localhost:5173)로 접속하세요.

## 화면 구성

- `/` 홈 화면 — 서비스 소개, 기부자/기관 진입 버튼, 기부 등록 물품·기관 필요 물품 목록
- `/login` 로그인 — 개인(기부자)/기관 선택, 아이디·비밀번호
- `/donor` 기부자 신청 — 사진·범주·수량·상태 입력 → 매칭 결과·예상 크레딧
- `/institution` 기관용 화면 — 필요 범주·수량·기관 정보 입력 → 데이터베이스 내 일치 결과

## 지금은 목업(mock) 상태예요

`src/data/mockData.js`에 있는 더미 데이터로 화면이 동작합니다. 실제 매칭 로직과
저장은 아직 없고, 계획서의 개발 순서를 그대로 따라갈 수 있게 표시해뒀어요.

- 4차시(완료): `src/data/matching.js`에서 카테고리·이름 유사도·수량·상태를 합산한
  점수로 순위를 매김 (자세한 규칙은 HANDOFF.md)
- 6~7차시: Supabase 프로젝트를 연결하고, `mockData.js`의 더미 배열을 실제
  테이블 조회/저장으로 교체 (폼의 `TODO` 주석에 표시해뒀어요)
- 8차시: 매칭 결과·크레딧 누적을 실제 데이터 기반으로 반영

## 폴더 구조

```
src/
  components/   Layout(공통 헤더/푸터), ItemCard(목록 카드), MatchList(매칭 결과·더보기)
  data/         mockData.js — 더미 데이터, matching.js — 매칭 점수 계산,
                categories.js — 범주 트리, validation.js — 입력값 검사
  pages/        HomePage, LoginPage, DonorPage, InstitutionPage
```

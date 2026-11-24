# 나눔 매칭 플랫폼

기부자·기관 프로필과 기부 크레딧을 기반으로, 남는 물건을 필요한 기관에 자동으로 연결하는 웹 서비스입니다.
기부자와 기관이 각자 물품 정보를 입력하면 범주·이름·수량·상태로 점수를 계산해 잘 맞는 상대를 찾아 주고,
매칭 요청 → 수락 → 물품 전달 → 양쪽 전달 완료까지 이어지면 기부자에게 크레딧이 적립됩니다.

배포 주소: https://nanum-matching-platform.vercel.app
(`main` 브랜치에 push하면 Vercel이 자동으로 다시 배포합니다.)

## 주요 기능

- **물품 자동 매칭**: 범주 일치(35%)·이름 유사도(30%)·수량(20%)·상태(15%)를 합한 점수로 순위를 매기고,
  기부자와 기관이 모두 가능한 전달 방법(직접 전달·택배·방문 수거)만 안내합니다. (`src/data/matching.js`)
- **매칭 요청과 전달 완료**: 한쪽이 요청하고 상대가 수락하면 매칭이 확정됩니다.
  물품을 전달한 뒤 기부자와 기관이 **둘 다** '전달 완료'를 눌러야 최종 완료되고 크레딧이 적립됩니다.
  최종 완료 전에는 어느 쪽이든 확정된 매칭을 취소할 수 있습니다.
- **기관의 직접 요청**: 기관 계정은 홈의 기부 물품 카드를 눌러 바로 매칭을 요청할 수 있습니다.
- **기부 크레딧**: 최종 완료된 기부마다 범주별 기본 점수 + 수량 × 10 크레딧이 기부자 계정에 쌓입니다.
- **식품 안전**: 식품은 소비기한·개봉 여부·보관 방법·라벨 사진·소비기한 표시 사진이 모두 있어야 하고,
  소비기한이 지난 식품은 매칭되지 않습니다. 소비기한이 식품 종류의 보통 기간보다 길면 경고를 띄웁니다.
- **개인정보 보호**: 기부자 연락처는 매칭이 확정된 뒤 상대 기관에게만, 마이페이지 요청함에서 보입니다.
- **종 알림**: 받은 요청, 내 전달 완료 차례, 상대의 수락·거절·취소·최종 완료를 상단 종 아이콘에 숫자로 알려 줍니다.
- **마이페이지**: 내 물품·필요 물품 관리(수정·삭제), 매칭 요청함, 크레딧 내역, 프로필 수정
- **계정**: 기부자/기관 회원가입·로그인, 비밀번호 찾기(재설정 메일)

## 화면 구성

| 주소 | 화면 |
| --- | --- |
| `/` | 홈: 서비스 소개, 기부 물품·기관 필요 물품 목록(검색·범주 필터), 물품 상세·직접 요청 |
| `/login` | 기부자/기관 로그인·회원가입, 비밀번호 찾기 |
| `/donor` | 기부자 신청: 물품 정보 입력 → 매칭 결과·기관별 기부 방법·예상 크레딧 → 등록 |
| `/institution` | 기관: 필요 물품·기관 정보 입력 → 일치하는 기부 물품·수령 방법 → 등록·매칭 요청 |
| `/mypage` | 내 물품 관리, 매칭 요청함(수락·거절·전달 완료·취소), 크레딧, 프로필 수정 |
| `/reset-password` | 재설정 메일의 링크로 들어와 새 비밀번호 정하기 |

## 기술 스택

- 화면: React 19, React Router 7, Vite, Tailwind CSS 4
- 데이터: Supabase(PostgreSQL, 로그인, 사진 저장소). 표마다 행 단위 보안(RLS)을 켜고,
  등록·매칭·전달 완료·크레딧 적립은 검사를 모두 마친 DB 함수로만 처리합니다.
- 테스트: Node 내장 테스트 + PGlite(브라우저·Node에서 도는 PostgreSQL)로 실제 마이그레이션을 실행해 검사
- 배포: Vercel

## 실행 방법

```bash
npm install
cp .env.example .env.local   # Supabase 대시보드 → Project Settings → API Keys의 값을 채운다
npm run dev
```

브라우저에서 터미널에 표시되는 주소(기본 http://localhost:5173)로 접속하세요.
`.env.local`이 없거나 DB에 연결하지 못하면 `src/data/mockData.js`의 예시 데이터를 보여주고,
화면 위에 그 사실을 알립니다(예시 물품은 등록·매칭 요청이 되지 않습니다).

## 검사

```bash
npm test        # 매칭·식품·알림 규칙과 DB 함수 테스트
npm run lint    # oxlint
npm run build   # 배포용 빌드
```

## 데이터베이스 변경 순서

`supabase/migrations/`의 SQL 파일을 이름(날짜) 순서대로 Supabase SQL Editor에서 실행합니다.

- **새 SQL을 먼저 실행한 뒤 화면을 배포**합니다. 화면이 먼저 올라가면 새 DB 함수가 없어 기능이 실패합니다.
- 이미 실행한 예전 파일을 다시 실행하지 마세요. 새 함수가 옛 버전으로 덮어써질 수 있습니다.
- `supabase/seed.sql`은 테스트용 기관·물품 데이터, `supabase/tests/matching_smoke.sql`은 운영 DB에서 돌려 볼 수 있는 점검 SQL입니다.

## 폴더 구조

```
src/
  pages/        HomePage, LoginPage, DonorPage, InstitutionPage, MyPage, ResetPasswordPage
  components/   Layout(헤더·푸터), NotificationBell(종 알림), ItemCard·ItemRequestDialog(홈 카드·상세),
                MatchList·MatchRequestAction(매칭 결과·요청), FoodFields·FoodNotice(식품 입력·안내),
                PhotoThumb(사진 썸네일·확대), mypage/(마이페이지 탭들)
  data/         matching.js(매칭 점수), food.js(식품 규칙), notifications.js(알림 규칙),
                validation.js(입력값 검사), categories.js(범주 트리), delivery.js(전달 방법 안내),
                dates.js(기한 계산), status.js(상태 이름), store.js(Supabase 읽기·쓰기), mockData.js(예시 데이터)
  lib/          supabase.js(접속), AuthProvider(로그인 상태), DashboardProvider(요청함 15초 갱신)
  hooks/        useMatchingDashboard(요청함 데이터)
supabase/
  migrations/   테이블·보안 정책·DB 함수 (날짜 순서대로 실행)
tests/          npm test로 실행하는 테스트
```

개발 기록과 규칙의 자세한 내용은 `HANDOFF.md`에 있습니다.

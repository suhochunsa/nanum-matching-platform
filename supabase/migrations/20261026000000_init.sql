-- 나눔 매칭 플랫폼 초기 테이블 (계획서 6차시)
-- 계획서 IPO 표의 "저장할 데이터"를 기준으로 만든다.
--   기부자 정보(이름·연락처·누적 크레딧)          → donors
--   기부 물품 정보(범주·상태·수량·사진·등록일·기부 여부·상세 정보) → donor_items
--   기관 정보(기관명·위치·연락처)                  → institutions
--   기관의 필요 물품 정보(범주·필요 수량·요청일)    → institution_needs
--   매칭 내역                                      → matches
--   크레딧 적립·변동 기록                          → credit_logs
-- 앱 코드(src/data/*.js)의 값 형식과 맞춘다:
--   범주 '큰/세부' 문자열 배열, 전달 방법 'dropoff' | 'parcel' | 'pickup' 배열, 날짜 'YYYY-MM-DD'

-- 기관 ---------------------------------------------------------------
create table public.institutions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 2 and 30),
  location    text not null check (char_length(location) between 2 and 60),
  phone       text not null,
  hours       text not null default '' check (char_length(hours) <= 40),
  methods     text[] not null
              check (cardinality(methods) >= 1 and methods <@ array['dropoff', 'parcel', 'pickup']),
  created_at  timestamptz not null default now()
);

-- 기관의 필요 물품 ---------------------------------------------------
create table public.institution_needs (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions (id) on delete cascade,
  title           text not null check (char_length(title) between 2 and 40),
  categories      text[] not null check (cardinality(categories) >= 1),
  quantity        integer not null check (quantity between 1 and 999),
  requested_at    date not null default current_date,
  status          text not null default 'open' check (status in ('open', 'fulfilled')),
  created_at      timestamptz not null default now()
);

-- 기부자 (연락처가 있으므로 공개 조회하지 않는다) ---------------------
create table public.donors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 20),
  phone       text not null,
  credits     integer not null default 0 check (credits >= 0),
  created_at  timestamptz not null default now()
);

-- 기부 물품 -----------------------------------------------------------
create table public.donor_items (
  id                uuid primary key default gen_random_uuid(),
  donor_id          uuid references public.donors (id) on delete cascade,
  -- 목록에 보여줄 가린 이름 (정수호 → 정OO). donors 표를 공개하지 않아도 목록을 보여줄 수 있게 따로 둔다.
  donor_display     text not null,
  title             text not null check (char_length(title) between 2 and 40),
  categories        text[] not null check (cardinality(categories) >= 1),
  quantity          integer not null check (quantity between 1 and 999),
  condition         text not null check (condition in ('새 상품', '사용감 적음', '사용감 있음')),
  detail            text not null default '' check (char_length(detail) <= 300),
  region            text not null check (char_length(region) between 2 and 30),
  methods           text[] not null
                    check (cardinality(methods) >= 1 and methods <@ array['dropoff', 'parcel', 'pickup']),
  -- 기부 가능 마감일. null이면 기한 없음. 이 날짜 당일까지 기부 가능.
  available_until   date,
  -- 사진 주소 (7차시에 Supabase Storage에 올린 뒤 그 주소를 넣는다)
  photo_url         text not null default '',
  -- 계획서의 "기부 여부": 등록됨 → 매칭됨 → 기부 완료
  status            text not null default 'available' check (status in ('available', 'matched', 'donated')),
  created_at        timestamptz not null default now()
);

-- 매칭 내역 (8차시) ---------------------------------------------------
create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  donor_item_id   uuid not null references public.donor_items (id) on delete cascade,
  need_id         uuid not null references public.institution_needs (id) on delete cascade,
  score           integer not null check (score between 0 and 100),
  method          text check (method in ('dropoff', 'parcel', 'pickup')),
  status          text not null default 'requested'
                  check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  created_at      timestamptz not null default now(),
  unique (donor_item_id, need_id)
);

-- 크레딧 적립·변동 기록 (8차시) ---------------------------------------
create table public.credit_logs (
  id          uuid primary key default gen_random_uuid(),
  donor_id    uuid not null references public.donors (id) on delete cascade,
  match_id    uuid references public.matches (id) on delete set null,
  amount      integer not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);

-- 자주 찾는 조건에 인덱스
create index institution_needs_institution_id_idx on public.institution_needs (institution_id);
create index donor_items_donor_id_idx on public.donor_items (donor_id);
create index donor_items_status_idx on public.donor_items (status);
create index matches_need_id_idx on public.matches (need_id);
create index credit_logs_donor_id_idx on public.credit_logs (donor_id);

-- 행 단위 보안(RLS) ----------------------------------------------------
-- 웹사이트의 공개 키(anon)로 접속하면 아래 정책이 허락한 것만 할 수 있다.
-- 6차시: 목록 화면에 필요한 3개 표만 "읽기"를 연다. 쓰기(등록)는 7차시에 로그인과 함께 연다.
alter table public.institutions      enable row level security;
alter table public.institution_needs enable row level security;
alter table public.donors            enable row level security;
alter table public.donor_items       enable row level security;
alter table public.matches           enable row level security;
alter table public.credit_logs       enable row level security;

create policy "누구나 기관 정보를 볼 수 있다"
  on public.institutions for select to anon, authenticated using (true);

create policy "누구나 기관 필요 물품을 볼 수 있다"
  on public.institution_needs for select to anon, authenticated using (true);

create policy "누구나 기부 물품을 볼 수 있다"
  on public.donor_items for select to anon, authenticated using (true);

-- donors, matches, credit_logs는 정책이 없으므로 공개 키로는 읽기·쓰기 모두 막혀 있다.

-- 로그인(Supabase Auth)과 프로필 (계획서 7차시)
-- - profiles: 계정마다 하나. 역할(기부자/기관), 기부자 닉네임, 기관명, 프로필 사진
--   회원가입 때 넘긴 정보(user metadata)로 트리거가 자동으로 만든다.
-- - 기부 물품·기관에 주인(owner_id)을 붙여서 홈 화면에 누가 올렸는지 보여준다.
-- - 등록 함수는 이제 로그인한 계정만 쓸 수 있다. (기부자 → 기부 물품, 기관 → 필요 물품)
-- - avatars 버킷: 각자 자기 폴더(사용자 id)에만 프로필 사진을 올릴 수 있다.

-- 프로필 ---------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('donor', 'institution')),
  nickname    text check (nickname is null or char_length(nickname) between 2 and 20),
  org_name    text unique check (org_name is null or char_length(org_name) between 2 and 30),
  -- 자기 폴더(avatars/<내 id>/...)에 올린 사진 주소만 허용
  avatar_url  text not null default ''
              check (avatar_url = '' or avatar_url ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/'
                                                       || id::text || '/[A-Za-z0-9-]+\.jpg$')),
  created_at  timestamptz not null default now(),
  -- 기부자는 닉네임, 기관은 기관명이 꼭 있어야 한다
  check ((role = 'donor' and nickname is not null) or (role = 'institution' and org_name is not null))
);

alter table public.profiles enable row level security;

-- 프로필에는 공개해도 되는 정보만 있다 (이메일·연락처는 여기 없음)
create policy "누구나 프로필을 볼 수 있다"
  on public.profiles for select to anon, authenticated using (true);

create policy "자기 프로필만 고칠 수 있다"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- 고칠 수 있는 칸은 닉네임과 프로필 사진뿐 (역할·기관명은 바꿀 수 없음)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (nickname, avatar_url) on public.profiles to authenticated;

-- 회원가입하면 프로필을 자동으로 만든다. 역할이 이상하거나 이름이 없으면 가입 자체가 실패한다.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, role, nickname, org_name)
  values (
    new.id,
    v_role,
    case when v_role = 'donor' then nullif(trim(new.raw_user_meta_data ->> 'nickname'), '') end,
    case when v_role = 'institution' then nullif(trim(new.raw_user_meta_data ->> 'org_name'), '') end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 주인 연결 -------------------------------------------------------------
-- 테스트 데이터(seed)는 주인이 없다(null). 화면에서는 donor_display(김OO)를 대신 보여준다.
alter table public.donor_items add column owner_id uuid references public.profiles (id) on delete set null;
alter table public.institutions add column owner_id uuid unique references public.profiles (id) on delete set null;
create index donor_items_owner_id_idx on public.donor_items (owner_id);

-- 등록 함수 (로그인 필요) ------------------------------------------------
drop function if exists public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text);
drop function if exists public.register_institution_need(text, text, text, text, text[], text, text[], integer);

-- 기부 물품 등록: 기부자 계정만. 이름·연락처는 기관 연락용으로 donors에 따로(비공개) 저장한다.
create function public.register_donor_item(
  p_donor_name      text,
  p_donor_phone     text,
  p_title           text,
  p_categories      text[],
  p_quantity        integer,
  p_condition       text,
  p_detail          text,
  p_region          text,
  p_methods         text[],
  p_available_until date,
  p_photo_url       text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_nickname text;
  v_donor_id uuid;
  v_item_id  uuid;
begin
  select nickname into v_nickname from public.profiles where id = v_uid and role = 'donor';
  if v_nickname is null then
    raise exception '기부자 계정으로 로그인해야 등록할 수 있어요.';
  end if;
  if p_donor_phone !~ '^0\d{1,2}-?\d{3,4}-?\d{4}$' then
    raise exception '연락처 형식이 올바르지 않아요.';
  end if;
  if cardinality(p_categories) > 20 then
    raise exception '범주를 너무 많이 골랐어요.';
  end if;
  if p_available_until is not null and p_available_until < current_date then
    raise exception '기부 가능 마감일이 이미 지났어요.';
  end if;
  if coalesce(p_photo_url, '') <> ''
     and p_photo_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/item-photos/[A-Za-z0-9-]+\.jpg$' then
    raise exception '사진 주소가 올바르지 않아요.';
  end if;

  insert into public.donors (name, phone)
  values (trim(p_donor_name), trim(p_donor_phone))
  returning id into v_donor_id;

  insert into public.donor_items
    (owner_id, donor_id, donor_display, title, categories, quantity, condition, detail, region, methods,
     available_until, photo_url)
  values
    (v_uid, v_donor_id, v_nickname, trim(p_title), p_categories, p_quantity, p_condition,
     trim(coalesce(p_detail, '')), trim(p_region), p_methods, p_available_until, coalesce(p_photo_url, ''))
  returning id into v_item_id;

  return v_item_id;
end;
$$;

-- 필요 물품 등록: 기관 계정만. 기관명은 가입할 때 정한 기관명을 쓴다.
-- - 이 계정의 기관이 이미 있으면 → 위치·연락처·방문 시간·받는 방법을 새 값으로 고치고 필요 물품 추가
-- - 같은 이름의 주인 없는 기관(테스트 데이터)이 있으면 → 위치·연락처가 같을 때만 이 계정에 연결
-- - 처음이면 → 기관을 새로 만든다
create function public.register_institution_need(
  p_location   text,
  p_phone      text,
  p_hours      text,
  p_methods    text[],
  p_title      text,
  p_categories text[],
  p_quantity   integer
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_org_name text;
  v_inst     public.institutions%rowtype;
  v_inst_id  uuid;
  v_need_id  uuid;
begin
  select org_name into v_org_name from public.profiles where id = v_uid and role = 'institution';
  if v_org_name is null then
    raise exception '기관 계정으로 로그인해야 등록할 수 있어요.';
  end if;
  if p_phone !~ '^0\d{1,2}-?\d{3,4}-?\d{4}$' then
    raise exception '연락처 형식이 올바르지 않아요.';
  end if;
  if cardinality(p_categories) > 20 then
    raise exception '범주를 너무 많이 골랐어요.';
  end if;

  select * into v_inst from public.institutions where owner_id = v_uid;
  if found then
    update public.institutions
    set location = trim(p_location), phone = trim(p_phone), hours = trim(coalesce(p_hours, '')), methods = p_methods
    where id = v_inst.id;
    v_inst_id := v_inst.id;
  else
    select * into v_inst from public.institutions where name = v_org_name;
    if found then
      if v_inst.owner_id is not null then
        raise exception '다른 계정이 이미 이 기관명을 쓰고 있어요.';
      end if;
      if v_inst.location <> trim(p_location) or v_inst.phone <> trim(p_phone) then
        raise exception '이미 등록된 기관이에요. 처음 등록된 위치·연락처와 똑같이 입력해야 이 계정에 연결돼요.';
      end if;
      update public.institutions
      set owner_id = v_uid, hours = trim(coalesce(p_hours, '')), methods = p_methods
      where id = v_inst.id;
      v_inst_id := v_inst.id;
    else
      insert into public.institutions (name, location, phone, hours, methods, owner_id)
      values (v_org_name, trim(p_location), trim(p_phone), trim(coalesce(p_hours, '')), p_methods, v_uid)
      returning id into v_inst_id;
    end if;
  end if;

  insert into public.institution_needs (institution_id, title, categories, quantity)
  values (v_inst_id, trim(p_title), p_categories, p_quantity)
  returning id into v_need_id;

  return v_need_id;
end;
$$;

revoke execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text) from public, anon;
revoke execute on function public.register_institution_need(text, text, text, text[], text, text[], integer) from public, anon;
grant execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text) to authenticated;
grant execute on function public.register_institution_need(text, text, text, text[], text, text[], integer) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 사진 저장소 -----------------------------------------------------------
-- 물품 사진 업로드도 로그인한 사람만
drop policy if exists "누구나 물품 사진을 올릴 수 있다" on storage.objects;
create policy "로그인하면 물품 사진을 올릴 수 있다"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and name ~ '^[A-Za-z0-9-]+\.jpg$');

-- 프로필 사진: 공개 버킷, JPG 512KB 이하, avatars/<내 id>/<무작위>.jpg 에만 올릴 수 있다
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg'])
on conflict (id) do nothing;

create policy "자기 폴더에만 프로필 사진을 올릴 수 있다"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]+/[A-Za-z0-9-]+\.jpg$'
  );

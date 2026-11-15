-- 식품 안전 규칙 (2026-11-17)
-- 식품(범주 '식품/...')은 소비기한·개봉 여부·보관 방법·라벨 사진을 받는다.
--  - 소비기한은 등록하는 날 이후여야 하고, 기부 가능 마감일은 소비기한보다 늦을 수 없다(자동으로 소비기한까지).
--  - 냉장·냉동 식품은 택배로 전달할 수 없다(직접 전달·방문 수거만).
--  - 한 번 입력한 식품 정보는 바꿀 수 없다(소비기한을 늘리는 것 방지). 정보가 없는 기존 식품은 한 번 채울 수 있다.
--  - 소비기한이 지났거나 식품 정보가 없는 식품은 매칭 요청·수락이 안 된다(matches 트리거).
-- 여러 번 실행해도 같은 결과가 되도록 작성했다.
begin;

alter table public.donor_items add column if not exists food_expiry date;
alter table public.donor_items add column if not exists food_opened boolean;
alter table public.donor_items add column if not exists food_storage text;
alter table public.donor_items add column if not exists food_label_url text not null default '';
alter table public.donor_items drop constraint if exists donor_items_food_storage_check;
alter table public.donor_items add constraint donor_items_food_storage_check
  check (food_storage is null or food_storage in ('room', 'fridge', 'frozen'));

create or replace function public.is_food(p_categories text[])
returns boolean language sql immutable set search_path = '' as $$
  select exists (select 1 from unnest(p_categories) c where c like '식품/%')
$$;

-- 식품 정보 검사 (등록·마이페이지 입력 모두 이 트리거를 거친다)
create or replace function public.check_food_info()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_first_fill boolean;
begin
  if not public.is_food(new.categories) then
    new.food_expiry := null; new.food_opened := null; new.food_storage := null; new.food_label_url := '';
    return new;
  end if;

  v_first_fill := new.food_expiry is not null and (tg_op = 'INSERT' or old.food_expiry is null);

  if tg_op = 'UPDATE' and old.food_expiry is not null and (
       new.food_expiry is distinct from old.food_expiry or new.food_opened is distinct from old.food_opened
       or new.food_storage is distinct from old.food_storage or new.food_label_url is distinct from old.food_label_url) then
    raise exception '한 번 입력한 식품 정보(소비기한·개봉 여부·보관 방법·라벨)는 바꿀 수 없어요.';
  end if;

  if v_first_fill then
    if new.food_expiry < v_today then raise exception '소비기한이 지난 식품은 등록할 수 없어요.'; end if;
    if new.food_opened is null then raise exception '식품은 개봉 여부를 골라야 해요.'; end if;
    if new.food_storage is null then raise exception '식품은 보관 방법을 골라야 해요.'; end if;
    if new.food_label_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/item-photos/[A-Za-z0-9-]+\.jpg$' then
      raise exception '식품 라벨 사진이 올바르지 않아요. 라벨 사진을 다시 올려 주세요.';
    end if;
    if new.food_storage in ('fridge', 'frozen') and 'parcel' = any(new.methods) then
      raise exception '냉장·냉동 식품은 택배로 보낼 수 없어요. 직접 전달이나 방문 수거만 골라 주세요.';
    end if;
    new.available_until := least(coalesce(new.available_until, new.food_expiry), new.food_expiry);
  elsif new.food_expiry is null and (new.food_opened is not null or new.food_storage is not null or new.food_label_url <> '') then
    raise exception '식품은 소비기한을 입력해야 해요.';
  end if;

  if new.food_expiry is not null and (new.available_until is null or new.available_until > new.food_expiry) then
    raise exception '식품의 기부 가능 마감일은 소비기한보다 늦을 수 없어요.';
  end if;
  return new;
end;
$$;
drop trigger if exists check_food_info on public.donor_items;
create trigger check_food_info before insert or update on public.donor_items
  for each row execute function public.check_food_info();

-- 소비기한이 지났거나 식품 정보가 없는 식품은 매칭 요청·수락(상태가 requested·confirmed로 바뀔 때) 불가
create or replace function public.block_unsafe_food_match()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_item public.donor_items%rowtype;
begin
  if new.status not in ('requested', 'confirmed') or (tg_op = 'UPDATE' and old.status = new.status) then
    return new;
  end if;
  select * into v_item from public.donor_items where id = new.donor_item_id;
  if found and public.is_food(v_item.categories) then
    if v_item.food_expiry is null then
      raise exception '소비기한·라벨 정보가 없는 식품은 매칭할 수 없어요. 기부자가 마이페이지에서 식품 정보를 먼저 입력해야 해요.';
    end if;
    if v_item.food_expiry < (now() at time zone 'Asia/Seoul')::date then
      raise exception '소비기한이 지난 식품은 매칭할 수 없어요.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists block_unsafe_food_match on public.matches;
create trigger block_unsafe_food_match before insert or update on public.matches
  for each row execute function public.block_unsafe_food_match();

-- 등록 함수: 식품 정보 매개변수 추가 (기존 11개 매개변수 버전은 삭제)
drop function if exists public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text);
drop function if exists public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text, date, boolean, text, text);
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
  p_photo_url       text,
  p_food_expiry     date    default null,
  p_food_opened     boolean default null,
  p_food_storage    text    default null,
  p_food_label_url  text    default null
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
  -- 식품은 소비기한·개봉 여부·보관 방법·라벨 사진이 모두 있어야 한다. (값 검사는 donor_items 트리거가 한다)
  if public.is_food(p_categories) then
    if p_food_expiry is null then raise exception '식품은 소비기한을 입력해야 해요.'; end if;
    if p_food_opened is null then raise exception '식품은 개봉 여부를 골라야 해요.'; end if;
    if p_food_storage is null then raise exception '식품은 보관 방법을 골라야 해요.'; end if;
    if coalesce(p_food_label_url, '') = '' then raise exception '식품은 라벨 사진을 올려야 해요.'; end if;
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
     available_until, photo_url, food_expiry, food_opened, food_storage, food_label_url)
  values
    (v_uid, v_donor_id, v_nickname, trim(p_title), p_categories, p_quantity, p_condition,
     trim(coalesce(p_detail, '')), trim(p_region), p_methods, p_available_until, coalesce(p_photo_url, ''),
     case when public.is_food(p_categories) then p_food_expiry end,
     case when public.is_food(p_categories) then p_food_opened end,
     case when public.is_food(p_categories) then p_food_storage end,
     case when public.is_food(p_categories) then coalesce(p_food_label_url, '') else '' end)
  returning id into v_item_id;

  return v_item_id;
end;
$$;

revoke execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text, date, boolean, text, text) from public, anon;
grant execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text, date, boolean, text, text) to authenticated;
revoke execute on function public.check_food_info() from public, anon, authenticated;
revoke execute on function public.block_unsafe_food_match() from public, anon, authenticated;

-- 기존 식품에 정보를 한 번 채울 수 있게 (주인만, RLS 정책은 기존 '자기 기부 물품만 고칠 수 있다')
grant update (food_expiry, food_opened, food_storage, food_label_url) on public.donor_items to authenticated;
commit;

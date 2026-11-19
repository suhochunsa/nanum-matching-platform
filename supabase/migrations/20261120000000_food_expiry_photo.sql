-- 식품 소비기한 표시 사진 (2026-11-20)
-- 소비기한을 비정상적으로 길게 입력하는 것에 대비해:
--  - 식품은 날짜가 찍힌 부분을 가까이 찍은 '소비기한 표시 사진'이 필수 (기관이 입력값과 대조)
--  - 긴 소비기한 자체는 막지 않는다 (설탕·소금처럼 원래 오래가는 식품). 화면에서 식품 종류별로 경고만 한다
--  - 소비기한 표시 사진이 없는 식품은 매칭 불가, 한 번 올린 사진은 바꿀 수 없음
-- 여러 번 실행해도 같은 결과가 된다.
begin;

alter table public.donor_items add column if not exists food_expiry_photo_url text not null default '';

create or replace function public.check_food_info()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_first_fill boolean;
begin
  if not public.is_food(new.categories) then
    new.food_expiry := null; new.food_opened := null; new.food_storage := null; new.food_label_url := '';
    new.food_expiry_photo_url := '';
    return new;
  end if;

  v_first_fill := new.food_expiry is not null and (tg_op = 'INSERT' or old.food_expiry is null);

  if tg_op = 'UPDATE' and old.food_expiry is not null and (
       new.food_expiry is distinct from old.food_expiry or new.food_opened is distinct from old.food_opened
       or new.food_storage is distinct from old.food_storage or new.food_label_url is distinct from old.food_label_url
       or new.food_expiry_photo_url is distinct from old.food_expiry_photo_url) then
    raise exception '한 번 입력한 식품 정보(소비기한·개봉 여부·보관 방법·라벨·소비기한 사진)는 바꿀 수 없어요.';
  end if;

  if v_first_fill then
    if new.food_expiry < v_today then raise exception '소비기한이 지난 식품은 등록할 수 없어요.'; end if;
    if new.food_opened is null then raise exception '식품은 개봉 여부를 골라야 해요.'; end if;
    if new.food_storage is null then raise exception '식품은 보관 방법을 골라야 해요.'; end if;
    if new.food_label_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/item-photos/[A-Za-z0-9-]+\.jpg$' then
      raise exception '식품 라벨 사진이 올바르지 않아요. 라벨 사진을 다시 올려 주세요.';
    end if;
    -- 소비기한 확인용: 날짜가 찍힌 부분을 가까이 찍은 사진
    if new.food_expiry_photo_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/item-photos/[A-Za-z0-9-]+\.jpg$' then
      raise exception '소비기한이 찍힌 부분의 사진을 올려 주세요.';
    end if;
    new.available_until := least(coalesce(new.available_until, new.food_expiry), new.food_expiry);
  elsif new.food_expiry is null and (new.food_opened is not null or new.food_storage is not null or new.food_label_url <> ''
        or new.food_expiry_photo_url <> '') then
    raise exception '식품은 소비기한을 입력해야 해요.';
  end if;

  if new.food_expiry is not null and (new.available_until is null or new.available_until > new.food_expiry) then
    raise exception '식품의 기부 가능 마감일은 소비기한보다 늦을 수 없어요.';
  end if;
  return new;
end;
$$;

create or replace function public.block_unsafe_food_match()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_item public.donor_items%rowtype;
begin
  if new.status not in ('requested', 'confirmed') or (tg_op = 'UPDATE' and old.status = new.status) then
    return new;
  end if;
  select * into v_item from public.donor_items where id = new.donor_item_id;
  if found and public.is_food(v_item.categories) then
    if v_item.food_expiry is null or v_item.food_expiry_photo_url = '' then
      raise exception '소비기한·라벨 정보가 없는 식품은 매칭할 수 없어요. 기부자가 마이페이지에서 식품 정보를 먼저 입력해야 해요.';
    end if;
    if v_item.food_expiry < (now() at time zone 'Asia/Seoul')::date then
      raise exception '소비기한이 지난 식품은 매칭할 수 없어요.';
    end if;
  end if;
  return new;
end;
$$;

drop function if exists public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text, date, boolean, text, text);
drop function if exists public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text, date, boolean, text, text, text);
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
  p_food_label_url  text    default null,
  p_food_expiry_photo_url text default null
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
    if coalesce(p_food_expiry_photo_url, '') = '' then raise exception '식품은 소비기한이 찍힌 부분의 사진을 올려야 해요.'; end if;
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
     available_until, photo_url, food_expiry, food_opened, food_storage, food_label_url, food_expiry_photo_url)
  values
    (v_uid, v_donor_id, v_nickname, trim(p_title), p_categories, p_quantity, p_condition,
     trim(coalesce(p_detail, '')), trim(p_region), p_methods, p_available_until, coalesce(p_photo_url, ''),
     case when public.is_food(p_categories) then p_food_expiry end,
     case when public.is_food(p_categories) then p_food_opened end,
     case when public.is_food(p_categories) then p_food_storage end,
     case when public.is_food(p_categories) then coalesce(p_food_label_url, '') else '' end,
     case when public.is_food(p_categories) then coalesce(p_food_expiry_photo_url, '') else '' end)
  returning id into v_item_id;

  return v_item_id;
end;
$$;

revoke execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text, date, boolean, text, text, text) from public, anon;
grant execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text, date, boolean, text, text, text) to authenticated;
revoke execute on function public.check_food_info() from public, anon, authenticated;
revoke execute on function public.block_unsafe_food_match() from public, anon, authenticated;
grant update (food_expiry_photo_url) on public.donor_items to authenticated;
commit;

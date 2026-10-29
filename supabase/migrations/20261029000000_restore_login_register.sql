-- 로그인 버전 등록 함수 되돌리기 (2026-10-29)
-- 증상: 로그인한 기부자가 등록해도 주인 없이(owner_id null) "정OO"로 저장되고 마이페이지에 안 보임.
-- 원인: 이전 단계 SQL(20261026010000_register_functions.sql)이 다시 실행되어
--       register_donor_item이 로그인 확인이 없는 옛 버전으로 덮어써지고,
--       기관명을 받는 옛 register_institution_need(8개 인자)가 다시 생기고,
--       누구나 물품 사진을 올릴 수 있는 정책이 다시 생김.
-- 이 파일은 여러 번 실행해도 결과가 같다.

-- 1) 기부 등록 함수를 로그인 버전으로 (20261026020000_auth_profiles.sql과 같은 내용)
create or replace function public.register_donor_item(
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

-- 2) 로그인 없이 기관명을 받는 옛 기관 등록 함수 삭제 (로그인 버전은 7개 인자로 따로 있음)
drop function if exists public.register_institution_need(text, text, text, text, text[], text, text[], integer);

-- 3) 실행 권한: 로그인한 사람만
revoke execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text) from public, anon;
grant execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text) to authenticated;
revoke execute on function public.register_institution_need(text, text, text, text[], text, text[], integer) from public, anon;
grant execute on function public.register_institution_need(text, text, text, text[], text, text[], integer) to authenticated;

-- 4) 물품 사진 업로드도 로그인한 사람만
drop policy if exists "누구나 물품 사진을 올릴 수 있다" on storage.objects;
drop policy if exists "로그인하면 물품 사진을 올릴 수 있다" on storage.objects;
create policy "로그인하면 물품 사진을 올릴 수 있다"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and name ~ '^[A-Za-z0-9-]+\.jpg$');

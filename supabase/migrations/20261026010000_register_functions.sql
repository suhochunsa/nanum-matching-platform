-- 등록 기능을 localStorage에서 DB로 옮긴다. (기부 물품·필요 물품 등록, 사진 저장)
--
-- 왜 함수로 쓰나?
--   아직 로그인이 없어서 공개 키(anon)로 쓰기를 열어야 한다. 표에 직접 쓰기를 열면
--   다른 사람의 기관 정보를 덮어쓰는 등 아무 값이나 넣을 수 있다.
--   그래서 표는 계속 닫아두고, 입력을 검사하는 함수 두 개만 공개한다. (SECURITY DEFINER = 함수 주인 권한으로 실행)
--   함수 안의 작업은 한 트랜잭션이라 중간에 실패하면 전부 취소된다.
-- TODO(로그인 도입 시): 함수에서 auth.uid()로 등록한 사람을 기록하고, 수정·삭제 정책을 추가한다.

-- 한국 서비스이므로 current_date 등 날짜 계산을 한국 시간 기준으로 한다.
-- (기본값 UTC면 오전 9시 전에는 날짜가 하루 전으로 계산된다)
alter database postgres set timezone to 'Asia/Seoul';

-- 기부 물품 등록 -------------------------------------------------------
-- 기부자 정보(이름·연락처)는 donors에, 물품은 donor_items에 넣는다.
-- 로그인이 없어서 같은 사람이 여러 번 등록하면 donors 행도 여러 개 생긴다.
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
  v_donor_id uuid;
  v_item_id  uuid;
begin
  if p_donor_phone !~ '^0\d{1,2}-?\d{3,4}-?\d{4}$' then
    raise exception '연락처 형식이 올바르지 않아요.';
  end if;
  if cardinality(p_categories) > 20 then
    raise exception '범주를 너무 많이 골랐어요.';
  end if;
  if p_available_until is not null and p_available_until < current_date then
    raise exception '기부 가능 마감일이 이미 지났어요.';
  end if;
  -- 사진은 이 프로젝트 Storage의 item-photos 버킷 주소만 허용 (다른 사이트 이미지 주소 차단)
  if coalesce(p_photo_url, '') <> ''
     and p_photo_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/item-photos/[A-Za-z0-9-]+\.jpg$' then
    raise exception '사진 주소가 올바르지 않아요.';
  end if;

  insert into public.donors (name, phone)
  values (trim(p_donor_name), trim(p_donor_phone))
  returning id into v_donor_id;

  insert into public.donor_items
    (donor_id, donor_display, title, categories, quantity, condition, detail, region, methods, available_until, photo_url)
  values
    (v_donor_id, left(trim(p_donor_name), 1) || 'OO', trim(p_title), p_categories, p_quantity, p_condition,
     trim(coalesce(p_detail, '')), trim(p_region), p_methods, p_available_until, coalesce(p_photo_url, ''))
  returning id into v_item_id;

  return v_item_id;
end;
$$;

-- 기관 필요 물품 등록 ---------------------------------------------------
-- 처음 보는 기관명이면 기관을 새로 만든다.
-- 이미 있는 기관명이면, 위치·연락처가 등록된 것과 같을 때만 그 기관에 필요 물품을 추가한다.
-- (로그인 전이라 기관 정보 수정은 막는다. 막지 않으면 남의 기관 주소를 바꿔 기부 물품을 가로챌 수 있다)
create or replace function public.register_institution_need(
  p_org_name   text,
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
  v_inst    public.institutions%rowtype;
  v_inst_id uuid;
  v_need_id uuid;
begin
  if p_phone !~ '^0\d{1,2}-?\d{3,4}-?\d{4}$' then
    raise exception '연락처 형식이 올바르지 않아요.';
  end if;
  if cardinality(p_categories) > 20 then
    raise exception '범주를 너무 많이 골랐어요.';
  end if;

  select * into v_inst from public.institutions where name = trim(p_org_name);
  if found then
    if v_inst.location <> trim(p_location) or v_inst.phone <> trim(p_phone) then
      raise exception '이미 등록된 기관명이에요. 같은 기관이라면 처음 등록한 위치·연락처와 똑같이 입력해 주세요.';
    end if;
    v_inst_id := v_inst.id;
  else
    insert into public.institutions (name, location, phone, hours, methods)
    values (trim(p_org_name), trim(p_location), trim(p_phone), trim(coalesce(p_hours, '')), p_methods)
    returning id into v_inst_id;
  end if;

  insert into public.institution_needs (institution_id, title, categories, quantity)
  values (v_inst_id, trim(p_title), p_categories, p_quantity)
  returning id into v_need_id;

  return v_need_id;
end;
$$;

-- 함수는 기본으로 모두(PUBLIC)가 실행할 수 있으므로 권한을 정리한다.
revoke execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text) from public;
revoke execute on function public.register_institution_need(text, text, text, text, text[], text, text[], integer) from public;
grant execute on function public.register_donor_item(text, text, text, text[], integer, text, text, text, text[], date, text) to anon, authenticated;
grant execute on function public.register_institution_need(text, text, text, text, text[], text, text[], integer) to anon, authenticated;

-- 사진 저장소 ----------------------------------------------------------
-- 공개 버킷: 사진 주소만 알면 누구나 볼 수 있다. 앱이 줄인 JPG(보통 50~150KB)만 받도록 1MB·JPG로 제한.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

-- 업로드만 허용 (덮어쓰기·삭제는 불가). 파일 이름은 앱이 만든 무작위 ID.jpg
create policy "누구나 물품 사진을 올릴 수 있다"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'item-photos' and name ~ '^[A-Za-z0-9-]+\.jpg$');

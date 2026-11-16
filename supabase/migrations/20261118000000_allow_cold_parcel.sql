-- 냉장·냉동 식품도 택배로 보낼 수 있게 (2026-11-18)
-- 식품 검사 트리거에서 '냉장·냉동 + 택배' 금지만 뺀다. 나머지 식품 규칙은 그대로.
-- 여러 번 실행해도 같은 결과가 된다.
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

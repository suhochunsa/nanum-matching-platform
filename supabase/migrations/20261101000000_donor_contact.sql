-- 저장된 내 필요 물품과 실제로 매칭되는 기부 물품의 전화번호만 기관에 제공한다.
begin;

-- matching.js의 이름 매칭: 글자 2개 Dice 계수 / 단어 포함 일치도 중 큰 값.
create or replace function public.donor_contact_name_similarity(a text, b text)
returns double precision
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select regexp_replace(lower(coalesce(a, '')), '[^[:alnum:]]', '', 'g') na,
           regexp_replace(lower(coalesce(b, '')), '[^[:alnum:]]', '', 'g') nb
  ), ga as (
    select substr(na, g, 2) gram, count(*) n
    from normalized cross join generate_series(1, length(na) - 1) g group by gram
  ), gb as (
    select substr(nb, g, 2) gram, count(*) n
    from normalized cross join generate_series(1, length(nb) - 1) g group by gram
  ), ta as (
    select token from regexp_split_to_table(lower(coalesce(a, '')), '[^[:alnum:]]+') token where token <> ''
  ), tb as (
    select token from regexp_split_to_table(lower(coalesce(b, '')), '[^[:alnum:]]+') token where token <> ''
  ), token_hits as (
    select count(*) n from ta where exists (
      select 1 from tb where ta.token = tb.token or
      (length(ta.token) >= 2 and length(tb.token) >= 2 and (strpos(ta.token, tb.token) > 0 or strpos(tb.token, ta.token) > 0))
    )
    union all
    select count(*) n from tb where exists (
      select 1 from ta where ta.token = tb.token or
      (length(ta.token) >= 2 and length(tb.token) >= 2 and (strpos(ta.token, tb.token) > 0 or strpos(tb.token, ta.token) > 0))
    )
  )
  select case when na = '' or nb = '' then 0 when na = nb then 1 else greatest(
    case when length(na) < 2 or length(nb) < 2 then 0 else
      2.0 * coalesce((select sum(least(ga.n, gb.n)) from ga join gb using (gram)), 0) / (length(na) + length(nb) - 2)
    end,
    coalesce((select sum(n) from token_hits)::double precision /
      nullif((select count(*) from ta) + (select count(*) from tb), 0), 0)
  ) end from normalized;
$$;
revoke execute on function public.donor_contact_name_similarity(text, text) from public, anon, authenticated;

create or replace function public.get_donor_contact(p_item_id uuid, p_need_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_need public.institution_needs%rowtype;
  v_item public.donor_items%rowtype;
  v_phone text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'institution') then
    raise exception '기관 계정으로 로그인해야 연락처를 볼 수 있어요.';
  end if;

  select n.* into v_need
  from public.institution_needs n
  join public.institutions org on org.id = n.institution_id
  where n.id = p_need_id and n.status = 'open' and org.owner_id = auth.uid();
  if not found then
    raise exception '내 기관이 등록한 모집 중인 필요 물품만 연락처를 조회할 수 있어요.';
  end if;

  select * into v_item from public.donor_items
  where id = p_item_id and status = 'available'
    and (available_until is null or available_until >= (current_timestamp at time zone 'Asia/Seoul')::date);
  if not found then return null; end if;

  -- 카테고리가 전혀 겹치지 않으면 이름 유사도 0.25 이상이어야 후보이다.
  if not exists (
    select 1 from unnest(v_need.categories) nc cross join unnest(v_item.categories) ic
    where split_part(nc, '/', 1) = split_part(ic, '/', 1)
  ) and public.donor_contact_name_similarity(v_need.title, v_item.title) < 0.25 then
    return null;
  end if;

  select phone into v_phone from public.donors where id = v_item.donor_id;
  return v_phone;
end;
$$;
revoke execute on function public.get_donor_contact(uuid, uuid) from public, anon;
grant execute on function public.get_donor_contact(uuid, uuid) to authenticated;

commit;

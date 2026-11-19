-- 기관이 기부 물품을 직접 요청 (2026-11-19)
-- 매칭(matches)은 항상 기관의 필요 물품(institution_needs)에 연결된다.
-- 기관이 홈에서 물품을 직접 요청하면, 그 물품과 같은 내용의 '직접 요청용 필요 물품'을 만들어 연결한다.
--   - direct_item_id가 있는 필요 물품은 화면 목록(홈·매칭 결과·마이페이지)에서 숨긴다.
--   - 같은 기관이 같은 물품을 다시 요청하면 그 필요 물품을 다시 쓴다(거절·취소 후 재요청 가능).
-- 여러 번 실행해도 같은 결과가 된다.
begin;

alter table public.institution_needs
  add column if not exists direct_item_id uuid references public.donor_items(id) on delete cascade;
create unique index if not exists institution_needs_direct_unique
  on public.institution_needs(institution_id, direct_item_id) where direct_item_id is not null;

create or replace function public.request_item_direct(p_item_id uuid, p_method text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org public.institutions%rowtype;
  v_item public.donor_items%rowtype;
  v_need_id uuid;
begin
  if v_uid is null then raise exception '로그인해야 매칭을 요청할 수 있어요.'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'institution') then
    raise exception '기관 계정만 물품을 직접 요청할 수 있어요.';
  end if;
  select * into v_org from public.institutions where owner_id = v_uid;
  if not found then
    raise exception '기관 정보(위치·연락처·받는 방법)가 아직 없어요. 필요 물품 등록 화면에서 기관 정보를 한 번 입력해 주세요.';
  end if;
  select * into v_item from public.donor_items where id = p_item_id;
  if not found then raise exception '기부 물품을 찾지 못했어요.'; end if;

  -- 이 기관이 이 물품을 위해 만든 필요 물품이 있으면 다시 쓰고, 수량은 지금 물품 수량에 맞춘다.
  select id into v_need_id from public.institution_needs
    where institution_id = v_org.id and direct_item_id = p_item_id;
  if found then
    update public.institution_needs set quantity = v_item.quantity, title = v_item.title, categories = v_item.categories
      where id = v_need_id and status = 'open';
  else
    insert into public.institution_needs (institution_id, title, categories, quantity, direct_item_id)
      values (v_org.id, v_item.title, v_item.categories, v_item.quantity, p_item_id)
      returning id into v_need_id;
  end if;

  -- 나머지 검사(소유자·상태·기간·식품 안전·전달 방법)와 요청 생성은 기존 함수가 한다.
  -- 여기서 오류가 나면 위에서 만든 필요 물품도 함께 취소된다.
  return public.request_item_match(p_item_id, v_need_id, p_method);
end;
$$;

create or replace function public.get_my_matching_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception '로그인해야 요청함을 볼 수 있어요.'; end if;
  select jsonb_build_object(
    'requests', coalesce((select jsonb_agg(r order by r.created_at desc) from (
      select m.id,m.status,m.created_at,m.responded_at,m.completed_at,m.quantity,m.method,m.score,m.credit_amount,
        m.requester_id,m.recipient_id,(m.recipient_id=v_uid) incoming,i.title item_title,n.title need_title,(n.direct_item_id is not null) need_direct,
        case when v_uid=i.owner_id then 'donor' else 'institution' end my_side,
        (m.donor_done_at is not null) donor_done,(m.institution_done_at is not null) institution_done,
        coalesce(other.org_name,other.nickname,'탈퇴한 계정') other_name,
        case when m.status in ('confirmed','completed') then case when v_uid=i.owner_id then org.phone else d.phone end else null end contact_phone
      from public.matches m join public.donor_items i on i.id=m.donor_item_id
      join public.institution_needs n on n.id=m.need_id join public.institutions org on org.id=n.institution_id
      left join public.donors d on d.id=i.donor_id
      left join public.profiles other on other.id=case when m.requester_id=v_uid then m.recipient_id else m.requester_id end
      where m.requester_id=v_uid or m.recipient_id=v_uid
    ) r),'[]'::jsonb),
    'creditTotal',coalesce((select sum(amount) from public.matching_credit_entries where user_id=v_uid),0),
    'creditEntries',coalesce((select jsonb_agg(c order by c.created_at desc) from (
      select id,amount,item_title,created_at from public.matching_credit_entries where user_id=v_uid
    ) c),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.request_item_direct(uuid, text) from public, anon;
grant execute on function public.request_item_direct(uuid, text) to authenticated;
commit;

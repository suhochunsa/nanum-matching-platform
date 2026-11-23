-- 치명적 문제 수정 + 알림 (2026-11-23)
-- 1) 기부자 연락처를 매칭 확정 전에 기관에게 보여주던 함수(get_donor_contact)를 없앤다.
--    연락처는 매칭이 확정된 뒤 요청함(get_my_matching_dashboard)에서만 서로 볼 수 있다.
-- 2) 매칭이 확정(전달 대기)된 기부 물품·필요 물품은 삭제할 수 없다. (삭제하면 매칭이 상대에게 알리지 않고 사라졌음)
-- 3) 확정된 매칭을 기부자·기관 누구나 최종 완료 전에 취소할 수 있다.
--    취소하면 물품은 다시 기부 가능, 필요 물품은 수락 때 줄인 수량·모집 상태를 되돌린다.
-- 4) 요청함에 알림용 정보(누가 언제 무엇을 했는지)를 함께 돌려준다. (전달 완료 함수는 마지막으로 누른 사람을 기록)
-- 여러 번 실행해도 같은 결과가 된다.
begin;

-- 1) 연락처 미리 보기 함수 제거 -------------------------------------------------
drop function if exists public.get_donor_contact(uuid, uuid);

-- 매칭에 기록을 더한다 ------------------------------------------------------------
alter table public.matches add column if not exists cancelled_by uuid references public.profiles(id) on delete set null;
alter table public.matches add column if not exists cancelled_at timestamptz;
-- 'request' 요청자가 요청을 취소 / 'auto' 다른 매칭이 확정돼 자동 취소 / 'confirmed' 확정된 매칭을 취소
alter table public.matches add column if not exists cancel_kind text;
alter table public.matches drop constraint if exists matches_cancel_kind_check;
alter table public.matches add constraint matches_cancel_kind_check check (cancel_kind in ('request','auto','confirmed'));
-- 수락할 때 필요 물품에서 줄인 수량, 모집 완료로 바꿨는지 (확정 취소 때 되돌리기 위해)
alter table public.matches add column if not exists need_reduced integer;
alter table public.matches add column if not exists need_closed boolean;

-- 마지막으로 전달 완료를 눌러 최종 완료시킨 사람 (알림: 상대가 완료시켰는지 알기 위해)
alter table public.matches add column if not exists completed_by uuid references public.profiles(id) on delete set null;

-- 전달 완료 (20261116 버전과 같고, 최종 완료 때 completed_by만 기록)
create or replace function public.complete_item_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_item public.donor_items%rowtype;
  v_need public.institution_needs%rowtype;
  v_org public.institutions%rowtype;
  v_side text;
begin
  if v_uid is null then raise exception '로그인해야 전달 완료를 누를 수 있어요.'; end if;
  select * into v_match from public.matches where id=p_match_id;
  if not found or v_uid not in (coalesce(v_match.requester_id,'00000000-0000-0000-0000-000000000000'::uuid),
                                coalesce(v_match.recipient_id,'00000000-0000-0000-0000-000000000000'::uuid)) then
    raise exception '이 매칭을 처리할 권한이 없어요.';
  end if;
  -- 요청·수락과 같은 순서(물품 → 필요 물품 → 요청)로 잠근다.
  select * into v_item from public.donor_items where id=v_match.donor_item_id for update;
  select * into v_need from public.institution_needs where id=v_match.need_id for update;
  select * into v_match from public.matches where id=p_match_id for update;
  if not found then raise exception '매칭이 삭제되었어요. 목록을 새로고침해 주세요.'; end if;
  select * into v_org from public.institutions where id=v_need.institution_id;

  if v_uid = v_item.owner_id then v_side := 'donor';
  elsif v_uid = v_org.owner_id then v_side := 'institution';
  else raise exception '이 매칭을 처리할 권한이 없어요.'; end if;

  if v_match.status = 'completed' then
    return jsonb_build_object('status','completed','credit',v_match.credit_amount,'credited',true,'donorDone',true,'institutionDone',true);
  end if;
  if v_match.status <> 'confirmed' then raise exception '수락된 매칭만 전달 완료를 누를 수 있어요.'; end if;

  if v_side = 'donor' then
    update public.matches set donor_done_at=coalesce(donor_done_at,now()) where id=p_match_id returning * into v_match;
  else
    update public.matches set institution_done_at=coalesce(institution_done_at,now()) where id=p_match_id returning * into v_match;
  end if;

  if v_match.donor_done_at is null or v_match.institution_done_at is null then
    return jsonb_build_object('status','confirmed','credit',v_match.credit_amount,'credited',false,
      'donorDone',v_match.donor_done_at is not null,'institutionDone',v_match.institution_done_at is not null);
  end if;

  -- 매칭을 먼저 완료로 바꿔야 아래 물품 상태 변경을 보호 트리거가 허용한다.
  update public.matches set status='completed', completed_at=now(), completed_by=v_uid where id=p_match_id;
  update public.donor_items set status='donated' where id=v_item.id and status<>'donated';
  insert into public.matching_credit_entries(user_id,match_id,donor_item_id,amount,item_title)
    values(v_item.owner_id,p_match_id,v_item.id,v_match.credit_amount,v_item.title) on conflict do nothing;
  return jsonb_build_object('status','completed','credit',v_match.credit_amount,'credited',true,'donorDone',true,'institutionDone',true);
end;
$$;

-- 2) 확정된 매칭이 걸린 물품·필요 물품은 삭제 금지 ------------------------------------
create or replace function public.protect_confirmed_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'donor_items' then
    if exists (select 1 from public.matches where donor_item_id = old.id and status = 'confirmed') then
      raise exception '매칭이 확정된 물품은 삭제할 수 없어요. 마이페이지 매칭 요청함에서 매칭을 먼저 취소해 주세요.';
    end if;
  elsif exists (select 1 from public.matches where need_id = old.id and status = 'confirmed') then
    raise exception '매칭이 확정된 필요 물품은 삭제할 수 없어요. 마이페이지 매칭 요청함에서 매칭을 먼저 취소해 주세요.';
  end if;
  return old;
end;
$$;
drop trigger if exists protect_confirmed_delete on public.donor_items;
create trigger protect_confirmed_delete before delete on public.donor_items
  for each row execute function public.protect_confirmed_delete();
drop trigger if exists protect_confirmed_delete on public.institution_needs;
create trigger protect_confirmed_delete before delete on public.institution_needs
  for each row execute function public.protect_confirmed_delete();

-- 수락·거절·요청 취소 (20261116 버전에 기록 몇 가지를 더함) ---------------------------
create or replace function public.respond_item_match(p_match_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_item public.donor_items%rowtype;
  v_need public.institution_needs%rowtype;
  v_org public.institutions%rowtype;
begin
  if v_uid is null then raise exception '로그인해야 요청을 처리할 수 있어요.'; end if;
  select * into v_match from public.matches where id=p_match_id;
  if not found or (v_uid <> v_match.requester_id and v_uid <> v_match.recipient_id)
    or v_match.requester_id is null or v_match.recipient_id is null then raise exception '이 요청을 처리할 권한이 없어요.'; end if;
  if p_action is null or p_action not in ('accept','reject','cancel') then raise exception '요청 처리 방법이 올바르지 않아요.'; end if;
  if p_action = 'cancel' and v_uid <> v_match.requester_id then raise exception '보낸 요청만 취소할 수 있어요.'; end if;
  if p_action in ('accept','reject') and v_uid <> v_match.recipient_id then raise exception '받은 요청만 수락하거나 거절할 수 있어요.'; end if;
  select * into v_item from public.donor_items where id=v_match.donor_item_id for update;
  select * into v_need from public.institution_needs where id=v_match.need_id for update;
  select * into v_match from public.matches where id=p_match_id for update;
  if not found then raise exception '요청이 삭제되었어요. 목록을 새로고침해 주세요.'; end if;
  if v_match.requester_id is null or v_match.recipient_id is null
     or (p_action='cancel' and v_uid<>v_match.requester_id)
     or (p_action in ('accept','reject') and v_uid<>v_match.recipient_id) then raise exception '이 요청을 처리할 권한이 없어요.'; end if;
  if v_match.status in ('confirmed','completed') and p_action='accept' then return jsonb_build_object('status',v_match.status,'credit',v_match.credit_amount,'credited',v_match.status='completed'); end if;
  if v_match.status <> 'requested' then raise exception '이미 처리된 요청이에요. 목록을 새로고침해 주세요.'; end if;
  if p_action = 'reject' then
    update public.matches set status='rejected', responded_at=now() where id=p_match_id;
    return jsonb_build_object('status','rejected','credit',0);
  end if;
  if p_action = 'cancel' then
    update public.matches set status='cancelled', responded_at=now(), cancelled_by=v_uid, cancelled_at=now(), cancel_kind='request'
      where id=p_match_id;
    return jsonb_build_object('status','cancelled','credit',0);
  end if;
  select * into v_org from public.institutions where id=v_need.institution_id;
  if v_item.owner_id is null or v_org.owner_id is null
     or not (v_item.owner_id in (v_match.requester_id,v_match.recipient_id) and v_org.owner_id in (v_match.requester_id,v_match.recipient_id)) then
    raise exception '물품 소유자가 바뀌어 수락할 수 없어요.';
  end if;
  if v_item.status <> 'available' or v_need.status <> 'open' then raise exception '이미 다른 매칭이 확정됐거나 모집이 끝났어요.'; end if;
  if v_item.available_until < (now() at time zone 'Asia/Seoul')::date then raise exception '기부 가능 기간이 지난 물품이에요.'; end if;
  if v_item.quantity <> v_match.quantity then raise exception '물품 수량이 바뀌었어요. 기존 요청을 거절하고 새로 요청해 주세요.'; end if;
  if not (v_match.method = any(v_item.methods) and v_match.method = any(v_org.methods)) then raise exception '전달 방법이 바뀌었어요. 새로 요청해 주세요.'; end if;
  update public.matches set status='confirmed', responded_at=now(),
    need_closed = (v_need.quantity <= v_match.quantity),
    need_reduced = case when v_need.quantity <= v_match.quantity then 0 else v_match.quantity end
    where id=p_match_id;
  update public.donor_items set status='matched' where id=v_item.id;
  update public.institution_needs set status=case when quantity<=v_match.quantity then 'fulfilled' else 'open' end,
    quantity=case when quantity<=v_match.quantity then quantity else quantity-v_match.quantity end where id=v_need.id;
  -- 동일 물품의 다른 대기 요청과, 모집이 끝난 필요 물품의 요청은 자동 취소한다.
  update public.matches set status='cancelled', responded_at=now(), cancelled_by=v_uid, cancelled_at=now(), cancel_kind='auto'
    where status='requested' and id<>p_match_id
    and (donor_item_id=v_item.id or (need_id=v_need.id and exists(select 1 from public.institution_needs where id=v_need.id and status='fulfilled')));
  -- 크레딧은 수락이 아니라 양쪽이 전달 완료를 눌렀을 때(complete_item_match) 적립한다.
  return jsonb_build_object('status','confirmed','credit',v_match.credit_amount,'credited',false);
end;
$$;

-- 3) 확정된 매칭 취소 (기부자·기관 누구나, 최종 완료 전까지) ----------------------------
create or replace function public.cancel_confirmed_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_item public.donor_items%rowtype;
  v_need public.institution_needs%rowtype;
  v_none uuid := '00000000-0000-0000-0000-000000000000';
begin
  if v_uid is null then raise exception '로그인해야 매칭을 취소할 수 있어요.'; end if;
  select * into v_match from public.matches where id=p_match_id;
  if not found or v_uid not in (coalesce(v_match.requester_id,v_none), coalesce(v_match.recipient_id,v_none)) then
    raise exception '이 매칭을 처리할 권한이 없어요.';
  end if;
  -- 요청·수락·전달 완료와 같은 순서(물품 → 필요 물품 → 요청)로 잠근다.
  select * into v_item from public.donor_items where id=v_match.donor_item_id for update;
  select * into v_need from public.institution_needs where id=v_match.need_id for update;
  select * into v_match from public.matches where id=p_match_id for update;
  if not found then raise exception '매칭이 삭제되었어요. 목록을 새로고침해 주세요.'; end if;
  if v_match.status = 'completed' then raise exception '이미 최종 완료된 매칭은 취소할 수 없어요.'; end if;
  if v_match.status <> 'confirmed' then raise exception '이미 처리된 매칭이에요. 목록을 새로고침해 주세요.'; end if;

  -- 매칭을 먼저 취소해야 아래 물품 상태 변경을 보호 트리거가 허용한다.
  update public.matches set status='cancelled', cancelled_by=v_uid, cancelled_at=now(), cancel_kind='confirmed' where id=p_match_id;
  update public.donor_items set status='available' where id=v_item.id and status='matched';
  -- 수락 때 줄인 수량과 모집 완료를 되돌린다. (기록이 없는 예전 매칭은 모집 완료면 다시 열고, 아니면 수량을 더한다)
  update public.institution_needs set
    quantity = least(999, quantity + coalesce(v_match.need_reduced, case when status='fulfilled' then 0 else v_match.quantity end)),
    status = case when coalesce(v_match.need_closed, status='fulfilled') then 'open' else status end
    where id=v_need.id;
  return jsonb_build_object('status','cancelled');
end;
$$;
revoke execute on function public.cancel_confirmed_match(uuid) from public, anon;
grant execute on function public.cancel_confirmed_match(uuid) to authenticated;
revoke execute on function public.protect_confirmed_delete() from public, anon, authenticated;

-- 4) 요청함 + 알림 정보 ------------------------------------------------------------
--   event_at: 마지막으로 상태가 바뀐 때, event_by_other: 그 변화를 상대방이 만들었는지
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
        case when m.status in ('confirmed','completed') then case when v_uid=i.owner_id then org.phone else d.phone end else null end contact_phone,
        m.cancel_kind, (m.cancelled_by = v_uid) cancelled_by_me,
        case m.status
          when 'requested' then m.created_at
          when 'confirmed' then greatest(m.responded_at, m.donor_done_at, m.institution_done_at)
          when 'rejected' then m.responded_at
          when 'cancelled' then coalesce(m.cancelled_at, m.responded_at)
          when 'completed' then m.completed_at
        end event_at,
        coalesce(case m.status
          when 'requested' then m.recipient_id = v_uid
          -- 확정: 상대가 내 요청을 수락했거나, 상대가 먼저 전달 완료를 누름
          when 'confirmed' then (m.requester_id = v_uid and m.donor_done_at is null and m.institution_done_at is null)
            or (case when v_uid=i.owner_id then m.institution_done_at is not null and m.donor_done_at is null
                     else m.donor_done_at is not null and m.institution_done_at is null end)
          when 'rejected' then m.requester_id = v_uid
          when 'cancelled' then m.cancelled_by is not null and m.cancelled_by <> v_uid
          -- 최종 완료: 상대가 마지막으로 전달 완료를 눌러 완료시킴
          when 'completed' then m.completed_by is not null and m.completed_by <> v_uid
        end, false) event_by_other
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
revoke execute on function public.get_my_matching_dashboard() from public, anon;
grant execute on function public.get_my_matching_dashboard() to authenticated;

commit;

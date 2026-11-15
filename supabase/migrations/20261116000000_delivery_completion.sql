-- 수락과 전달 완료를 분리 (2026-11-16)
-- 이전: 상대방이 수락하면 매칭 확정과 동시에 기부자에게 크레딧 적립
-- 이후: 수락 → 매칭 확정(전달 대기) → 기부자·기관이 각자 "전달 완료"를 누름 → 둘 다 누르면 최종 완료 + 크레딧 적립
-- 여러 번 실행해도 같은 결과가 되도록 작성했다.
begin;

alter table public.matches add column if not exists donor_done_at timestamptz;
alter table public.matches add column if not exists institution_done_at timestamptz;
alter table public.matches add column if not exists completed_at timestamptz;

-- 1) 수락: 매칭 확정까지만 (크레딧 적립 제거)
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
  -- 재전송과 응답이 경합했을 때도 새 당사자를 기준으로 다시 검사한다.
  if v_match.requester_id is null or v_match.recipient_id is null
     or (p_action='cancel' and v_uid<>v_match.requester_id)
     or (p_action in ('accept','reject') and v_uid<>v_match.recipient_id) then raise exception '이 요청을 처리할 권한이 없어요.'; end if;
  if v_match.status in ('confirmed','completed') and p_action='accept' then return jsonb_build_object('status',v_match.status,'credit',v_match.credit_amount,'credited',v_match.status='completed'); end if;
  if v_match.status <> 'requested' then raise exception '이미 처리된 요청이에요. 목록을 새로고침해 주세요.'; end if;
  if p_action in ('reject','cancel') then
    update public.matches set status=case p_action when 'reject' then 'rejected' else 'cancelled' end, responded_at=now() where id=p_match_id;
    return jsonb_build_object('status',case p_action when 'reject' then 'rejected' else 'cancelled' end,'credit',0);
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
  update public.matches set status='confirmed',responded_at=now() where id=p_match_id;
  update public.donor_items set status='matched' where id=v_item.id;
  update public.institution_needs set status=case when quantity<=v_match.quantity then 'fulfilled' else 'open' end,
    quantity=case when quantity<=v_match.quantity then quantity else quantity-v_match.quantity end where id=v_need.id;
  -- 동일 물품의 다른 대기 요청과, 모집이 끝난 필요 물품의 요청은 자동 취소한다.
  update public.matches set status='cancelled',responded_at=now() where status='requested' and id<>p_match_id
    and (donor_item_id=v_item.id or (need_id=v_need.id and exists(select 1 from public.institution_needs where id=v_need.id and status='fulfilled')));
  -- 크레딧은 수락이 아니라 양쪽이 전달 완료를 눌렀을 때(complete_item_match) 적립한다.
  return jsonb_build_object('status','confirmed','credit',v_match.credit_amount,'credited',false);
end;
$$;

-- 2) 전달 완료: 기부자(물품 주인)와 기관(필요 물품을 올린 기관 주인)이 각자 한 번씩 누른다.
--    둘 다 누르면 최종 완료 → 물품을 기부 완료로 바꾸고 기부자에게 크레딧을 한 번만 적립한다.
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
  update public.matches set status='completed', completed_at=now() where id=p_match_id;
  update public.donor_items set status='donated' where id=v_item.id and status<>'donated';
  insert into public.matching_credit_entries(user_id,match_id,donor_item_id,amount,item_title)
    values(v_item.owner_id,p_match_id,v_item.id,v_match.credit_amount,v_item.title) on conflict do nothing;
  return jsonb_build_object('status','completed','credit',v_match.credit_amount,'credited',true,'donorDone',true,'institutionDone',true);
end;
$$;

-- 3) 매칭이 확정된 물품은 양쪽 전달 완료 전에 직접 '기부 완료'로 바꿀 수 없다. (크레딧 흐름을 건너뛰지 못하게)
create or replace function public.protect_confirmed_donation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.matching_credit_entries where donor_item_id=old.id)
    or exists(select 1 from public.matches where donor_item_id=old.id and status in ('confirmed','completed')) then
    if new.quantity<>old.quantity or new.status not in ('matched','donated') then
      raise exception '매칭이 확정된 물품의 수량을 바꾸거나 다시 기부 가능으로 바꿀 수 없어요.';
    end if;
    if new.status='donated' and old.status<>'donated'
       and not exists(select 1 from public.matches where donor_item_id=old.id and status='completed') then
      raise exception '기부자와 기관이 모두 전달 완료를 눌러야 기부 완료가 돼요. 마이페이지 매칭 요청함에서 눌러 주세요.';
    end if;
  end if;
  return new;
end;
$$;

-- 4) 요청함: 양쪽 전달 완료 여부와 내 역할(기부자/기관)을 함께 돌려준다.
create or replace function public.get_my_matching_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception '로그인해야 요청함을 볼 수 있어요.'; end if;
  select jsonb_build_object(
    'requests', coalesce((select jsonb_agg(r order by r.created_at desc) from (
      select m.id,m.status,m.created_at,m.responded_at,m.completed_at,m.quantity,m.method,m.score,m.credit_amount,
        m.requester_id,m.recipient_id,(m.recipient_id=v_uid) incoming,i.title item_title,n.title need_title,
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

-- 5) 기존 데이터: 예전 규칙으로 '수락만 하고' 적립된 크레딧은 회수한다.
--    해당 매칭은 전달 대기 상태로 남고, 양쪽이 전달 완료를 누르면 같은 금액이 다시 적립된다.
delete from public.matching_credit_entries e
using public.matches m
where e.match_id=m.id and m.status='confirmed';

revoke execute on function public.complete_item_match(uuid) from public,anon;
grant execute on function public.complete_item_match(uuid) to authenticated;
revoke execute on function public.protect_confirmed_donation() from public,anon,authenticated;
commit;

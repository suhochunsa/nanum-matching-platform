-- 매칭 요청 → 상대방 수락 → 기부자 계정에 한 번 적립. 모두 한 트랜잭션에서 처리한다.
begin;
alter table public.matches add column if not exists requester_id uuid references public.profiles(id);
alter table public.matches add column if not exists recipient_id uuid references public.profiles(id);
alter table public.matches add column if not exists quantity integer not null default 1 check (quantity between 1 and 999);
alter table public.matches add column if not exists credit_amount integer not null default 0 check (credit_amount >= 0);
alter table public.matches add column if not exists responded_at timestamptz;
alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check check (status in ('requested','confirmed','completed','cancelled','rejected'));
create unique index if not exists matches_one_confirmed_item on public.matches(donor_item_id) where status in ('confirmed','completed');
create index if not exists matches_requester_idx on public.matches(requester_id);
create index if not exists matches_recipient_idx on public.matches(recipient_id);

-- donors는 물품마다 생성되므로, 누적 크레딧은 로그인 계정별 독립 원장으로 보관한다.
create table if not exists public.matching_credit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid unique references public.matches(id) on delete set null,
  donor_item_id uuid unique references public.donor_items(id) on delete set null,
  amount integer not null check (amount > 0),
  item_title text not null,
  created_at timestamptz not null default now()
);
create index if not exists matching_credit_entries_user_idx on public.matching_credit_entries(user_id);
alter table public.matching_credit_entries enable row level security;
revoke all on public.matching_credit_entries from anon, authenticated;
revoke insert, update, delete on public.matches from anon, authenticated;
grant select on public.matches, public.matching_credit_entries to authenticated;
drop policy if exists "매칭 당사자만 요청을 조회" on public.matches;
create policy "매칭 당사자만 요청을 조회" on public.matches for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id);
drop policy if exists "내 크레딧만 조회" on public.matching_credit_entries;
create policy "내 크레딧만 조회" on public.matching_credit_entries for select to authenticated using (auth.uid() = user_id);

create or replace function public.request_item_match(p_item_id uuid, p_need_id uuid, p_method text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item public.donor_items%rowtype;
  v_need public.institution_needs%rowtype;
  v_org public.institutions%rowtype;
  v_recipient uuid;
  v_id uuid;
  v_existing public.matches%rowtype;
  v_category double precision;
  v_name double precision;
  v_score integer;
  v_credit integer;
begin
  if v_uid is null then raise exception '로그인해야 매칭을 요청할 수 있어요.'; end if;
  -- 요청과 수락은 항상 물품 → 필요 물품 → 요청 순서로 잠근다.
  select * into v_item from public.donor_items where id = p_item_id for update;
  if not found then raise exception '기부 물품을 찾지 못했어요.'; end if;
  select * into v_need from public.institution_needs where id = p_need_id for update;
  if not found then raise exception '필요 물품을 찾지 못했어요.'; end if;
  select * into v_org from public.institutions where id = v_need.institution_id;
  if v_item.owner_id is null or v_org.owner_id is null then raise exception '가입한 계정이 등록한 물품에만 매칭 요청을 보낼 수 있어요.'; end if;
  if not exists (select 1 from public.profiles where id = v_item.owner_id and role = 'donor')
     or not exists (select 1 from public.profiles where id = v_org.owner_id and role = 'institution') then
    raise exception '기부자와 기관 계정 사이에서만 요청할 수 있어요.';
  end if;
  if v_uid = v_item.owner_id then v_recipient := v_org.owner_id;
  elsif v_uid = v_org.owner_id then v_recipient := v_item.owner_id;
  else raise exception '내가 등록한 물품으로만 매칭을 요청할 수 있어요.'; end if;
  if v_uid = v_recipient then raise exception '자신에게 매칭을 요청할 수 없어요.'; end if;
  if v_item.status <> 'available' or v_need.status <> 'open' then raise exception '이미 매칭됐거나 모집이 끝난 물품이에요.'; end if;
  if exists(select 1 from public.matching_credit_entries where donor_item_id=p_item_id) then raise exception '이미 크레딧이 적립된 물품이에요.'; end if;
  if v_item.available_until < (now() at time zone 'Asia/Seoul')::date then raise exception '기부 가능 기간이 지난 물품이에요.'; end if;
  if p_method is null or not (p_method = any(v_item.methods) and p_method = any(v_org.methods)) then
    raise exception '양쪽이 모두 가능한 전달 방법을 골라 주세요.';
  end if;
  select avg(s) into v_category from (
    select (select max(case when a = b then 1.0 when split_part(a,'/',1) = split_part(b,'/',1) then 0.5 else 0 end) from unnest(v_need.categories) b) s from unnest(v_item.categories) a
    union all
    select (select max(case when a = b then 1.0 when split_part(a,'/',1) = split_part(b,'/',1) then 0.5 else 0 end) from unnest(v_item.categories) b) s from unnest(v_need.categories) a
  ) scores;
  v_name := public.donor_contact_name_similarity(v_item.title, v_need.title);
  if coalesce(v_category,0) = 0 and v_name < 0.25 then raise exception '조건이 맞는 물품에만 매칭을 요청할 수 있어요.'; end if;
  v_score := round((coalesce(v_category,0)*0.35 + v_name*0.3 + least(1.0,v_item.quantity::numeric/v_need.quantity)*0.2
    + case v_item.condition when '새 상품' then 1 when '사용감 적음' then 0.7 when '사용감 있음' then 0.4 else 0.5 end*0.15)*100);
  select greatest(10,coalesce(max(case split_part(c,'/',1) when '의류' then 20 when '가구' then 50 when '식품' then 15 when '학용품' then 10 when '생활용품' then 20 else 10 end),10)) + v_item.quantity*10
    into v_credit from unnest(v_item.categories) c;
  select * into v_existing from public.matches where donor_item_id = p_item_id and need_id = p_need_id for update;
  if found then
    if v_existing.status = 'requested' then raise exception '이미 대기 중인 요청이 있어요. 마이페이지 요청함에서 확인해 주세요.'; end if;
    if v_existing.status in ('confirmed','completed') then raise exception '이미 확정된 매칭이에요.'; end if;
    update public.matches set requester_id=v_uid, recipient_id=v_recipient, status='requested', method=p_method,
      quantity=v_item.quantity, credit_amount=v_credit, score=v_score, created_at=now(), responded_at=null where id=v_existing.id returning id into v_id;
  else
    insert into public.matches(donor_item_id,need_id,score,method,requester_id,recipient_id,quantity,credit_amount)
      values(p_item_id,p_need_id,v_score,p_method,v_uid,v_recipient,v_item.quantity,v_credit) returning id into v_id;
  end if;
  return v_id;
end;
$$;

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
  if v_match.status in ('confirmed','completed') and p_action='accept' then return jsonb_build_object('status',v_match.status,'credit',v_match.credit_amount); end if;
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
  insert into public.matching_credit_entries(user_id,match_id,donor_item_id,amount,item_title)
    values(v_item.owner_id,p_match_id,v_item.id,v_match.credit_amount,v_item.title) on conflict(match_id) do nothing;
  return jsonb_build_object('status','confirmed','credit',v_match.credit_amount);
end;
$$;

create or replace function public.get_my_matching_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception '로그인해야 요청함을 볼 수 있어요.'; end if;
  select jsonb_build_object(
    'requests', coalesce((select jsonb_agg(r order by r.created_at desc) from (
      select m.id,m.status,m.created_at,m.responded_at,m.quantity,m.method,m.score,m.credit_amount,
        m.requester_id,m.recipient_id,(m.recipient_id=v_uid) incoming,i.title item_title,n.title need_title,
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

-- 확정된 물품을 다시 기부 가능 상태로 바꿔 중복 적립하는 것을 방지한다.
create or replace function public.protect_confirmed_donation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.matching_credit_entries where donor_item_id=old.id)
    or exists(select 1 from public.matches where donor_item_id=old.id and status in ('confirmed','completed')) then
    if new.quantity<>old.quantity or new.status not in ('matched','donated') then
      raise exception '매칭이 확정된 물품의 수량을 바꾸거나 다시 기부 가능으로 바꿀 수 없어요.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_confirmed_donation on public.donor_items;
create trigger protect_confirmed_donation before update on public.donor_items for each row execute function public.protect_confirmed_donation();
revoke execute on function public.protect_confirmed_donation() from public,anon,authenticated;
revoke execute on function public.request_item_match(uuid,uuid,text) from public,anon;
revoke execute on function public.respond_item_match(uuid,text) from public,anon;
revoke execute on function public.get_my_matching_dashboard() from public,anon;
grant execute on function public.request_item_match(uuid,uuid,text),public.respond_item_match(uuid,text),public.get_my_matching_dashboard() to authenticated;
commit;

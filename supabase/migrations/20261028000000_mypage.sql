-- 마이페이지: 내 물품 관리, 기관 정보 수정
-- 지금까지는 표에 직접 쓰기를 막고 등록 함수만 열어뒀다.
-- 이제 로그인한 주인에게만, 고쳐도 되는 칸만 수정·삭제를 연다.
--   기부자: 내 기부 물품의 수량·마감일·상세 정보·상태 수정, 삭제
--   기관:   내 기관의 필요 물품 수량·상태 수정, 삭제 / 내 기관의 위치·연락처·방문 시간·받는 방법 수정

-- 기관 연락처도 기부자 연락처와 같은 형식만 받는다 (기존 데이터는 모두 이 형식)
alter table public.institutions
  add constraint institutions_phone_format check (phone ~ '^0\d{1,2}-?\d{3,4}-?\d{4}$');

-- 기본으로 열려 있는 표 단위 권한을 닫고, 필요한 칸만 다시 연다 ---------------
revoke insert, update, delete on public.donor_items, public.institution_needs, public.institutions from anon, authenticated;

grant update (quantity, available_until, detail, status) on public.donor_items to authenticated;
grant delete on public.donor_items to authenticated;

grant update (quantity, status) on public.institution_needs to authenticated;
grant delete on public.institution_needs to authenticated;

grant update (location, phone, hours, methods) on public.institutions to authenticated;

-- 행 단위 규칙: 내 것만 ----------------------------------------------------------
create policy "기부자는 자기 기부 물품만 고칠 수 있다"
  on public.donor_items for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "기부자는 자기 기부 물품만 지울 수 있다"
  on public.donor_items for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "기관은 자기 필요 물품만 고칠 수 있다"
  on public.institution_needs for update to authenticated
  using (exists (select 1 from public.institutions i
                 where i.id = institution_id and i.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.institutions i
                      where i.id = institution_id and i.owner_id = (select auth.uid())));

create policy "기관은 자기 필요 물품만 지울 수 있다"
  on public.institution_needs for delete to authenticated
  using (exists (select 1 from public.institutions i
                 where i.id = institution_id and i.owner_id = (select auth.uid())));

create policy "기관은 자기 기관 정보만 고칠 수 있다"
  on public.institutions for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- 기부 물품을 지우면 그 물품에 쓴 기부자 연락처(donors)도 같이 지운다 (개인정보를 남기지 않기 위해)
create function public.delete_donor_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.donors where id = old.donor_id;
  return old;
end;
$$;

revoke execute on function public.delete_donor_contact() from public, anon, authenticated;

create trigger on_donor_item_deleted
  after delete on public.donor_items
  for each row execute function public.delete_donor_contact();

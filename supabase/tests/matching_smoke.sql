-- 운영에서도 실행 가능: 임시 물품·요청·적립은 전부 ROLLBACK한다.
begin;
do $$
declare
  v_donor uuid; v_institution uuid; v_org uuid; v_contact uuid;
  v_item uuid; v_need uuid; v_second_need uuid; v_match uuid; v_second_match uuid;
  v_total bigint; v_result jsonb;
begin
  select id into v_donor from public.profiles where role='donor' limit 1;
  select id into v_institution from public.profiles where role='institution' limit 1;
  if v_donor is null or v_institution is null then raise exception '검증하려면 기부자·기관 계정이 한 개씩 필요합니다.'; end if;
  select id into v_org from public.institutions where owner_id=v_institution;
  if v_org is null then
    insert into public.institutions(name,location,phone,methods,owner_id)
      values('검증기관-'||substr(gen_random_uuid()::text,1,8),'서울시','02-000-0000',array['pickup'],v_institution) returning id into v_org;
  end if;
  -- 현재 기관이 지원하는 전달 방법을 임시 테스트에서도 그대로 사용한다.
  insert into public.donors(name,phone) values('검증기부자','010-0000-0000') returning id into v_contact;
  insert into public.donor_items(donor_id,owner_id,donor_display,title,categories,quantity,condition,region,methods)
    select v_contact,v_donor,'검OO','매칭 검증 패딩',array['의류/아우터'],3,'새 상품','서울',methods from public.institutions where id=v_org returning id into v_item;
  insert into public.institution_needs(institution_id,title,categories,quantity)
    values(v_org,'검증 패딩',array['의류/아우터'],2) returning id into v_need;
  insert into public.institution_needs(institution_id,title,categories,quantity)
    values(v_org,'추가 패딩',array['의류/아우터'],2) returning id into v_second_need;
  perform set_config('request.jwt.claim.sub',v_donor::text,true);
  select public.request_item_match(v_item,v_need,(select methods[1] from public.institutions where id=v_org)) into v_match;
  select public.request_item_match(v_item,v_second_need,(select methods[1] from public.institutions where id=v_org)) into v_second_match;
  if exists(select 1 from public.matching_credit_entries where match_id=v_match) then raise exception '수락 전에 크레딧이 적립됨'; end if;
  perform set_config('request.jwt.claim.sub',v_institution::text,true);
  v_result := public.respond_item_match(v_match,'accept');
  if v_result->>'status'<>'confirmed' or (v_result->>'credit')::integer<>50 then raise exception '수락 결과 불일치'; end if;
  perform public.respond_item_match(v_match,'accept');
  if exists(select 1 from public.matching_credit_entries where match_id=v_match) then raise exception '전달 완료 전에 크레딧이 적립됨'; end if;
  -- 기관만 전달 완료 → 아직 적립 안 됨, 기부자까지 완료 → 한 번 적립
  v_result := public.complete_item_match(v_match);
  if v_result->>'status'<>'confirmed' or exists(select 1 from public.matching_credit_entries where match_id=v_match) then raise exception '한쪽 완료만으로 적립됨'; end if;
  perform set_config('request.jwt.claim.sub',v_donor::text,true);
  v_result := public.complete_item_match(v_match);
  if v_result->>'status'<>'completed' then raise exception '양쪽 완료 후 최종 완료가 안 됨'; end if;
  perform public.complete_item_match(v_match);
  select count(*) into v_total from public.matching_credit_entries where match_id=v_match and user_id=v_donor and amount=50;
  if v_total<>1 then raise exception '적립이 누락되거나 중복됨'; end if;
  if not exists(select 1 from public.matches where id=v_second_match and status='cancelled') then raise exception '중복 물품 요청 취소 실패'; end if;
  perform set_config('request.jwt.claim.sub',v_donor::text,true);
  v_result := public.get_my_matching_dashboard();
  if not exists(select 1 from jsonb_array_elements(v_result->'creditEntries') e where e->>'item_title'='매칭 검증 패딩' and (e->>'amount')::integer=50) then raise exception '마이페이지 적립 내역 누락'; end if;
end;
$$;
rollback;
select 'PASS: request, accept, single credit, dashboard, duplicate protection; test data rolled back' as verification;

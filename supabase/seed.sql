-- 테스트 데이터 (계획서 6차시: "테스트 데이터로 확인")
-- src/data/mockData.js와 같은 내용. 기부 가능 마감일은 오늘 기준 상대 날짜라서
-- 언제 넣어도 만료 3개·오늘 마감 1개가 생긴다.
-- 다시 넣고 싶으면 아래 truncate 줄의 주석을 풀고 실행한다.
-- truncate public.institutions, public.donor_items, public.donors restart identity cascade;

insert into public.institutions (name, location, phone, hours, methods) values
  ('햇살보육원', '서울 마포구 성미산로 12', '02-312-4501', '평일 10:00~17:00', array['dropoff', 'parcel']),
  ('느티나무 복지관', '서울 서대문구 연희로 88', '02-334-2210', '평일 09:00~18:00', array['dropoff', 'parcel', 'pickup']),
  ('푸른꿈 지역아동센터', '서울 은평구 통일로 545', '02-385-7712', '평일 13:00~19:00', array['dropoff', 'parcel']),
  ('희망나눔센터', '경기 고양시 덕양구 화중로 30', '031-962-3300', '평일·토 10:00~16:00', array['dropoff', 'pickup']),
  ('한사랑 요양원', '서울 용산구 효창원로 70', '02-713-9080', '매일 10:00~16:00', array['dropoff', 'parcel']),
  ('사랑의 쉼터', '서울 종로구 율곡로 190', '02-747-1004', '', array['parcel']),
  ('나눔 노인복지관', '서울 마포구 월드컵북로 21', '02-325-6600', '평일 09:00~18:00', array['dropoff', 'parcel', 'pickup']),
  ('다솜 자활센터', '서울 은평구 은평로 200', '02-353-4040', '평일 10:00~18:00', array['dropoff', 'pickup']),
  ('꿈나무 공부방', '서울 서대문구 신촌로 40', '02-393-2525', '평일 15:00~20:00', array['dropoff']);

insert into public.institution_needs (institution_id, title, categories, quantity)
select i.id, v.title, v.categories, v.quantity
from (values
  ('햇살보육원', '겨울 외투 (아동용)', array['의류/아우터', '의류/아동복'], 10),
  ('느티나무 복지관', '즉석식품·통조림', array['식품/즉석식품', '식품/통조림'], 50),
  ('푸른꿈 지역아동센터', '공책·필기구', array['학용품/공책', '학용품/필기구'], 30),
  ('희망나눔센터', '책상·의자', array['가구/책상', '가구/의자'], 5),
  ('한사랑 요양원', '담요·이불', array['생활용품/이불·담요'], 15),
  ('사랑의 쉼터', '겨울 패딩 점퍼', array['의류/아우터'], 4),
  ('나눔 노인복지관', '방한 용품 (장갑·목도리)', array['의류/방한용품'], 20),
  ('푸른꿈 지역아동센터', '아동 운동화', array['의류/신발', '의류/아동복'], 12),
  ('다솜 자활센터', '성인 방한복', array['의류/아우터', '의류/방한용품'], 8),
  ('햇살보육원', '색연필·크레파스', array['학용품/미술용품'], 25),
  ('꿈나무 공부방', '초등 문제집', array['학용품/도서·문제집'], 20),
  ('꿈나무 공부방', '책장', array['가구/수납·책장'], 3),
  ('느티나무 복지관', '접이식 테이블·의자', array['가구/책상', '가구/의자'], 10),
  ('다솜 자활센터', '컵라면·즉석밥', array['식품/라면·면류', '식품/즉석식품'], 60),
  ('사랑의 쉼터', '참치 통조림', array['식품/통조림'], 30),
  ('사랑의 쉼터', '겨울 이불·극세사 담요', array['생활용품/이불·담요'], 12),
  ('한사랑 요양원', '전기 히터·난방용품', array['생활용품/난방용품'], 4),
  ('푸른꿈 지역아동센터', '보드게임·장난감', array['기타/장난감·게임'], 8)
) as v (org, title, categories, quantity)
join public.institutions i on i.name = v.org;

insert into public.donor_items
  (donor_display, title, categories, quantity, condition, region, methods, available_until) values
  ('김OO', '겨울 패딩 점퍼', array['의류/아우터'], 3, '사용감 적음', '서울 마포구', array['dropoff', 'parcel'], current_date + 30),
  ('이OO', '스프링 노트 세트', array['학용품/공책'], 20, '새 상품', '서울 은평구', array['parcel'], null),
  ('박OO', '2인용 책상', array['가구/책상'], 1, '사용감 있음', '경기 고양시', array['pickup'], null),
  ('최OO', '즉석밥 30개입', array['식품/즉석식품'], 2, '새 상품', '서울 서대문구', array['dropoff', 'parcel'], current_date - 3),
  ('정OO', '담요 세트', array['생활용품/이불·담요'], 5, '사용감 적음', '서울 마포구', array['dropoff'], current_date + 60),
  ('한OO', '아동용 운동화', array['의류/신발', '의류/아동복'], 4, '사용감 있음', '서울 용산구', array['parcel'], current_date + 14),
  ('윤OO', '아디다스 겨울 패딩', array['의류/아우터'], 2, '새 상품', '서울 마포구', array['dropoff', 'parcel', 'pickup'], current_date + 45),
  ('장OO', '아동 롱패딩 (140)', array['의류/아우터', '의류/아동복'], 6, '사용감 적음', '경기 고양시', array['parcel', 'pickup'], current_date - 1),
  ('임OO', '방한 장갑·목도리 세트', array['의류/방한용품'], 12, '새 상품', '서울 종로구', array['parcel'], current_date + 20),
  ('오OO', '나이키 후드 집업', array['의류/상의', '의류/아우터'], 3, '사용감 있음', '서울 은평구', array['dropoff'], null),
  ('서OO', '어린이 겨울 외투', array['의류/아우터', '의류/아동복'], 8, '사용감 적음', '서울 서대문구', array['dropoff', 'pickup'], current_date + 10),
  ('권OO', '색연필 24색', array['학용품/미술용품'], 30, '새 상품', '서울 마포구', array['parcel'], null),
  ('황OO', '초등 교과서 문제집', array['학용품/도서·문제집'], 15, '사용감 있음', '서울 용산구', array['dropoff', 'parcel'], current_date + 90),
  ('안OO', '필기구 세트 (볼펜·샤프)', array['학용품/필기구'], 40, '새 상품', '서울 종로구', array['parcel'], null),
  ('송OO', '접이식 의자', array['가구/의자'], 6, '사용감 적음', '경기 고양시', array['pickup'], current_date + 7),
  ('류OO', '3단 책장', array['가구/수납·책장'], 2, '사용감 있음', '서울 은평구', array['pickup'], current_date - 10),
  ('홍OO', '통조림 참치 세트', array['식품/통조림'], 40, '새 상품', '서울 마포구', array['parcel'], current_date + 120),
  ('문OO', '컵라면 박스', array['식품/라면·면류', '식품/즉석식품'], 10, '새 상품', '서울 서대문구', array['dropoff', 'parcel'], current_date + 2),
  ('배OO', '극세사 이불', array['생활용품/이불·담요'], 8, '사용감 적음', '서울 용산구', array['dropoff', 'parcel'], current_date + 30),
  ('신OO', '겨울 담요', array['생활용품/이불·담요'], 20, '새 상품', '서울 마포구', array['parcel'], null),
  ('조OO', '전기 히터', array['생활용품/난방용품', '기타/전자기기'], 2, '사용감 있음', '경기 고양시', array['dropoff', 'pickup'], current_date),
  ('남OO', '보드게임 모음', array['기타/장난감·게임'], 5, '사용감 적음', '서울 종로구', array['dropoff', 'parcel'], null),
  ('고OO', '아이패드 거치대', array['기타/전자기기'], 1, '새 상품', '서울 은평구', array['parcel'], null),
  ('노OO', '성인 겨울 점퍼', array['의류/아우터'], 5, '사용감 적음', '서울 마포구', array['dropoff', 'parcel'], current_date + 21);

// 지금은 실제 데이터베이스(Supabase)가 연결되기 전이라
// 화면 흐름을 확인하기 위한 더미(mock) 데이터입니다.
// 6~8차시에서 Supabase 연동으로 이 파일을 대체할 예정입니다.
// 매칭 점수 계산은 matching.js, 범주 트리는 categories.js에 있습니다.

import { daysFromToday } from './dates.js'

export const CONDITIONS = ['새 상품', '사용감 적음', '사용감 있음']

// 기부자가 등록한 물품 (홈 화면 왼쪽 목록)
// categories: 세부 카테고리 여러 개 ("큰/세부")
// methods: 기부자가 가능한 전달 방법 (delivery.js의 dropoff / parcel / pickup)
// availableUntil: 기부 가능 마감일 'YYYY-MM-DD' (null이면 기한 없음).
//   데모가 날짜와 상관없이 보이도록 오늘 기준으로 계산한다. (만료 3개, 오늘 마감 1개 포함)
export const donorItems = [
  { id: 'd1', categories: ['의류/아우터'], title: '겨울 패딩 점퍼', quantity: 3, condition: '사용감 적음', donor: '김OO', region: '서울 마포구', methods: ['dropoff', 'parcel'], availableUntil: daysFromToday(30) },
  { id: 'd2', categories: ['학용품/공책'], title: '스프링 노트 세트', quantity: 20, condition: '새 상품', donor: '이OO', region: '서울 은평구', methods: ['parcel'], availableUntil: null },
  { id: 'd3', categories: ['가구/책상'], title: '2인용 책상', quantity: 1, condition: '사용감 있음', donor: '박OO', region: '경기 고양시', methods: ['pickup'], availableUntil: null },
  { id: 'd4', categories: ['식품/즉석식품'], title: '즉석밥 30개입', quantity: 2, condition: '새 상품', donor: '최OO', region: '서울 서대문구', methods: ['dropoff', 'parcel'], availableUntil: daysFromToday(-3) },
  { id: 'd5', categories: ['생활용품/이불·담요'], title: '담요 세트', quantity: 5, condition: '사용감 적음', donor: '정OO', region: '서울 마포구', methods: ['dropoff'], availableUntil: daysFromToday(60) },
  { id: 'd6', categories: ['의류/신발', '의류/아동복'], title: '아동용 운동화', quantity: 4, condition: '사용감 있음', donor: '한OO', region: '서울 용산구', methods: ['parcel'], availableUntil: daysFromToday(14) },
  { id: 'd7', categories: ['의류/아우터'], title: '아디다스 겨울 패딩', quantity: 2, condition: '새 상품', donor: '윤OO', region: '서울 마포구', methods: ['dropoff', 'parcel', 'pickup'], availableUntil: daysFromToday(45) },
  { id: 'd8', categories: ['의류/아우터', '의류/아동복'], title: '아동 롱패딩 (140)', quantity: 6, condition: '사용감 적음', donor: '장OO', region: '경기 고양시', methods: ['parcel', 'pickup'], availableUntil: daysFromToday(-1) },
  { id: 'd9', categories: ['의류/방한용품'], title: '방한 장갑·목도리 세트', quantity: 12, condition: '새 상품', donor: '임OO', region: '서울 종로구', methods: ['parcel'], availableUntil: daysFromToday(20) },
  { id: 'd10', categories: ['의류/상의', '의류/아우터'], title: '나이키 후드 집업', quantity: 3, condition: '사용감 있음', donor: '오OO', region: '서울 은평구', methods: ['dropoff'], availableUntil: null },
  { id: 'd11', categories: ['의류/아우터', '의류/아동복'], title: '어린이 겨울 외투', quantity: 8, condition: '사용감 적음', donor: '서OO', region: '서울 서대문구', methods: ['dropoff', 'pickup'], availableUntil: daysFromToday(10) },
  { id: 'd12', categories: ['학용품/미술용품'], title: '색연필 24색', quantity: 30, condition: '새 상품', donor: '권OO', region: '서울 마포구', methods: ['parcel'], availableUntil: null },
  { id: 'd13', categories: ['학용품/도서·문제집'], title: '초등 교과서 문제집', quantity: 15, condition: '사용감 있음', donor: '황OO', region: '서울 용산구', methods: ['dropoff', 'parcel'], availableUntil: daysFromToday(90) },
  { id: 'd14', categories: ['학용품/필기구'], title: '필기구 세트 (볼펜·샤프)', quantity: 40, condition: '새 상품', donor: '안OO', region: '서울 종로구', methods: ['parcel'], availableUntil: null },
  { id: 'd15', categories: ['가구/의자'], title: '접이식 의자', quantity: 6, condition: '사용감 적음', donor: '송OO', region: '경기 고양시', methods: ['pickup'], availableUntil: daysFromToday(7) },
  { id: 'd16', categories: ['가구/수납·책장'], title: '3단 책장', quantity: 2, condition: '사용감 있음', donor: '류OO', region: '서울 은평구', methods: ['pickup'], availableUntil: daysFromToday(-10) },
  { id: 'd17', categories: ['식품/통조림'], title: '통조림 참치 세트', quantity: 40, condition: '새 상품', donor: '홍OO', region: '서울 마포구', methods: ['parcel'], availableUntil: daysFromToday(120) },
  { id: 'd18', categories: ['식품/라면·면류', '식품/즉석식품'], title: '컵라면 박스', quantity: 10, condition: '새 상품', donor: '문OO', region: '서울 서대문구', methods: ['dropoff', 'parcel'], availableUntil: daysFromToday(2) },
  { id: 'd19', categories: ['생활용품/이불·담요'], title: '극세사 이불', quantity: 8, condition: '사용감 적음', donor: '배OO', region: '서울 용산구', methods: ['dropoff', 'parcel'], availableUntil: daysFromToday(30) },
  { id: 'd20', categories: ['생활용품/이불·담요'], title: '겨울 담요', quantity: 20, condition: '새 상품', donor: '신OO', region: '서울 마포구', methods: ['parcel'], availableUntil: null },
  { id: 'd21', categories: ['생활용품/난방용품', '기타/전자기기'], title: '전기 히터', quantity: 2, condition: '사용감 있음', donor: '조OO', region: '경기 고양시', methods: ['dropoff', 'pickup'], availableUntil: daysFromToday(0) },
  { id: 'd22', categories: ['기타/장난감·게임'], title: '보드게임 모음', quantity: 5, condition: '사용감 적음', donor: '남OO', region: '서울 종로구', methods: ['dropoff', 'parcel'], availableUntil: null },
  { id: 'd23', categories: ['기타/전자기기'], title: '아이패드 거치대', quantity: 1, condition: '새 상품', donor: '고OO', region: '서울 은평구', methods: ['parcel'], availableUntil: null },
  { id: 'd24', categories: ['의류/아우터'], title: '성인 겨울 점퍼', quantity: 5, condition: '사용감 적음', donor: '노OO', region: '서울 마포구', methods: ['dropoff', 'parcel'], availableUntil: daysFromToday(21) },
]

// 기관 정보 (필요 물품의 org 이름으로 찾는다)
// methods: 기관이 받을 수 있는 방법 (delivery.js의 dropoff / parcel / pickup)
export const institutions = [
  { name: '햇살보육원', location: '서울 마포구 성미산로 12', phone: '02-312-4501', hours: '평일 10:00~17:00', methods: ['dropoff', 'parcel'] },
  { name: '느티나무 복지관', location: '서울 서대문구 연희로 88', phone: '02-334-2210', hours: '평일 09:00~18:00', methods: ['dropoff', 'parcel', 'pickup'] },
  { name: '푸른꿈 지역아동센터', location: '서울 은평구 통일로 545', phone: '02-385-7712', hours: '평일 13:00~19:00', methods: ['dropoff', 'parcel'] },
  { name: '희망나눔센터', location: '경기 고양시 덕양구 화중로 30', phone: '031-962-3300', hours: '평일·토 10:00~16:00', methods: ['dropoff', 'pickup'] },
  { name: '한사랑 요양원', location: '서울 용산구 효창원로 70', phone: '02-713-9080', hours: '매일 10:00~16:00', methods: ['dropoff', 'parcel'] },
  { name: '사랑의 쉼터', location: '서울 종로구 율곡로 190', phone: '02-747-1004', hours: '', methods: ['parcel'] },
  { name: '나눔 노인복지관', location: '서울 마포구 월드컵북로 21', phone: '02-325-6600', hours: '평일 09:00~18:00', methods: ['dropoff', 'parcel', 'pickup'] },
  { name: '다솜 자활센터', location: '서울 은평구 은평로 200', phone: '02-353-4040', hours: '평일 10:00~18:00', methods: ['dropoff', 'pickup'] },
  { name: '꿈나무 공부방', location: '서울 서대문구 신촌로 40', phone: '02-393-2525', hours: '평일 15:00~20:00', methods: ['dropoff'] },
]

// 기관이 등록한 필요 물품 (홈 화면 오른쪽 목록)
export const institutionNeeds = [
  { id: 'n1', categories: ['의류/아우터', '의류/아동복'], title: '겨울 외투 (아동용)', quantity: 10, org: '햇살보육원' },
  { id: 'n2', categories: ['식품/즉석식품', '식품/통조림'], title: '즉석식품·통조림', quantity: 50, org: '느티나무 복지관' },
  { id: 'n3', categories: ['학용품/공책', '학용품/필기구'], title: '공책·필기구', quantity: 30, org: '푸른꿈 지역아동센터' },
  { id: 'n4', categories: ['가구/책상', '가구/의자'], title: '책상·의자', quantity: 5, org: '희망나눔센터' },
  { id: 'n5', categories: ['생활용품/이불·담요'], title: '담요·이불', quantity: 15, org: '한사랑 요양원' },
  { id: 'n6', categories: ['의류/아우터'], title: '겨울 패딩 점퍼', quantity: 4, org: '사랑의 쉼터' },
  { id: 'n7', categories: ['의류/방한용품'], title: '방한 용품 (장갑·목도리)', quantity: 20, org: '나눔 노인복지관' },
  { id: 'n8', categories: ['의류/신발', '의류/아동복'], title: '아동 운동화', quantity: 12, org: '푸른꿈 지역아동센터' },
  { id: 'n9', categories: ['의류/아우터', '의류/방한용품'], title: '성인 방한복', quantity: 8, org: '다솜 자활센터' },
  { id: 'n10', categories: ['학용품/미술용품'], title: '색연필·크레파스', quantity: 25, org: '햇살보육원' },
  { id: 'n11', categories: ['학용품/도서·문제집'], title: '초등 문제집', quantity: 20, org: '꿈나무 공부방' },
  { id: 'n12', categories: ['가구/수납·책장'], title: '책장', quantity: 3, org: '꿈나무 공부방' },
  { id: 'n13', categories: ['가구/책상', '가구/의자'], title: '접이식 테이블·의자', quantity: 10, org: '느티나무 복지관' },
  { id: 'n14', categories: ['식품/라면·면류', '식품/즉석식품'], title: '컵라면·즉석밥', quantity: 60, org: '다솜 자활센터' },
  { id: 'n15', categories: ['식품/통조림'], title: '참치 통조림', quantity: 30, org: '사랑의 쉼터' },
  { id: 'n16', categories: ['생활용품/이불·담요'], title: '겨울 이불·극세사 담요', quantity: 12, org: '사랑의 쉼터' },
  { id: 'n17', categories: ['생활용품/난방용품'], title: '전기 히터·난방용품', quantity: 4, org: '한사랑 요양원' },
  { id: 'n18', categories: ['기타/장난감·게임'], title: '보드게임·장난감', quantity: 8, org: '푸른꿈 지역아동센터' },
]

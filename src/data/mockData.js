// 지금은 실제 데이터베이스(Supabase)가 연결되기 전이라
// 화면 흐름을 확인하기 위한 더미(mock) 데이터입니다.
// 6~8차시에서 Supabase 연동으로 이 파일을 대체할 예정입니다.
// 매칭 점수 계산은 matching.js에 있습니다.

export const CATEGORIES = ['의류', '가구', '식품', '학용품', '생활용품', '기타']

export const CONDITIONS = ['새 상품', '사용감 적음', '사용감 있음']

// 기부자가 등록한 물품 (홈 화면 왼쪽 목록)
export const donorItems = [
  { id: 'd1', category: '의류', title: '겨울 패딩 점퍼', quantity: 3, condition: '사용감 적음', donor: '김OO' },
  { id: 'd2', category: '학용품', title: '스프링 노트 세트', quantity: 20, condition: '새 상품', donor: '이OO' },
  { id: 'd3', category: '가구', title: '2인용 책상', quantity: 1, condition: '사용감 있음', donor: '박OO' },
  { id: 'd4', category: '식품', title: '즉석밥 30개입', quantity: 2, condition: '새 상품', donor: '최OO' },
  { id: 'd5', category: '생활용품', title: '담요 세트', quantity: 5, condition: '사용감 적음', donor: '정OO' },
  { id: 'd6', category: '의류', title: '아동용 운동화', quantity: 4, condition: '사용감 있음', donor: '한OO' },
  { id: 'd7', category: '의류', title: '아디다스 겨울 패딩', quantity: 2, condition: '새 상품', donor: '윤OO' },
  { id: 'd8', category: '의류', title: '아동 롱패딩 (140)', quantity: 6, condition: '사용감 적음', donor: '장OO' },
  { id: 'd9', category: '의류', title: '방한 장갑·목도리 세트', quantity: 12, condition: '새 상품', donor: '임OO' },
  { id: 'd10', category: '의류', title: '나이키 후드 집업', quantity: 3, condition: '사용감 있음', donor: '오OO' },
  { id: 'd11', category: '의류', title: '어린이 겨울 외투', quantity: 8, condition: '사용감 적음', donor: '서OO' },
  { id: 'd12', category: '학용품', title: '색연필 24색', quantity: 30, condition: '새 상품', donor: '권OO' },
  { id: 'd13', category: '학용품', title: '초등 교과서 문제집', quantity: 15, condition: '사용감 있음', donor: '황OO' },
  { id: 'd14', category: '학용품', title: '필기구 세트 (볼펜·샤프)', quantity: 40, condition: '새 상품', donor: '안OO' },
  { id: 'd15', category: '가구', title: '접이식 의자', quantity: 6, condition: '사용감 적음', donor: '송OO' },
  { id: 'd16', category: '가구', title: '3단 책장', quantity: 2, condition: '사용감 있음', donor: '류OO' },
  { id: 'd17', category: '식품', title: '통조림 참치 세트', quantity: 40, condition: '새 상품', donor: '홍OO' },
  { id: 'd18', category: '식품', title: '컵라면 박스', quantity: 10, condition: '새 상품', donor: '문OO' },
  { id: 'd19', category: '생활용품', title: '극세사 이불', quantity: 8, condition: '사용감 적음', donor: '배OO' },
  { id: 'd20', category: '생활용품', title: '겨울 담요', quantity: 20, condition: '새 상품', donor: '신OO' },
  { id: 'd21', category: '생활용품', title: '전기 히터', quantity: 2, condition: '사용감 있음', donor: '조OO' },
  { id: 'd22', category: '기타', title: '보드게임 모음', quantity: 5, condition: '사용감 적음', donor: '남OO' },
  { id: 'd23', category: '기타', title: '아이패드 거치대', quantity: 1, condition: '새 상품', donor: '고OO' },
  { id: 'd24', category: '의류', title: '성인 겨울 점퍼', quantity: 5, condition: '사용감 적음', donor: '노OO' },
]

// 기관이 등록한 필요 물품 (홈 화면 오른쪽 목록)
export const institutionNeeds = [
  { id: 'n1', category: '의류', title: '겨울 외투 (아동용)', quantity: 10, org: '햇살보육원' },
  { id: 'n2', category: '식품', title: '즉석식품·통조림', quantity: 50, org: '느티나무 복지관' },
  { id: 'n3', category: '학용품', title: '공책·필기구', quantity: 30, org: '푸른꿈 지역아동센터' },
  { id: 'n4', category: '가구', title: '책상·의자', quantity: 5, org: '희망나눔센터' },
  { id: 'n5', category: '생활용품', title: '담요·이불', quantity: 15, org: '한사랑 요양원' },
  { id: 'n6', category: '의류', title: '겨울 패딩 점퍼', quantity: 4, org: '사랑의 쉼터' },
  { id: 'n7', category: '의류', title: '방한 용품 (장갑·목도리)', quantity: 20, org: '나눔 노인복지관' },
  { id: 'n8', category: '의류', title: '아동 운동화', quantity: 12, org: '푸른꿈 지역아동센터' },
  { id: 'n9', category: '의류', title: '성인 방한복', quantity: 8, org: '다솜 자활센터' },
  { id: 'n10', category: '학용품', title: '색연필·크레파스', quantity: 25, org: '햇살보육원' },
  { id: 'n11', category: '학용품', title: '초등 문제집', quantity: 20, org: '꿈나무 공부방' },
  { id: 'n12', category: '가구', title: '책장', quantity: 3, org: '꿈나무 공부방' },
  { id: 'n13', category: '가구', title: '접이식 테이블·의자', quantity: 10, org: '느티나무 복지관' },
  { id: 'n14', category: '식품', title: '컵라면·즉석밥', quantity: 60, org: '다솜 자활센터' },
  { id: 'n15', category: '식품', title: '참치 통조림', quantity: 30, org: '사랑의 쉼터' },
  { id: 'n16', category: '생활용품', title: '겨울 이불·극세사 담요', quantity: 12, org: '사랑의 쉼터' },
  { id: 'n17', category: '생활용품', title: '전기 히터·난방용품', quantity: 4, org: '한사랑 요양원' },
  { id: 'n18', category: '기타', title: '보드게임·장난감', quantity: 8, org: '푸른꿈 지역아동센터' },
]

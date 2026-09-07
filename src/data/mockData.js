// 지금은 실제 데이터베이스(Supabase)가 연결되기 전이라
// 화면 흐름을 확인하기 위한 더미(mock) 데이터입니다.
// 6~8차시에서 Supabase 연동으로 이 파일을 대체할 예정입니다.

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
]

// 기관이 등록한 필요 물품 (홈 화면 오른쪽 목록)
export const institutionNeeds = [
  { id: 'n1', category: '의류', title: '겨울 외투 (아동용)', quantity: 10, org: '햇살보육원' },
  { id: 'n2', category: '식품', title: '즉석식품·통조림', quantity: 50, org: '느티나무 복지관' },
  { id: 'n3', category: '학용품', title: '공책·필기구', quantity: 30, org: '푸른꿈 지역아동센터' },
  { id: 'n4', category: '가구', title: '책상·의자', quantity: 5, org: '희망나눔센터' },
  { id: 'n5', category: '생활용품', title: '담요·이불', quantity: 15, org: '한사랑 요양원' },
]

// 크레딧 적립 규칙(임시): 수량 1개당 10크레딧 + 카테고리 기본 점수
const CATEGORY_BASE_CREDIT = {
  의류: 20,
  가구: 50,
  식품: 15,
  학용품: 10,
  생활용품: 20,
  기타: 10,
}

/**
 * 기부자 입력값을 받아 기관 필요 목록과 대조하는 임시 매칭 로직입니다.
 * 지금은 "카테고리 일치"만 기준으로 하는 단순 규칙이며,
 * 계획서 4차시에서 수량·상태 조건을 더해 정교하게 다듬을 예정입니다.
 */
export function matchDonorToInstitutions({ category, quantity }) {
  const matches = institutionNeeds.filter((need) => need.category === category)
  const base = CATEGORY_BASE_CREDIT[category] ?? 10
  const qty = Number(quantity) || 0
  const estimatedCredit = base + qty * 10
  return { matches, estimatedCredit }
}

/**
 * 기관 입력값을 받아 기부 등록 목록과 대조하는 임시 매칭 로직입니다.
 */
export function matchInstitutionToDonors({ category, quantity }) {
  const matches = donorItems.filter((item) => item.category === category)
  return { matches, requestedQuantity: Number(quantity) || 0 }
}

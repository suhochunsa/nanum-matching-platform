// 물품 범주 트리: 큰 카테고리 → 세부 카테고리
// 선택값은 "큰/세부" 문자열 배열로 다룬다. 예: ['의류/아우터', '의류/아동복']

export const CATEGORY_TREE = [
  { name: '의류', children: ['아우터', '상의', '하의', '신발', '방한용품', '아동복'] },
  { name: '가구', children: ['책상', '의자', '수납·책장', '침대·매트리스'] },
  { name: '식품', children: ['즉석식품', '통조림', '라면·면류', '쌀·곡물', '간식·음료'] },
  { name: '학용품', children: ['필기구', '공책', '미술용품', '도서·문제집', '가방'] },
  { name: '생활용품', children: ['이불·담요', '난방용품', '주방용품', '위생용품'] },
  { name: '기타', children: ['장난감·게임', '전자기기', '그 밖의 물품'] },
]

export function leafId(parent, child) {
  return `${parent}/${child}`
}

export function parentOf(leaf) {
  return leaf.split('/')[0]
}

/** '의류/아우터' → '의류 › 아우터' */
export function formatCategory(leaf) {
  return leaf.replace('/', ' › ')
}

/** 선택된 세부 카테고리들이 속한 큰 카테고리 목록 (중복 제거) */
export function parentsOf(leaves) {
  return [...new Set(leaves.map(parentOf))]
}

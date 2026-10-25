import { parentOf, parentsOf } from './categories.js'
import { isExpired } from './dates.js'
import { findInstitution, getDonorItems, getInstitutionNeeds } from './store.js'

// 매칭 점수 = 아래 네 항목(각 0~1)을 가중합한 값(0~100점).
export const WEIGHTS = { category: 0.35, name: 0.3, quantity: 0.2, condition: 0.15 }

// 기부 물품 상태가 좋을수록 높은 점수
export const CONDITION_SCORE = { '새 상품': 1, '사용감 적음': 0.7, '사용감 있음': 0.4 }

// 세부 카테고리는 다르지만 큰 카테고리가 같을 때 주는 부분 점수 (예: 의류/아우터 ↔ 의류/상의)
const SAME_PARENT_SCORE = 0.5

// 카테고리가 하나도 안 겹쳐도 이름이 이 값 이상 비슷하면 후보에 넣는다.
// (예: 카테고리를 '기타'로 골랐지만 이름이 "겨울 패딩"인 경우)
const NAME_GATE = 0.25

// 크레딧 적립 규칙(임시): 수량 1개당 10크레딧 + 큰 카테고리 기본 점수
// (여러 큰 카테고리를 골랐으면 그중 가장 높은 기본 점수)
const CATEGORY_BASE_CREDIT = {
  의류: 20,
  가구: 50,
  식품: 15,
  학용품: 10,
  생활용품: 20,
  기타: 10,
}

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

function bigrams(text) {
  const counts = new Map()
  for (let i = 0; i < text.length - 1; i++) {
    const gram = text.slice(i, i + 2)
    counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  return counts
}

// 글자 2개 단위 Dice 계수: 띄어쓰기·오타에 강하다.
function bigramDice(a, b) {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0
  const ga = bigrams(a)
  const gb = bigrams(b)
  let shared = 0
  for (const [gram, n] of ga) shared += Math.min(n, gb.get(gram) ?? 0)
  return (2 * shared) / (a.length - 1 + b.length - 1)
}

// 단어 단위 일치도: 같거나 한쪽이 다른 쪽을 포함하면(패딩 ↔ 패딩점퍼) 일치로 본다.
function tokenSimilarity(ta, tb) {
  if (ta.length === 0 || tb.length === 0) return 0
  const hit = (t, list) => list.some((o) => o === t || (t.length >= 2 && o.length >= 2 && (o.includes(t) || t.includes(o))))
  const matched = ta.filter((t) => hit(t, tb)).length + tb.filter((t) => hit(t, ta)).length
  return matched / (ta.length + tb.length)
}

/** 물품 이름 유사도 (0~1). 예: "아디다스 겨울 패딩" ↔ "겨울 패딩 점퍼" */
export function nameSimilarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  return Math.max(bigramDice(na, nb), tokenSimilarity(tokenize(a), tokenize(b)))
}

/**
 * 카테고리 일치도 (0~1). 양쪽이 고른 세부 카테고리 각각에 대해 상대편에서 가장 잘 맞는 것을 찾아
 * (같은 세부 카테고리 1, 같은 큰 카테고리 0.5, 그 외 0) 전부 평균 낸다.
 * 많이 겹칠수록 높고, 관계없는 카테고리를 잔뜩 고르면 평균이 내려간다.
 */
export function categorySimilarity(a, b) {
  if (a.length === 0 || b.length === 0) return 0
  const best = (leaf, others) =>
    Math.max(...others.map((o) => (o === leaf ? 1 : parentOf(o) === parentOf(leaf) ? SAME_PARENT_SCORE : 0)))
  const total = a.reduce((sum, leaf) => sum + best(leaf, b), 0) + b.reduce((sum, leaf) => sum + best(leaf, a), 0)
  return total / (a.length + b.length)
}

/** 수량 충족률 (0~1): 필요 수량 이상이면 1, 모자라면 비율만큼 감점 */
export function quantityFulfillment(supply, need) {
  if (need <= 0) return 1
  return Math.min(1, Math.max(0, supply) / need)
}

function scoreMatch({ categories, title, supplyQty, needQty, condition, target }) {
  const categoryScore = categorySimilarity(categories, target.categories)
  const nameScore = nameSimilarity(title, target.title)
  if (categoryScore === 0 && nameScore < NAME_GATE) return null

  const breakdown = {
    category: categoryScore,
    name: nameScore,
    quantity: quantityFulfillment(supplyQty, needQty),
    condition: CONDITION_SCORE[condition] ?? 0.5,
  }
  const total =
    breakdown.category * WEIGHTS.category +
    breakdown.name * WEIGHTS.name +
    breakdown.quantity * WEIGHTS.quantity +
    breakdown.condition * WEIGHTS.condition

  return { ...target, score: Math.round(total * 100), breakdown }
}

function rank(list) {
  return list.filter(Boolean).sort((x, y) => y.score - x.score)
}

/**
 * 기부자 입력값을 기관 필요 목록과 대조해 점수 순으로 돌려준다.
 * 전체 후보를 반환하고, 상위 N개만 보여주는 건 화면(MatchList)에서 처리한다.
 * 각 결과에는 기부 방법 안내용 기관 정보(institution)를 붙인다.
 */
export function matchDonorToInstitutions({ categories, title, quantity, condition }) {
  const qty = Number(quantity) || 0
  const matches = rank(
    getInstitutionNeeds().map((need) =>
      scoreMatch({
        categories,
        title,
        supplyQty: qty,
        needQty: need.quantity,
        condition,
        target: { ...need, institution: findInstitution(need.org) },
      }),
    ),
  )
  const base = parentsOf(categories).reduce((max, p) => Math.max(max, CATEGORY_BASE_CREDIT[p] ?? 10), 10)
  const estimatedCredit = base + qty * 10
  return { matches, estimatedCredit }
}

/**
 * 기관 입력값을 기부 등록 목록과 대조해 점수 순으로 돌려준다.
 * 기부 가능 기간이 지난 물품은 받을 수 없으므로 후보에서 뺀다.
 */
export function matchInstitutionToDonors({ categories, title, quantity }) {
  const need = Number(quantity) || 0
  const matches = rank(
    getDonorItems()
      .filter((item) => !isExpired(item.availableUntil))
      .map((item) =>
        scoreMatch({
          categories,
          title,
          supplyQty: item.quantity,
          needQty: need,
          condition: item.condition,
          target: item,
        }),
      ),
  )
  return { matches, requestedQuantity: need }
}

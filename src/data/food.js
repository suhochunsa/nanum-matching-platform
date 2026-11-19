// 식품 안전 규칙 (DB의 20261117000000_food_safety.sql과 같은 규칙)
// - 식품 = 범주가 '식품/...'인 물품
// - 소비기한·개봉 여부·보관 방법·라벨 사진·소비기한 표시 사진이 모두 있어야 하고, 소비기한이 지나면 매칭하지 않는다.
// - 소비기한이 식품 종류의 보통 기간보다 길면 경고만 한다(설탕·소금처럼 원래 오래가는 식품도 있으므로 막지 않음).
//   기관은 소비기한 표시 사진의 날짜와 입력값을 대조한다.
// - 냉장·냉동 식품도 택배로 보낼 수 있다. (기관 화면에 받는 즉시 상태를 확인하라는 안내만 보여준다)

import { daysLeft, formatDate, isExpired } from './dates.js'

export const FOOD_STORAGE = { room: '상온', fridge: '냉장', frozen: '냉동' }
export const COLD_STORAGE = ['fridge', 'frozen']

// 식품 세부 범주별로 '보통 이 정도 남아 있으면 자연스러운' 기간(일). 대략적인 기준이다.
//   즉석밥·과자·음료·라면은 길어야 1년 안팎, 통조림은 몇 년까지 가는 경우가 많다.
// 남은 기간이 이보다 길면 입력 실수일 수 있어 경고만 한다. (여러 범주를 고르면 가장 긴 기준을 쓴다)
export const TYPICAL_SHELF_LIFE_DAYS = {
  '식품/즉석식품': 365,
  '식품/통조림': 365 * 5,
  '식품/라면·면류': 365,
  '식품/쌀·곡물': 365,
  '식품/간식·음료': 365,
}
const DEFAULT_SHELF_LIFE_DAYS = 365 * 2

// '즉석식품은', '라면·면류는' (마지막 글자 받침에 따라)
function withTopic(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return word + (code >= 0 && code <= 11171 && code % 28 !== 0 ? '은' : '는')
}

function durationLabel(days) {
  return days >= 365 ? `${Math.round(days / 365)}년` : `${Math.max(1, Math.round(days / 30))}개월`
}

/**
 * 소비기한이 비정상적으로 긴지 판단한다. 아니면 null.
 * item: { categories, foodExpiry }
 * 돌려주는 값: { left: '약 4년', typical: '라면·면류는 보통 1년', expiryLabel: '2030년 1월 1일' }
 */
export function expiryWarning(item) {
  if (!isFood(item.categories) || !item.foodExpiry) return null
  const leaves = item.categories.filter((leaf) => leaf.startsWith('식품/'))
  const [leaf, limit] = leaves
    .map((l) => [l, TYPICAL_SHELF_LIFE_DAYS[l] ?? DEFAULT_SHELF_LIFE_DAYS])
    .sort((a, b) => b[1] - a[1])[0]
  const left = daysLeft(item.foodExpiry)
  if (left <= limit) return null
  return {
    left: `약 ${durationLabel(left)}`,
    typical: `${withTopic(leaf.split('/')[1])} 보통 ${durationLabel(limit)} 이내`,
    expiryLabel: `${item.foodExpiry.slice(0, 4)}년 ${formatDate(item.foodExpiry)}`,
  }
}

export function isFood(categories) {
  return (categories ?? []).some((leaf) => leaf.startsWith('식품/'))
}

/**
 * 식품 물품의 매칭 가능 상태.
 * 'none'(식품 아님) | 'missing'(소비기한·사진 정보 없음) | 'expired'(소비기한 지남) | 'ok'
 */
export function foodState(item) {
  if (!isFood(item.categories)) return 'none'
  if (!item.foodExpiry || !item.foodExpiryPhoto) return 'missing'
  if (isExpired(item.foodExpiry)) return 'expired'
  return 'ok'
}

/** 자동 매칭 후보가 될 수 있는지 (식품이 아니면 항상 true) */
export function isFoodMatchable(item) {
  const state = foodState(item)
  return state === 'none' || state === 'ok'
}

/** '소비기한 11월 20일 · 냉장 · 미개봉' */
export function foodSummary(item) {
  if (!item.foodExpiry) return '식품 정보 없음'
  return [
    `소비기한 ${formatDate(item.foodExpiry)}`,
    FOOD_STORAGE[item.foodStorage] ?? '',
    item.foodOpened ? '개봉함' : '미개봉',
  ]
    .filter(Boolean)
    .join(' · ')
}

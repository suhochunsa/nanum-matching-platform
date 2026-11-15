// 식품 안전 규칙 (DB의 20261117000000_food_safety.sql과 같은 규칙)
// - 식품 = 범주가 '식품/...'인 물품
// - 소비기한·개봉 여부·보관 방법·라벨 사진이 모두 있어야 하고, 소비기한이 지나면 매칭하지 않는다.
// - 냉장·냉동 식품은 택배로 보낼 수 없다.

import { formatDate, isExpired } from './dates.js'

export const FOOD_STORAGE = { room: '상온', fridge: '냉장', frozen: '냉동' }
export const COLD_STORAGE = ['fridge', 'frozen']

export function isFood(categories) {
  return (categories ?? []).some((leaf) => leaf.startsWith('식품/'))
}

/**
 * 식품 물품의 매칭 가능 상태.
 * 'none'(식품 아님) | 'missing'(소비기한·라벨 정보 없음) | 'expired'(소비기한 지남) | 'ok'
 */
export function foodState(item) {
  if (!isFood(item.categories)) return 'none'
  if (!item.foodExpiry) return 'missing'
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

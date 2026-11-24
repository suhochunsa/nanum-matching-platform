// 기부 물품·필요 물품의 상태 이름 (DB의 status 값 → 화면에 보이는 말)
import { availabilityLabel } from './dates.js'

export const ITEM_STATUS = {
  available: '기부 가능',
  matched: '매칭됨',
  donated: '기부 완료',
}

export const NEED_STATUS = {
  open: '모집 중',
  fulfilled: '모집 완료',
}

// 매칭됨은 요청 수락 시, 기부 완료는 기부자·기관이 모두 전달 완료를 누를 때 DB가 지정한다.
// 매칭과 상관없는 물품만 사용자가 직접 기부 완료로 바꿀 수 있다.
export const ITEM_STATUS_CHOICES = ['available', 'donated']
export const NEED_STATUS_CHOICES = ['open', 'fulfilled']

/** 확정된 매칭에서 내가 아직 전달 완료를 누르지 않았는지 (요청함 행 기준) */
export function needsMyCompletion(row) {
  return row.status === 'confirmed' && !(row.my_side === 'donor' ? row.donor_done : row.institution_done)
}

/**
 * 내 기부 물품 목록의 기부 가능 기간 문구.
 * 기부 가능한 물품만 마감일·D-day를 보여준다. 매칭 확정·기부 완료된 물품은 기한이 의미 없으므로 null.
 */
export function itemPeriodLabel(item) {
  return item.status === 'available' ? `기부 가능: ${availabilityLabel(item.availableUntil)}` : null
}

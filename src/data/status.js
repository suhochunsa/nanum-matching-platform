// 기부 물품·필요 물품의 상태 이름 (DB의 status 값 → 화면에 보이는 말)

export const ITEM_STATUS = {
  available: '기부 가능',
  matched: '매칭됨',
  donated: '기부 완료',
}

export const NEED_STATUS = {
  open: '모집 중',
  fulfilled: '모집 완료',
}

// 마이페이지에서 사용자가 직접 고를 수 있는 상태 ('매칭됨'은 8차시 매칭 기능에서 쓸 예정)
export const ITEM_STATUS_CHOICES = ['available', 'donated']
export const NEED_STATUS_CHOICES = ['open', 'fulfilled']

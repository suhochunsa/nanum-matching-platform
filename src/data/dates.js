// 기부 가능 기간(마감일) 계산.
// 날짜는 'YYYY-MM-DD' 문자열로 다룬다. (date 입력칸 값, DB 저장값과 같은 형식)
// 같은 형식의 문자열은 사전 순서와 날짜 순서가 같아서 < 로 바로 비교할 수 있다.

/** 오늘 날짜 (사용자 컴퓨터의 현지 시간 기준) */
export function todayString() {
  return toDateString(new Date())
}

function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 오늘에서 n일 뒤(음수면 전) 날짜. mock 데이터의 마감일을 오늘 기준으로 만들 때 쓴다. */
export function daysFromToday(n) {
  const date = new Date()
  date.setDate(date.getDate() + n)
  return toDateString(date)
}

/** 마감일이 지났는지. 마감일 당일까지는 기부 가능하고, 마감일이 없으면(null) 만료되지 않는다. */
export function isExpired(until) {
  return Boolean(until) && until < todayString()
}

/** 오늘부터 마감일까지 남은 날 수 (당일이면 0) */
export function daysLeft(until) {
  const [y, m, d] = until.split('-').map(Number)
  const [ty, tm, td] = todayString().split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000)
}

/** '2026-10-30' → '10월 30일' */
export function formatDate(date) {
  const [, m, d] = date.split('-').map(Number)
  return `${m}월 ${d}일`
}

/**
 * 카드·목록에 보여줄 기부 가능 기간 문구.
 * 마감일 없음 → '기한 없음', 오늘 → '오늘까지', 남음 → '10월 30일까지 · D-4', 지남 → '10월 20일 만료'
 */
export function availabilityLabel(until) {
  if (!until) return '기한 없음'
  const left = daysLeft(until)
  if (left < 0) return `${formatDate(until)} 만료`
  if (left === 0) return '오늘까지'
  return `${formatDate(until)}까지 · D-${left}`
}

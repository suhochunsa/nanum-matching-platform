// 상단 종 알림: 요청함 데이터(get_my_matching_dashboard의 requests)로 알림 목록을 만든다.
// - 할 일 알림(action): 받은 요청에 응답하기, 내 전달 완료 누르기 → 처리할 때까지 숫자에 계속 포함
// - 소식 알림(info): 상대가 수락·거절·취소·최종 완료함 → 종을 열어 보면 숫자에서 빠진다 (seenAt 이후 것만 '새 알림')
import { needsMyCompletion } from './status.js'

const INFO_DAYS = 30 // 소식 알림은 최근 30일 것만 보여준다

/** 상대방 이름 + 조사: 기관은 'OO복지관에서', 기부자는 'OO님이' */
export function otherSubject(row) {
  return row.my_side === 'donor' ? `${row.other_name}에서` : `${row.other_name}님이`
}

function otherDone(row) {
  return row.my_side === 'donor' ? row.institution_done : row.donor_done
}

function message(row) {
  const item = `‘${row.item_title}’`
  const who = otherSubject(row)
  switch (row.status) {
    case 'requested':
      return `${who} ${item} 매칭을 요청했어요. 수락하거나 거절해 주세요.`
    case 'confirmed': {
      const deliver = row.my_side === 'donor' ? '물품을 보낸 뒤' : '물품을 받은 뒤'
      if (otherDone(row)) return `${who} ${item} 전달 완료를 눌렀어요. ${deliver} 전달 완료를 눌러 주세요.`
      if (row.event_by_other) return `${who} ${item} 요청을 수락했어요. ${deliver} 전달 완료를 눌러 주세요.`
      return `${item} 매칭이 확정됐어요. ${deliver} 전달 완료를 눌러 주세요.`
    }
    case 'rejected':
      return `${who} ${item} 요청을 거절했어요.`
    case 'cancelled':
      if (row.cancel_kind === 'confirmed') return `${who} 확정된 ${item} 매칭을 취소했어요.`
      if (row.cancel_kind === 'auto') return `${item} 요청이 취소됐어요. 다른 매칭이 먼저 확정됐어요.`
      return `${who} ${item} 요청을 취소했어요.`
    case 'completed':
      return row.my_side === 'donor'
        ? `${item} 전달이 최종 완료됐어요. ${row.credit_amount.toLocaleString()} 크레딧이 적립됐어요.`
        : `${item} 전달이 최종 완료됐어요.`
    default:
      return ''
  }
}

/** 지금 내가 처리해야 하는 요청인지 */
export function isMyAction(row) {
  return (row.incoming && row.status === 'requested') || needsMyCompletion(row)
}

/**
 * requests: 요청함 행 목록, seenAt: 마지막으로 종을 열어 본 시각(ms), now: 지금(ms, 테스트용)
 * 돌려주는 값: { items: [{ id, action, unread, text, at, time, direction }], count }
 *   count = 할 일 알림 수 + 아직 안 본 소식 알림 수 (종 아이콘의 빨간 숫자)
 */
export function buildNotifications(requests, seenAt, now = Date.now()) {
  const since = now - INFO_DAYS * 24 * 60 * 60 * 1000
  const items = []
  for (const row of requests) {
    const at = row.event_at ? Date.parse(row.event_at) : 0
    const action = isMyAction(row)
    const info = !action && row.event_by_other && row.status !== 'requested' && row.status !== 'confirmed' && at >= since
    if (!action && !info) continue
    items.push({
      id: row.id,
      action,
      unread: action || at > seenAt,
      text: message(row),
      at: row.event_at,
      time: at,
      direction: row.incoming ? 'received' : 'sent',
    })
  }
  // 할 일 먼저, 그다음 최근 순
  items.sort((a, b) => Number(b.action) - Number(a.action) || b.time - a.time)
  return { items, count: items.filter((n) => n.unread).length }
}

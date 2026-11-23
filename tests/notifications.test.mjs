// 상단 종 알림 목록·숫자 규칙
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildNotifications } from '../src/data/notifications.js'

const now = Date.parse('2026-11-23T12:00:00Z')
const at = (minutesAgo) => new Date(now - minutesAgo * 60000).toISOString()
const row = (extra) => ({
  id: 'm', status: 'requested', incoming: false, my_side: 'donor', other_name: '햇살보육원', item_title: '겨울 패딩',
  donor_done: false, institution_done: false, credit_amount: 50, event_by_other: false, event_at: at(5), ...extra,
})

test('할 일은 본 뒤에도 숫자에 남고, 소식은 종을 열어 본 뒤 숫자에서 빠진다', () => {
  const requests = [
    row({ id: 'incoming', incoming: true, event_by_other: true }), // 받은 요청 → 할 일
    row({ id: 'rejected', status: 'rejected', event_by_other: true, event_at: at(10) }), // 상대가 거절 → 소식
  ]
  const before = buildNotifications(requests, now - 60 * 60000, now)
  assert.equal(before.count, 2)
  assert.deepEqual(before.items.map((n) => n.id), ['incoming', 'rejected']) // 할 일이 먼저
  const after = buildNotifications(requests, now, now) // 방금 종을 열어 봄
  assert.equal(after.count, 1)
  assert.equal(after.items.find((n) => n.id === 'rejected').unread, false)
})

test('알림 문구: 기부자에게 기관은 "에서", 기관에게 기부자는 "님이"', () => {
  const [forDonor] = buildNotifications([row({ incoming: true, event_by_other: true })], now, now).items
  assert.equal(forDonor.text, '햇살보육원에서 ‘겨울 패딩’ 매칭을 요청했어요. 수락하거나 거절해 주세요.')
  const [forOrg] = buildNotifications([row({ incoming: true, my_side: 'institution', other_name: '나눔왕', event_by_other: true })], now, now).items
  assert.match(forOrg.text, /^나눔왕님이 ‘겨울 패딩’/)
})

test('확정된 매칭: 내 전달 완료 차례면 할 일, 상대가 먼저 눌렀으면 그렇게 알려준다', () => {
  const [mine] = buildNotifications([row({ status: 'confirmed', institution_done: true, event_by_other: true })], now, now).items
  assert.equal(mine.action, true)
  assert.match(mine.text, /전달 완료를 눌렀어요\. 물품을 보낸 뒤 전달 완료를 눌러 주세요/)
  // 내가 이미 눌렀으면 알림 없음 (상대 차례)
  assert.equal(buildNotifications([row({ status: 'confirmed', donor_done: true })], now, now).items.length, 0)
})

test('상대가 확정 매칭을 취소하거나 최종 완료하면 소식, 내가 한 일·30일 지난 일은 알림 없음', () => {
  const list = buildNotifications([
    row({ id: 'c', status: 'cancelled', cancel_kind: 'confirmed', event_by_other: true }),
    row({ id: 'done', status: 'completed', event_by_other: true }),
    row({ id: 'mine', status: 'cancelled', cancel_kind: 'request', event_by_other: false }),
    row({ id: 'old', status: 'rejected', event_by_other: true, event_at: at(60 * 24 * 31) }),
  ], now - 1000 * 60000, now).items
  assert.deepEqual(list.map((n) => n.id).sort(), ['c', 'done'])
  assert.equal(list.find((n) => n.id === 'c').text, '햇살보육원에서 확정된 ‘겨울 패딩’ 매칭을 취소했어요.')
  assert.match(list.find((n) => n.id === 'done').text, /50 크레딧이 적립됐어요/)
})

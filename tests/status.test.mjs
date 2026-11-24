// 내 기부 물품 목록의 기간 문구
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysFromToday } from '../src/data/dates.js'
import { itemPeriodLabel } from '../src/data/status.js'

test('기부 가능한 물품만 D-day를 보여주고, 매칭 확정·기부 완료된 물품은 기한을 숨긴다', () => {
  const until = daysFromToday(37)
  assert.match(itemPeriodLabel({ status: 'available', availableUntil: until }), /^기부 가능: .*D-37$/)
  assert.equal(itemPeriodLabel({ status: 'available', availableUntil: null }), '기부 가능: 기한 없음')
  assert.equal(itemPeriodLabel({ status: 'matched', availableUntil: until }), null)
  assert.equal(itemPeriodLabel({ status: 'donated', availableUntil: until }), null)
  assert.equal(itemPeriodLabel({ status: 'donated', availableUntil: daysFromToday(-3) }), null) // '만료'도 뜨지 않음
})

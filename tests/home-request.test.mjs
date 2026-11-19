// 홈 화면에서 기관이 기부 물품을 바로 요청할 때 쓰는 판단 함수
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysFromToday } from '../src/data/dates.js'
import { itemRequestBlock } from '../src/data/matching.js'

const item = {
  id: 'i1', ownerId: 'donor', status: 'available', title: '아동 겨울 패딩', categories: ['의류/아우터', '의류/아동복'],
  quantity: 3, condition: '새 상품', methods: ['parcel'], availableUntil: daysFromToday(10),
}

test('요청할 수 없는 물품은 이유를 알려준다', () => {
  assert.equal(itemRequestBlock(item), '')
  assert.match(itemRequestBlock({ ...item, ownerId: null }), /예시 물품/)
  assert.match(itemRequestBlock({ ...item, status: 'matched' }), /이미 매칭/)
  assert.match(itemRequestBlock({ ...item, availableUntil: daysFromToday(-1) }), /기간이 지난/)
  const food = { ...item, title: '봉지 라면', categories: ['식품/라면·면류'] }
  assert.match(itemRequestBlock(food), /정보가 없는 식품/)
  assert.match(itemRequestBlock({ ...food, foodExpiry: daysFromToday(-1), foodExpiryPhoto: 'x.jpg', availableUntil: daysFromToday(5) }), /소비기한이 지난/)
  assert.equal(itemRequestBlock({ ...food, foodExpiry: daysFromToday(5), foodExpiryPhoto: 'x.jpg', availableUntil: daysFromToday(5) }), '')
  assert.match(itemRequestBlock({ ...food, foodExpiry: daysFromToday(5), availableUntil: daysFromToday(5) }), /정보가 없는 식품/)
})

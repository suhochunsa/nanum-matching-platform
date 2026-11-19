// 홈 화면에서 기관이 기부 물품을 바로 요청할 때 쓰는 판단 함수
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysFromToday } from '../src/data/dates.js'
import { itemRequestBlock, rankNeedsForItem } from '../src/data/matching.js'

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
  assert.match(itemRequestBlock({ ...food, foodExpiry: daysFromToday(-1), availableUntil: daysFromToday(5) }), /소비기한이 지난/)
  assert.equal(itemRequestBlock({ ...food, foodExpiry: daysFromToday(5), availableUntil: daysFromToday(5) }), '')
})

test('내 필요 물품을 점수 순으로, 조건이 안 맞는 것은 맨 뒤에 점수 없이', () => {
  const needs = [
    { id: 'n-books', title: '초등 문제집', categories: ['학용품/도서·문제집'], quantity: 10 },
    { id: 'n-shoes', title: '아동 운동화', categories: ['의류/신발', '의류/아동복'], quantity: 5 },
    { id: 'n-coat', title: '아동 겨울 외투', categories: ['의류/아우터', '의류/아동복'], quantity: 3 },
  ]
  const ranked = rankNeedsForItem(item, needs)
  assert.deepEqual(ranked.map((n) => n.id), ['n-coat', 'n-shoes', 'n-books'])
  assert.ok(ranked[0].score > ranked[1].score)
  assert.equal(ranked[2].score, null)
})

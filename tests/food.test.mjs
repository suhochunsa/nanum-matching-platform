// 식품 규칙의 화면 쪽 검사 (입력값 검사·매칭 후보 제외). DB 쪽 규칙은 matching.test.mjs에서 검사한다.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysFromToday } from '../src/data/dates.js'
import { foodState, foodSummary, isFood, maxExpiryDate } from '../src/data/food.js'
import { matchInstitutionToDonors } from '../src/data/matching.js'
import { validateDonor, validateDonorItemEdit } from '../src/data/validation.js'

const label = { name: 'label.jpg', type: 'image/jpeg', size: 1000 }
const base = {
  donorName: '정수호', donorPhone: '010-1234-5678', region: '서울 마포구', photo: null,
  title: '봉지 라면', categories: ['식품/라면·면류'], condition: '새 상품', quantity: '2',
  availableUntil: '', noDeadline: false, detail: '', methods: ['pickup'],
  foodExpiry: daysFromToday(10), foodOpened: 'unopened', foodStorage: 'room', foodLabel: label, foodExpiryPhoto: label,
}

test('식품 범주를 하나라도 고르면 식품이다', () => {
  assert.equal(isFood(['식품/통조림']), true)
  assert.equal(isFood(['의류/아우터', '식품/간식·음료']), true)
  assert.equal(isFood(['의류/아우터']), false)
})

test('식품은 소비기한·개봉 여부·보관 방법·라벨 사진이 모두 필요하다', () => {
  assert.deepEqual(validateDonor(base), {})
  const errors = validateDonor({ ...base, foodExpiry: '', foodOpened: '', foodStorage: '', foodLabel: null, foodExpiryPhoto: null })
  // 화면 순서대로 (첫 오류 칸으로 커서가 간다)
  assert.deepEqual(Object.keys(errors), ['foodExpiry', 'foodExpiryPhoto', 'foodOpened', 'foodStorage', 'foodLabel'])
  assert.match(validateDonor({ ...base, foodExpiry: daysFromToday(-1) }).foodExpiry, /지난/)
  // 식품은 기부 가능 마감일 칸을 검사하지 않는다 (소비기한으로 대신)
  assert.equal(validateDonor(base).availableUntil, undefined)
})

test('냉장·냉동 식품도 택배를 고를 수 있다', () => {
  assert.deepEqual(validateDonor({ ...base, foodStorage: 'frozen', methods: ['parcel'] }), {})
  assert.deepEqual(validateDonor({ ...base, foodStorage: 'room', methods: ['parcel'] }), {})
})

test('일반 물품에는 식품 칸을 요구하지 않는다', () => {
  const clothes = { ...base, categories: ['의류/아우터'], availableUntil: daysFromToday(5), foodExpiry: '', foodOpened: '', foodStorage: '', foodLabel: null, foodExpiryPhoto: null }
  assert.deepEqual(validateDonor(clothes), {})
})

test('기관 매칭 후보에서 소비기한 지남·식품 정보 없음은 빠진다', () => {
  const item = (id, extra) => ({ id, title: '봉지 라면', categories: ['식품/라면·면류'], quantity: 5, condition: '새 상품', status: 'available', methods: ['pickup'], ...extra })
  const data = {
    donorItems: [
      item('ok', { foodExpiry: daysFromToday(3), foodExpiryPhoto: 'x.jpg', availableUntil: daysFromToday(3) }),
      item('expired', { foodExpiry: daysFromToday(-1), foodExpiryPhoto: 'x.jpg', availableUntil: daysFromToday(-1) }),
      item('no-photo', { foodExpiry: daysFromToday(3), availableUntil: daysFromToday(3) }),
      item('missing', { availableUntil: daysFromToday(30) }),
      { ...item('clothes', {}), title: '라면 모양 인형', categories: ['기타/장난감·게임'] },
    ],
  }
  const ids = matchInstitutionToDonors({ categories: ['식품/라면·면류'], title: '라면', quantity: 3 }, data).matches.map((m) => m.id)
  assert.deepEqual(ids.sort(), ['clothes', 'ok'])
  assert.equal(foodState(data.donorItems[1]), 'expired')
  assert.equal(foodState(data.donorItems[2]), 'missing')
})

test('식품 요약과 마이페이지 마감일 제한', () => {
  assert.match(foodSummary({ foodExpiry: '2026-11-20', foodStorage: 'fridge', foodOpened: true }), /소비기한 11월 20일 · 냉장 · 개봉함/)
  const edit = { quantity: '1', availableUntil: daysFromToday(9), noDeadline: false, originalUntil: daysFromToday(5), maxUntil: daysFromToday(7) }
  assert.match(validateDonorItemEdit(edit).availableUntil, /소비기한보다 늦게/)
  assert.match(validateDonorItemEdit({ ...edit, noDeadline: true }).availableUntil, /소비기한보다 늦게/)
  assert.equal(validateDonorItemEdit({ ...edit, availableUntil: daysFromToday(6) }).availableUntil, undefined)
})

test('소비기한은 3년 이내만, 소비기한 사진이 없으면 매칭 불가', () => {
  assert.equal(validateDonor({ ...base, foodExpiry: maxExpiryDate() }).foodExpiry, undefined)
  const [y, m, d] = maxExpiryDate().split('-')
  const tooLate = `${y}-${m}-${String(Number(d) + 1).padStart(2, '0')}`
  assert.match(validateDonor({ ...base, foodExpiry: tooLate > maxExpiryDate() ? tooLate : `${Number(y) + 1}-01-01` }).foodExpiry, /3년보다 길게/)
  assert.match(validateDonor({ ...base, foodExpiryPhoto: null }).foodExpiryPhoto, /소비기한이 찍힌 부분/)
  assert.equal(foodState({ categories: ['식품/통조림'], foodExpiry: daysFromToday(5) }), 'missing')
})

// 3차시 "입력값 확인": 폼 값을 검사해 { 필드이름: 오류 메시지 } 형태로 돌려준다.
// 오류가 없으면 빈 객체.

export const MAX_PHOTO_MB = 5
export const MAX_DETAIL_LENGTH = 300

// 휴대폰(010-1234-5678)과 일반 전화(02-123-4567, 031-1234-5678) 모두 허용, 하이픈은 선택
const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/

// 마지막 글자 받침 유무에 따라 조사를 고른다. (이름을 / 위치를)
function withJosa(word, batchim, noBatchim) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0
  return word + (hasBatchim ? batchim : noBatchim)
}

function checkText(value, label, { min = 1, max }) {
  const text = String(value ?? '').trim()
  if (!text) return `${withJosa(label, '을', '를')} 입력해 주세요.`
  if (text.length < min) return `${withJosa(label, '은', '는')} ${min}자 이상 입력해 주세요.`
  if (text.length > max) return `${withJosa(label, '은', '는')} ${max}자 이하로 입력해 주세요.`
}

function checkQuantity(value) {
  const n = Number(value)
  if (value === '' || !Number.isInteger(n)) return '수량을 정수로 입력해 주세요.'
  if (n < 1 || n > 999) return '수량은 1~999 사이로 입력해 주세요.'
}

function checkPhone(value) {
  const text = String(value ?? '').trim()
  if (!text) return '연락처를 입력해 주세요.'
  if (!PHONE_RE.test(text)) return '연락처 형식이 올바르지 않아요. (예: 010-1234-5678)'
}

function checkPhoto(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) return '이미지 파일만 올릴 수 있어요.'
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) return `사진은 ${MAX_PHOTO_MB}MB 이하만 올릴 수 있어요.`
}

function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message))
}

// 키 순서 = 화면의 입력칸 순서 (제출 시 첫 번째 오류 칸으로 포커스를 옮기기 때문)
export function validateDonor(v) {
  return compact({
    donorName: checkText(v.donorName, '이름', { min: 2, max: 20 }),
    donorPhone: checkPhone(v.donorPhone),
    photo: checkPhoto(v.photo),
    title: checkText(v.title, '물품 이름', { min: 2, max: 40 }),
    quantity: checkQuantity(v.quantity),
    detail:
      v.detail.length > MAX_DETAIL_LENGTH
        ? `상세 정보는 ${MAX_DETAIL_LENGTH}자 이하로 입력해 주세요.`
        : undefined,
  })
}

// 키 순서 = 화면의 입력칸 순서 (제출 시 첫 번째 오류 칸으로 포커스를 옮기기 때문)
export function validateInstitution(v) {
  return compact({
    title: checkText(v.title, '필요 물품 이름', { min: 2, max: 40 }),
    quantity: checkQuantity(v.quantity),
    orgName: checkText(v.orgName, '기관명', { min: 2, max: 30 }),
    orgLocation: checkText(v.orgLocation, '위치', { min: 2, max: 60 }),
    orgPhone: checkPhone(v.orgPhone),
  })
}

// 임시 데이터베이스.
// mock 데이터(mockData.js)에 사용자가 "데이터베이스에 등록하기"로 추가한 항목을 더해서 돌려준다.
// 추가한 항목은 이 브라우저의 localStorage에만 저장된다. (다른 사람·다른 기기에서는 안 보임)
// TODO(6~7차시): 이 파일의 함수들을 Supabase 조회·저장으로 교체하면 화면 코드는 그대로 쓸 수 있다.

import { donorItems, institutionNeeds, institutions } from './mockData.js'

const STORAGE_KEY = 'nanum-mock-db-v1'
const EMPTY = { donorItems: [], institutionNeeds: [], institutions: [] }

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved ? { ...EMPTY, ...saved } : EMPTY
  } catch {
    return EMPTY
  }
}

function save(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    return true
  } catch {
    return false
  }
}

// 새로 등록한 항목이 앞에 오도록 한다.
export function getDonorItems() {
  return [...load().donorItems, ...donorItems]
}

export function getInstitutionNeeds() {
  return [...load().institutionNeeds, ...institutionNeeds]
}

/** 기관명으로 기관 정보를 찾는다. 같은 이름으로 다시 등록하면 새 정보가 우선한다. */
export function findInstitution(name) {
  return load().institutions.find((i) => i.name === name) ?? institutions.find((i) => i.name === name)
}

/** 기부 물품 등록. 저장에 실패하면 null */
export function addDonorItem(item) {
  const db = load()
  const saved = { ...item, id: `d-${Date.now()}` }
  return save({ ...db, donorItems: [saved, ...db.donorItems] }) ? saved : null
}

/** 기관 필요 물품 등록 + 기관 정보 저장(같은 이름이면 덮어씀). 저장에 실패하면 null */
export function addInstitutionNeed(need, institution) {
  const db = load()
  const saved = { ...need, id: `n-${Date.now()}`, org: institution.name }
  const others = db.institutions.filter((i) => i.name !== institution.name)
  const ok = save({
    ...db,
    institutionNeeds: [saved, ...db.institutionNeeds],
    institutions: [institution, ...others],
  })
  return ok ? saved : null
}

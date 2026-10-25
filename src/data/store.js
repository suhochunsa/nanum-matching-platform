// 데이터 저장소.
// - 읽기(6차시): Supabase DB의 기관·필요 물품·기부 물품 표에서 불러온다.
//   DB에 연결하지 못하면 mockData.js의 예시 데이터를 대신 쓰고, 화면에 그 사실을 알린다.
// - 쓰기: 아직은 "데이터베이스에 등록하기"로 추가한 항목을 이 브라우저의 localStorage에만 저장하고,
//   불러올 때 DB 데이터 앞에 합쳐서 보여준다.
//   TODO(7차시): addDonorItem / addInstitutionNeed를 Supabase insert로 바꾸고 localStorage 부분을 지운다.

import { supabase } from '../lib/supabase.js'
import { donorItems, institutionNeeds, institutions } from './mockData.js'

const STORAGE_KEY = 'nanum-mock-db-v1'
const EMPTY = { donorItems: [], institutionNeeds: [], institutions: [] }

function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved ? { ...EMPTY, ...saved } : EMPTY
  } catch {
    return EMPTY
  }
}

function saveLocal(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    return true
  } catch {
    return false
  }
}

// DB의 행(snake_case)을 화면 코드가 쓰는 모양(camelCase, mockData.js와 같은 필드)으로 바꾼다.
function toDonorItem(row) {
  return {
    id: row.id,
    categories: row.categories,
    title: row.title,
    quantity: row.quantity,
    condition: row.condition,
    donor: row.donor_display,
    region: row.region,
    methods: row.methods,
    availableUntil: row.available_until,
    detail: row.detail,
    photo: row.photo_url,
    status: row.status,
  }
}

function toInstitutionNeed(row) {
  return {
    id: row.id,
    categories: row.categories,
    title: row.title,
    quantity: row.quantity,
    org: row.institutions.name,
    requestedAt: row.requested_at,
  }
}

function toInstitution(row) {
  return { name: row.name, location: row.location, phone: row.phone, hours: row.hours, methods: row.methods }
}

async function fetchFromSupabase() {
  const [items, needs, orgs] = await Promise.all([
    supabase.from('donor_items').select('*').order('created_at', { ascending: false }),
    supabase
      .from('institution_needs')
      .select('id, title, categories, quantity, requested_at, institutions (name)')
      .order('created_at', { ascending: false }),
    supabase.from('institutions').select('name, location, phone, hours, methods'),
  ])
  const error = items.error ?? needs.error ?? orgs.error
  if (error) throw error
  return {
    donorItems: items.data.map(toDonorItem),
    institutionNeeds: needs.data.map(toInstitutionNeed),
    institutions: orgs.data.map(toInstitution),
  }
}

/**
 * 화면에 필요한 데이터를 한 번에 불러온다.
 * @returns {Promise<{ donorItems, institutionNeeds, institutions, source: 'supabase' | 'mock', error?: string }>}
 *   source가 'mock'이면 DB 대신 예시 데이터를 쓴 것이고, error에 이유가 들어 있다.
 */
export async function loadData() {
  let remote
  try {
    if (!supabase) throw new Error('Supabase 접속 정보(VITE_SUPABASE_URL 등)가 설정되지 않았어요.')
    remote = { ...(await fetchFromSupabase()), source: 'supabase' }
  } catch (e) {
    remote = { donorItems, institutionNeeds, institutions, source: 'mock', error: e.message }
  }

  // 이 브라우저에서 등록한 항목을 앞에 붙인다. 같은 이름의 기관은 새로 등록한 정보가 우선한다.
  const local = loadLocal()
  const localOrgNames = new Set(local.institutions.map((i) => i.name))
  return {
    ...remote,
    donorItems: [...local.donorItems, ...remote.donorItems],
    institutionNeeds: [...local.institutionNeeds, ...remote.institutionNeeds],
    institutions: [...local.institutions, ...remote.institutions.filter((i) => !localOrgNames.has(i.name))],
  }
}

/** 기부 물품 등록 (지금은 이 브라우저에만). 저장에 실패하면 null */
export function addDonorItem(item) {
  const db = loadLocal()
  const saved = { ...item, id: `d-${Date.now()}` }
  return saveLocal({ ...db, donorItems: [saved, ...db.donorItems] }) ? saved : null
}

/** 기관 필요 물품 등록 + 기관 정보 저장(같은 이름이면 덮어씀). 저장에 실패하면 null */
export function addInstitutionNeed(need, institution) {
  const db = loadLocal()
  const saved = { ...need, id: `n-${Date.now()}`, org: institution.name }
  const others = db.institutions.filter((i) => i.name !== institution.name)
  const ok = saveLocal({
    ...db,
    institutionNeeds: [saved, ...db.institutionNeeds],
    institutions: [institution, ...others],
  })
  return ok ? saved : null
}

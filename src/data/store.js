// 데이터 저장소 (Supabase).
// - 읽기: 기관·필요 물품·기부 물품 표를 불러온다. 연결하지 못하면 mockData.js의 예시 데이터를 대신 쓰고 화면에 알린다.
// - 쓰기: 표에 직접 쓰지 않고 DB 함수(register_donor_item, register_institution_need)를 부른다.
//   함수가 입력을 검사하고 한 번에 저장한다. (supabase/migrations/20261026010000_register_functions.sql)
// - 사진: Storage의 item-photos 버킷에 올리고 그 주소를 저장한다.
// - 프로필(profiles): 로그인한 계정의 역할·닉네임·기관명·프로필 사진. 홈 화면 카드에 올린 사람으로 보여준다.

import { supabase } from '../lib/supabase.js'
import { donorItems, institutionNeeds, institutions } from './mockData.js'

const PHOTO_BUCKET = 'item-photos'
const AVATAR_BUCKET = 'avatars'

// DB의 행(snake_case)을 화면 코드가 쓰는 모양(camelCase, mockData.js와 같은 필드)으로 바꾼다.
function toDonorItem(row) {
  return {
    id: row.id,
    categories: row.categories,
    title: row.title,
    quantity: row.quantity,
    condition: row.condition,
    // 로그인해서 올린 물품은 지금 프로필의 닉네임·사진, 테스트 데이터는 가린 이름(김OO)
    donor: row.owner?.nickname ?? row.donor_display,
    donorAvatar: row.owner?.avatar_url ?? '',
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
    orgAvatar: row.institutions.owner?.avatar_url ?? '',
    requestedAt: row.requested_at,
  }
}

function toInstitution(row) {
  return { name: row.name, location: row.location, phone: row.phone, hours: row.hours, methods: row.methods }
}

/** Supabase 오류를 사용자에게 보여줄 문장으로 바꾼다. */
function friendlyError(error) {
  // DB 함수가 raise exception으로 보낸 한국어 메시지는 그대로 보여준다. (SQLSTATE P0001)
  if (error.code === 'P0001') return error.message
  if (error.code === '42501') return '로그인이 필요해요. 다시 로그인해 주세요.'
  if (error.code === '23514') return '입력값이 허용 범위를 벗어났어요. 입력 내용을 다시 확인해 주세요.'
  if (error.message?.includes('Failed to fetch')) return '데이터베이스에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'
  return `저장하지 못했어요. (${error.message})`
}

function requireClient() {
  if (!supabase) throw new Error('데이터베이스 접속 정보가 설정되지 않아 저장할 수 없어요.')
  return supabase
}

/**
 * 화면에 필요한 데이터를 한 번에 불러온다.
 * @returns {Promise<{ donorItems, institutionNeeds, institutions, source: 'supabase' | 'mock', error?: string }>}
 *   source가 'mock'이면 DB 대신 예시 데이터를 쓴 것이고, error에 이유가 들어 있다.
 */
export async function loadData() {
  try {
    const db = requireClient()
    const [items, needs, orgs] = await Promise.all([
      db.from('donor_items').select('*, owner:profiles (nickname, avatar_url)').order('created_at', { ascending: false }),
      db
        .from('institution_needs')
        .select('id, title, categories, quantity, requested_at, institutions (name, owner:profiles (avatar_url))')
        .order('created_at', { ascending: false }),
      db.from('institutions').select('name, location, phone, hours, methods'),
    ])
    const error = items.error ?? needs.error ?? orgs.error
    if (error) throw error
    return {
      donorItems: items.data.map(toDonorItem),
      institutionNeeds: needs.data.map(toInstitutionNeed),
      institutions: orgs.data.map(toInstitution),
      source: 'supabase',
    }
  } catch (e) {
    return { donorItems, institutionNeeds, institutions, source: 'mock', error: e.message }
  }
}

/** 줄인 사진(JPG Blob)을 Storage에 올리고 공개 주소를 돌려준다. */
export async function uploadItemPhoto(blob) {
  const db = requireClient()
  const path = `${crypto.randomUUID()}.jpg`
  const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw new Error(`사진을 올리지 못했어요. (${error.message})`)
  return db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

/** 기부자·기부 물품 등록. 성공하면 새 물품 id, 실패하면 이유가 담긴 Error를 던진다. */
export async function registerDonorItem(item) {
  const { data, error } = await requireClient().rpc('register_donor_item', {
    p_donor_name: item.donorName,
    p_donor_phone: item.donorPhone,
    p_title: item.title,
    p_categories: item.categories,
    p_quantity: item.quantity,
    p_condition: item.condition,
    p_detail: item.detail,
    p_region: item.region,
    p_methods: item.methods,
    p_available_until: item.availableUntil,
    p_photo_url: item.photoUrl,
  })
  if (error) throw new Error(friendlyError(error))
  return data
}

/**
 * 기관 필요 물품 등록. 기관명은 로그인한 기관 계정의 기관명을 DB가 직접 쓴다.
 * (처음이면 기관도 함께 등록, 이미 있으면 위치·연락처 등을 새 값으로 고친다) 실패하면 이유가 담긴 Error를 던진다.
 */
export async function registerInstitutionNeed(need, institution) {
  const { data, error } = await requireClient().rpc('register_institution_need', {
    p_location: institution.location,
    p_phone: institution.phone,
    p_hours: institution.hours,
    p_methods: institution.methods,
    p_title: need.title,
    p_categories: need.categories,
    p_quantity: need.quantity,
  })
  if (error) throw new Error(friendlyError(error))
  return data
}

/** 프로필 하나 불러오기. 없으면 null */
export async function fetchProfile(userId) {
  const { data, error } = await requireClient()
    .from('profiles')
    .select('id, role, nickname, org_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(friendlyError(error))
  return data
}

/** 내 프로필 고치기 (DB가 닉네임·프로필 사진만 고칠 수 있게 막아둠) */
export async function updateMyProfile(userId, fields) {
  const { error } = await requireClient().from('profiles').update(fields).eq('id', userId)
  if (error) throw new Error(friendlyError(error))
}

/** 프로필 사진(JPG Blob)을 avatars/<내 id>/ 폴더에 올리고 공개 주소를 돌려준다. */
export async function uploadAvatar(userId, blob) {
  const db = requireClient()
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await db.storage.from(AVATAR_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw new Error(`프로필 사진을 올리지 못했어요. (${error.message})`)
  return db.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
}

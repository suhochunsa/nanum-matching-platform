import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDonorContact } from '../data/store.js'

export default function DonorContact({ itemId, needId, source, profile }) {
  const [contact, setContact] = useState({ loading: true, phone: '', error: '' })
  const [attempt, setAttempt] = useState(0)
  const isInstitution = profile?.role === 'institution'

  useEffect(() => {
    if (!isInstitution || source !== 'supabase' || !needId) return
    let active = true
    fetchDonorContact(itemId, needId).then(
      (phone) => active && setContact({ loading: false, phone: phone || '', error: '' }),
      (error) => active && setContact({ loading: false, phone: '', error: error.message }),
    )
    return () => { active = false }
  }, [itemId, needId, source, isInstitution, attempt])

  if (source !== 'supabase') return <p className="mt-3 text-xs text-muted">예시 물품은 연락처를 제공하지 않아요.</p>
  if (!isInstitution) {
    return <p className="mt-3 text-xs text-muted">기부자 연락처는 <Link to="/login" className="font-semibold underline">기관 계정으로 로그인</Link>하면 볼 수 있어요.</p>
  }
  if (!needId) return <p className="mt-3 text-xs text-muted">필요 물품을 등록하면 매칭된 기부자의 연락처가 표시돼요.</p>
  if (contact.loading) return <p role="status" className="mt-3 text-xs text-muted">연락처를 불러오는 중…</p>
  if (contact.error) {
    return (
      <div className="mt-3 text-xs">
        <p role="alert" className="text-red-700">{contact.error}</p>
        <button type="button" className="mt-1 font-semibold underline" onClick={() => {
          setContact({ loading: true, phone: '', error: '' })
          setAttempt((value) => value + 1)
        }}>다시 불러오기</button>
      </div>
    )
  }
  if (!contact.phone) return <p className="mt-3 text-xs text-muted">연락처가 없거나 현재 매칭 가능한 물품이 아니에요.</p>
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3 text-sm">
      <p className="font-semibold text-ink">기부자 연락처: {contact.phone}</p>
      <a href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`} className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">전화하기</a>
    </div>
  )
}

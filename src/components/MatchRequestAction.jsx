import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { commonMethods, methodLabel } from '../data/delivery.js'
import { buttonClass } from './ui.js'

export default function MatchRequestAction({ source, allowed, targetOwnerId, myMethods, otherMethods, quantity, onRequest }) {
  const selectId = useId()
  const methods = commonMethods(myMethods, otherMethods)
  const [selected, setSelected] = useState(methods[0] ?? '')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  if (source !== 'supabase') return null
  if (!targetOwnerId) return <p className="mt-3 text-xs text-muted">예시 물품은 요청을 받을 계정이 없어요.</p>
  if (!allowed) return <p className="mt-3 text-xs text-muted">내 역할의 계정으로 로그인하면 매칭을 요청할 수 있어요.</p>
  if (methods.length === 0) return <p className="mt-3 text-xs text-muted">서로 가능한 전달 방법이 없어 요청할 수 없어요.</p>
  if (sent) return <p role="status" className="mt-3 text-sm text-ink">요청을 보냈어요. <Link to="/mypage" state={{ tab: 'requests' }} className="font-semibold underline">마이페이지 요청함 확인</Link></p>

  async function send() {
    if (busy) return
    setBusy(true)
    setError('')
    try { await onRequest(selected); setSent(true) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="mt-3 border-t border-hairline pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="text-xs text-muted">전달 방법</label>
        <select id={selectId} value={selected} onChange={(e) => setSelected(e.target.value)} disabled={busy} className="rounded-full bg-canvas-soft px-3 py-2 text-xs">
          {methods.map((method) => <option key={method} value={method}>{methodLabel(method)}</option>)}
        </select>
        <button type="button" onClick={send} disabled={busy} className={buttonClass('primary', 'sm')}>{busy ? '요청 보내는 중…' : '매칭 요청 보내기'}</button>
      </div>
      <p className="mt-2 text-xs text-muted">기부 물품 전체 {quantity}개를 요청해요. 상대방이 수락하면 매칭이 확정되고, 물품을 전달한 뒤 양쪽이 모두 '전달 완료'를 누르면 기부자에게 크레딧이 적립돼요.</p>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  )
}

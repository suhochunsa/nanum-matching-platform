import { useState } from 'react'
import { methodLabel } from '../../data/delivery.js'
import { needsMyCompletion } from '../../data/status.js'
import { completeItemMatch, respondItemMatch } from '../../data/store.js'
import { buttonClass } from '../ui.js'

const LABELS = { requested: '응답 대기', confirmed: '전달 대기', completed: '전달 완료', rejected: '거절됨', cancelled: '취소됨' }
const dateLabel = (date) => new Date(date).toLocaleString('ko-KR')

/** 기부자·기관 각각의 전달 완료 여부 */
function DeliveryProgress({ row }) {
  const steps = [
    ['기부자', row.donor_done],
    ['기관', row.institution_done],
  ]
  return (
    <ul className="flex flex-wrap gap-2 text-xs" aria-label="전달 완료 현황">
      {steps.map(([label, done]) => (
        <li
          key={label}
          className={`rounded-full px-3 py-1 font-semibold ${done ? 'bg-ink text-white' : 'bg-canvas-soft text-muted'}`}
        >
          {label} {done ? '전달 완료 ✓' : '대기 중'}
        </li>
      ))}
    </ul>
  )
}

export default function MyMatchRequests({ requests, reload }) {
  const [direction, setDirection] = useState('received')
  const [busy, setBusy] = useState(null)
  const [confirming, setConfirming] = useState(null) // 전달 완료 확인 중인 매칭 id
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const list = requests.filter((row) => (direction === 'received' ? row.incoming : !row.incoming))

  async function run(id, task, message) {
    if (busy) return
    setBusy(id)
    setError('')
    setNotice('')
    try {
      setNotice(message(await task()))
      await reload()
    } catch (err) {
      setError(err.message)
      await reload()
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  const respond = (id, action) =>
    run(id, () => respondItemMatch(id, action), () =>
      action === 'accept'
        ? "매칭이 확정됐어요. 물품을 전달한 뒤 기부자와 기관이 모두 '전달 완료'를 누르면 크레딧이 적립돼요."
        : action === 'reject'
          ? '요청을 거절했어요.'
          : '요청을 취소했어요.',
    )

  const complete = (id) =>
    run(id, () => completeItemMatch(id), (result) =>
      result.status === 'completed'
        ? `전달이 최종 완료됐어요. 기부자 계정에 ${result.credit.toLocaleString()} 크레딧이 적립됐어요.`
        : "전달 완료를 눌렀어요. 상대방도 '전달 완료'를 누르면 최종 완료되고 크레딧이 적립돼요.",
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['received', 'sent'].map((key) => (
          <button key={key} type="button" aria-pressed={direction === key} onClick={() => setDirection(key)} className={buttonClass(direction === key ? 'primary' : 'soft', 'sm')}>
            {key === 'received' ? '받은 요청' : '보낸 요청'}
          </button>
        ))}
        <button type="button" onClick={reload} className={`${buttonClass('ghost', 'sm')} ml-auto`}>
          새로고침
        </button>
      </div>
      <p className="text-xs text-muted">
        요청 → 상대방 수락(매칭 확정) → 물품 전달 → 기부자·기관이 각각 '전달 완료' → 최종 완료 시 기부자에게 크레딧 적립. 요청함은 15초마다 갱신돼요.
      </p>
      {notice && <p role="status" className="rounded-2xl bg-canvas-soft p-4 text-sm">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {list.length === 0 && (
        <p className="rounded-3xl bg-canvas-soft p-8 text-center text-sm text-muted">
          {direction === 'received' ? '받은 매칭 요청이 없어요.' : '보낸 매칭 요청이 없어요. 매칭 결과에서 상대방에게 요청을 보내 보세요.'}
        </p>
      )}
      <ul className="space-y-3">
        {list.map((row) => {
          const myTurn = needsMyCompletion(row)
          return (
            <li key={row.id} className="space-y-3 rounded-3xl border border-hairline-soft p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg">{row.item_title}</h3>
                  <p className="mt-1 text-sm text-muted">{row.incoming ? '보낸 계정' : '받는 계정'}: {row.other_name}</p>
                  <p className="text-xs text-muted">기관의 필요 물품: {row.need_title}</p>
                </div>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.status === 'completed' ? 'bg-ink text-white' : 'bg-canvas-soft'}`}>
                    {LABELS[row.status] ?? row.status}
                  </span>
                  {(myTurn || (row.incoming && row.status === 'requested')) && (
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">내 차례</span>
                  )}
                </span>
              </div>
              <p className="text-sm text-muted">
                전체 {row.quantity}개 · {methodLabel(row.method)} · 매칭 {row.score}점
              </p>
              <p className="text-sm">
                {row.status === 'completed' ? '기부자 적립 완료' : '양쪽 전달 완료 시 기부자 적립'}: {row.credit_amount.toLocaleString()} 크레딧
              </p>
              {['confirmed', 'completed'].includes(row.status) && <DeliveryProgress row={row} />}
              {row.contact_phone && (
                <a href={`tel:${row.contact_phone.replace(/[^0-9+]/g, '')}`} className="inline-block text-sm font-semibold underline">
                  상대방 연락처: {row.contact_phone}
                </a>
              )}
              <p className="text-xs text-faint">
                요청일: {dateLabel(row.created_at)}
                {row.completed_at && ` · 최종 완료: ${dateLabel(row.completed_at)}`}
              </p>

              {row.status === 'requested' && (
                <p className="text-xs text-muted">
                  {row.incoming
                    ? '수락하면 매칭이 확정되고, 그다음에 전달 완료를 누를 수 있어요.'
                    : '상대방이 수락하면 매칭이 확정되고, 그다음에 전달 완료를 누를 수 있어요.'}
                </p>
              )}
              {row.status === 'requested' && (
                <div className="flex gap-2">
                  {row.incoming ? (
                    <>
                      <button type="button" disabled={Boolean(busy)} onClick={() => respond(row.id, 'accept')} className={buttonClass('primary', 'sm')}>
                        {busy === row.id ? '처리 중…' : '수락하기'}
                      </button>
                      <button type="button" disabled={Boolean(busy)} onClick={() => respond(row.id, 'reject')} className={buttonClass('outline', 'sm')}>
                        거절하기
                      </button>
                    </>
                  ) : (
                    <button type="button" disabled={Boolean(busy)} onClick={() => respond(row.id, 'cancel')} className={buttonClass('outline', 'sm')}>
                      {busy === row.id ? '처리 중…' : '요청 취소'}
                    </button>
                  )}
                </div>
              )}

              {row.status === 'confirmed' && myTurn && confirming !== row.id && (
                <button type="button" disabled={Boolean(busy)} onClick={() => setConfirming(row.id)} className={buttonClass('primary', 'sm')}>
                  {row.my_side === 'donor' ? '전달 완료 (물품을 보냈어요)' : '전달 완료 (물품을 받았어요)'}
                </button>
              )}
              {row.status === 'confirmed' && confirming === row.id && (
                <div role="alertdialog" aria-label="전달 완료 확인" className="flex flex-wrap items-center gap-2 rounded-2xl bg-canvas-soft px-4 py-3">
                  <p className="mr-auto text-sm">
                    <strong>{row.item_title}</strong>
                    {row.my_side === 'donor' ? `을(를) ${row.other_name}에 전달했나요?` : `을(를) ${row.other_name}에게서 받았나요?`}{' '}
                    누르면 되돌릴 수 없어요.
                  </p>
                  <button type="button" disabled={Boolean(busy)} onClick={() => complete(row.id)} className={buttonClass('primary', 'sm')}>
                    {busy === row.id ? '처리 중…' : '네, 전달 완료'}
                  </button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => setConfirming(null)} className={buttonClass('ghost', 'sm')}>
                    취소
                  </button>
                </div>
              )}
              {row.status === 'confirmed' && !myTurn && (
                <p className="text-sm text-muted">전달 완료를 눌렀어요. 상대방이 누르면 최종 완료돼요.</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

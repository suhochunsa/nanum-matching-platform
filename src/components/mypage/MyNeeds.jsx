import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCategory } from '../../data/categories.js'
import { formatDate } from '../../data/dates.js'
import { NEED_STATUS, NEED_STATUS_CHOICES } from '../../data/status.js'
import { deleteNeed, fetchMyInstitution, updateNeed } from '../../data/store.js'
import FormField from '../FormField.jsx'
import { buttonClass, fieldClass } from '../ui.js'
import ManagedRow from './ManagedRow.jsx'
import StatusBadge from './StatusBadge.jsx'

/** 마이페이지 "내 필요 물품" 탭: 내 기관이 올린 필요 물품 목록과 수정·삭제 */
export default function MyNeeds({ userId }) {
  const [needs, setNeeds] = useState(null) // null = 불러오는 중
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchMyInstitution(userId)
      .then((inst) => !cancelled && setNeeds(inst?.needs ?? []))
      .catch((e) => !cancelled && setLoadError(e.message))
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loadError) return <p className="text-sm text-red-600">필요 물품을 불러오지 못했어요. ({loadError})</p>
  if (!needs) return <p className="text-sm text-muted">불러오는 중…</p>

  if (needs.length === 0) {
    return (
      <div className="rounded-3xl bg-canvas-soft px-6 py-14 text-center">
        <p className="text-muted">아직 등록한 필요 물품이 없어요.</p>
        <Link
          to="/institution"
          className={`${buttonClass('primary', 'md')} mt-5`}
        >
          필요 물품 등록하기
        </Link>
      </div>
    )
  }

  const stats = [
    ['전체', needs.length],
    ['모집 중', needs.filter((n) => n.status === 'open').length],
    ['모집 완료', needs.filter((n) => n.status === 'fulfilled').length],
  ]

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl bg-canvas-soft px-3 py-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-3xl font-display tabular-nums text-ink">{n}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">모집 완료로 바꾼 필요 물품은 홈 화면과 기부자 매칭 결과에서 빠져요.</p>

      <ul className="space-y-3">
        {needs.map((need) => (
          <ManagedRow
            key={need.id}
            name={need.title}
            onDelete={async () => {
              await deleteNeed(need.id)
              setNeeds((list) => list.filter((n) => n.id !== need.id))
            }}
            renderEditor={(close) => (
              <NeedEditor
                need={need}
                onSaved={(fields) => {
                  setNeeds((list) => list.map((n) => (n.id === need.id ? { ...n, ...fields } : n)))
                  close()
                }}
                onCancel={close}
              />
            )}
            view={
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display leading-snug text-ink">{need.title}</h3>
                  <StatusBadge label={NEED_STATUS[need.status]} tone={need.status === 'open' ? 'active' : 'done'} />
                </div>
                <p className="mt-0.5 text-xs text-muted">{need.categories.map(formatCategory).join(', ')}</p>
                <p className="mt-1 text-sm text-muted">
                  필요 수량 {need.quantity} · 요청일 {formatDate(need.requestedAt)}
                </p>
              </div>
            }
          />
        ))}
      </ul>
    </div>
  )
}

/** 필요 수량·상태 수정 폼 */
function NeedEditor({ need, onSaved, onCancel }) {
  const [quantity, setQuantity] = useState(String(need.quantity))
  const [status, setStatus] = useState(need.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const n = Number(quantity)
  const quantityError = Number.isInteger(n) && n >= 1 && n <= 999 ? '' : '수량은 1~999 사이 정수로 입력해 주세요.'
  const id = (field) => `${need.id}-${field}`

  async function handleSave(e) {
    e.preventDefault()
    if (quantityError) return
    setBusy(true)
    setError('')
    try {
      const fields = { quantity: n, status }
      await updateNeed(need.id, fields)
      onSaved(fields)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSave} noValidate className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField id={id('quantity')} label="필요 수량" error={quantityError}>
          <input
            id={id('quantity')}
            type="number"
            min="1"
            max="999"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={fieldClass(quantityError)}
          />
        </FormField>
        <FormField id={id('status')} label="상태">
          <select id={id('status')} value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass()}>
            {NEED_STATUS_CHOICES.map((s) => (
              <option key={s} value={s}>
                {NEED_STATUS[s]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className={buttonClass('ghost', 'sm')}>
          취소
        </button>
        <button
          type="submit"
          disabled={busy || Boolean(quantityError)}
          className={buttonClass('primary', 'sm')}
        >
          {busy ? '저장하는 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}

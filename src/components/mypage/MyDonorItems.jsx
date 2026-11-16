import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCategory } from '../../data/categories.js'
import { availabilityLabel, isExpired, todayString } from '../../data/dates.js'
import { foodState, foodSummary, isFood } from '../../data/food.js'
import { compressImage } from '../../data/image.js'
import { ITEM_STATUS, ITEM_STATUS_CHOICES } from '../../data/status.js'
import { deleteDonorItem, fetchMyDonorItems, fillFoodInfo, updateDonorItem, uploadItemPhoto } from '../../data/store.js'
import { validateDonorItemEdit, validateFoodInfo } from '../../data/validation.js'
import FoodFields from '../FoodFields.jsx'
import FoodNotice from '../FoodNotice.jsx'
import FormField from '../FormField.jsx'
import { buttonClass, fieldClass } from '../ui.js'
import PhotoThumb from '../PhotoThumb.jsx'
import ManagedRow from './ManagedRow.jsx'
import StatusBadge from './StatusBadge.jsx'

/** 기부 가능한데 마감일이 지났으면 '기간 만료'로 따로 보여준다. */
function badgeOf(item) {
  const food = foodState(item)
  if (item.status === 'available' && food === 'expired') return { label: '소비기한 지남', tone: 'warn' }
  if (item.status === 'available' && food === 'missing') return { label: '식품 정보 필요', tone: 'warn' }
  if (item.status === 'available' && isExpired(item.availableUntil)) return { label: '기간 만료', tone: 'warn' }
  return { label: ITEM_STATUS[item.status], tone: item.status === 'available' ? 'active' : 'done' }
}

/** 마이페이지 "내 기부 물품" 탭: 내가 올린 물품 목록과 수정·삭제 */
export default function MyDonorItems({ userId }) {
  const [items, setItems] = useState(null) // null = 불러오는 중
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchMyDonorItems(userId)
      .then((data) => !cancelled && setItems(data))
      .catch((e) => !cancelled && setLoadError(e.message))
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loadError) return <p className="text-sm text-red-600">물품을 불러오지 못했어요. ({loadError})</p>
  if (!items) return <p className="text-sm text-muted">불러오는 중…</p>

  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-canvas-soft px-6 py-14 text-center">
        <p className="text-muted">아직 등록한 기부 물품이 없어요.</p>
        <Link to="/donor" className={`${buttonClass('primary', 'md')} mt-5`}>
          기부 물품 등록하기
        </Link>
      </div>
    )
  }

  const count = (pred) => items.filter(pred).length
  const stats = [
    ['전체', items.length],
    ['기부 가능', count((i) => i.status === 'available' && !isExpired(i.availableUntil))],
    ['기간 만료', count((i) => i.status === 'available' && isExpired(i.availableUntil))],
    ['매칭 확정', count((i) => i.status === 'matched')],
    ['기부 완료', count((i) => i.status === 'donated')],
  ]

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl bg-canvas-soft px-3 py-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-3xl font-display tabular-nums text-ink">{n}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">기부 완료로 바꾼 물품은 홈 화면과 기관 검색 결과에서 빠져요.</p>

      <ul className="space-y-3">
        {items.map((item) => {
          const badge = badgeOf(item)
          return (
            <ManagedRow
              key={item.id}
              name={item.title}
              onDelete={async () => {
                await deleteDonorItem(item.id)
                setItems((list) => list.filter((i) => i.id !== item.id))
              }}
              renderEditor={(close) => (
                <DonorItemEditor
                  item={item}
                  onSaved={(fields) => {
                    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, ...fields } : i)))
                    close()
                  }}
                  onCancel={close}
                />
              )}
              view={
                <div className="flex gap-3">
                  <PhotoThumb src={item.photo} alt={item.title} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display leading-snug text-ink">{item.title}</h3>
                      <StatusBadge {...badge} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{item.categories.map(formatCategory).join(', ')}</p>
                    <p className="mt-1 text-sm text-muted">
                      수량 {item.quantity} · {item.condition} ·{' '}
                      {isFood(item.categories) ? foodSummary(item) : `기부 가능: ${availabilityLabel(item.availableUntil)}`}
                    </p>
                    {isFood(item.categories) && (
                      <div className="mt-2">
                        <FoodNotice item={item} />
                      </div>
                    )}
                  </div>
                </div>
              }
            />
          )
        })}
      </ul>
    </div>
  )
}

/** 수량·마감일·상태 수정 폼 */
function DonorItemEditor({ item, onSaved, onCancel }) {
  // 식품 정보가 없는 기존 식품은 먼저 식품 정보를 채운다
  if (foodState(item) === 'missing') return <FoodInfoFiller item={item} onSaved={onSaved} onCancel={onCancel} />
  return <ItemFieldsEditor item={item} onSaved={onSaved} onCancel={onCancel} />
}

/** 식품 정보가 없는 기존 식품: 소비기한·개봉 여부·보관 방법·라벨을 한 번 입력 (이후에는 바꿀 수 없음) */
function FoodInfoFiller({ item, onSaved, onCancel }) {
  const [values, setValues] = useState({ foodExpiry: '', foodOpened: '', foodStorage: '', foodLabel: null })
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const check = validateFoodInfo
  const errors = submitted ? check(values) : {}

  async function handleSave(e) {
    e.preventDefault()
    setSubmitted(true)
    const found = check(values)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(`${item.id}-${first}`)?.focus()
      return
    }
    setBusy(true)
    setError('')
    try {
      let blob
      try { blob = await compressImage(values.foodLabel, { maxSize: 1280, quality: 0.85 }) }
      catch { throw new Error('라벨 사진을 읽지 못했어요. JPG나 PNG 사진으로 다시 골라 주세요.') }
      const fields = {
        foodExpiry: values.foodExpiry,
        foodOpened: values.foodOpened === 'opened',
        foodStorage: values.foodStorage,
        foodLabelUrl: await uploadItemPhoto(blob),
      }
      const availableUntil = await fillFoodInfo(item.id, fields)
      onSaved({ foodExpiry: fields.foodExpiry, foodOpened: fields.foodOpened, foodStorage: fields.foodStorage, foodLabel: fields.foodLabelUrl, availableUntil })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSave} noValidate className="space-y-3">
      <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-700">
        식품 정보가 없어서 지금은 매칭되지 않아요. 아래 정보를 입력하면 매칭할 수 있어요. 한 번 저장하면 바꿀 수 없으니 포장을 보고 정확히 입력해 주세요.
      </p>
      <FoodFields values={values} onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))} errors={errors} idPrefix={`${item.id}-`} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className={buttonClass('ghost', 'sm')}>
          취소
        </button>
        <button type="submit" disabled={busy} className={buttonClass('primary', 'sm')}>
          {busy ? '저장하는 중…' : '식품 정보 저장'}
        </button>
      </div>
    </form>
  )
}

/** 수량·마감일·상태 수정 폼 */
function ItemFieldsEditor({ item, onSaved, onCancel }) {
  const food = isFood(item.categories)
  const [form, setForm] = useState({
    quantity: String(item.quantity),
    availableUntil: item.availableUntil ?? '',
    noDeadline: !item.availableUntil,
    status: item.status,
    originalUntil: item.availableUntil,
    maxUntil: food ? item.foodExpiry : null,
  })
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const errors = submitted ? validateDonorItemEdit(form) : {}
  const id = (field) => `${item.id}-${field}`

  async function handleSave(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(validateDonorItemEdit(form)).length > 0) return
    setBusy(true)
    setError('')
    try {
      const fields = {
        quantity: Number(form.quantity),
        availableUntil: form.noDeadline ? null : form.availableUntil,
        status: form.status,
      }
      await updateDonorItem(item.id, fields)
      onSaved(fields)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSave} noValidate className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField id={id('quantity')} label="수량" error={errors.quantity}>
          <input
            id={id('quantity')}
            type="number"
            min="1"
            max="999"
            value={form.quantity}
            disabled={item.lockedForMatch}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            className={fieldClass(errors.quantity)}
          />
        </FormField>
        <FormField id={id('status')} label="상태">
          <select
            id={id('status')}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className={fieldClass()}
          >
            {/* 매칭된 물품은 양쪽 전달 완료로만 기부 완료가 되므로 지금 상태만 보여준다 */}
            {(item.lockedForMatch ? [item.status] : [...new Set([...ITEM_STATUS_CHOICES, item.status])]).map((s) => (
              <option key={s} value={s}>
                {ITEM_STATUS[s]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField
        id={id('availableUntil')}
        label="기부 가능 마감일"
        hint={food ? '식품은 소비기한까지만 고를 수 있어요. 소비기한·라벨 등 식품 정보는 바꿀 수 없어요.' : undefined}
        error={errors.availableUntil}
      >
        <div className="flex items-center gap-3">
          <input
            id={id('availableUntil')}
            type="date"
            min={todayString()}
            max={food ? item.foodExpiry : undefined}
            value={form.availableUntil}
            onChange={(e) => setForm((f) => ({ ...f, availableUntil: e.target.value }))}
            disabled={form.noDeadline}
            className={`${fieldClass(errors.availableUntil)} disabled:opacity-40`}
          />
          {/* 식품은 소비기한이 있으므로 '기한 없음'을 고를 수 없다 */}
          {!food && (
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.noDeadline}
                onChange={(e) => setForm((f) => ({ ...f, noDeadline: e.target.checked }))}
                className="h-4 w-4 accent-ink"
              />
              기한 없음
            </label>
          )}
        </div>
      </FormField>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {item.lockedForMatch && (
        <p className="text-xs text-muted">
          매칭이 확정된 물품은 수량과 상태를 바꿀 수 없어요. 기부자와 기관이 매칭 요청함에서 모두 '전달 완료'를 누르면 기부 완료가 돼요.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className={buttonClass('ghost', 'sm')}>
          취소
        </button>
        <button
          type="submit"
          disabled={busy}
          className={buttonClass('primary', 'sm')}
        >
          {busy ? '저장하는 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCategory } from '../data/categories.js'
import { availabilityLabel } from '../data/dates.js'
import { commonMethods, methodLabel } from '../data/delivery.js'
import { isFood } from '../data/food.js'
import { itemRequestBlock, rankNeedsForItem } from '../data/matching.js'
import { requestItemMatch } from '../data/store.js'
import { useAuth } from '../lib/authContext.js'
import FoodNotice from './FoodNotice.jsx'
import PhotoThumb from './PhotoThumb.jsx'
import { buttonClass, chipClass } from './ui.js'

/**
 * 홈 화면에서 기부 물품 카드를 눌렀을 때 뜨는 상세창.
 * - 누구나: 물품 정보(사진·범주·수량·상태·지역·전달 방법·기부 가능 기간·식품 정보)
 * - 기관 계정: 내 필요 물품 하나와 전달 방법을 골라 바로 매칭 요청
 * data: store.js loadData() 결과 (내 필요 물품·기관 정보를 찾는 데 쓴다)
 */
export default function ItemRequestDialog({ item, data, onClose }) {
  const closeRef = useRef(null)

  // Esc로 닫고, 열리면 닫기 버튼에 포커스, 뒤 화면 스크롤 막기
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-dialog-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-canvas p-6 sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start gap-4">
          <PhotoThumb src={item.photo} alt={item.title} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1">
              {item.categories.map((leaf) => (
                <span key={leaf} className={chipClass}>
                  {formatCategory(leaf)}
                </span>
              ))}
            </div>
            <h2 id="item-dialog-title" className="mt-2 text-2xl font-display leading-tight text-ink">
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              기부자 {item.donor} · {item.region}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="닫기" className={buttonClass('ghost', 'sm')}>
            ✕
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">수량 · 상태</dt>
          <dd>
            {item.quantity}개 · {item.condition}
          </dd>
          <dt className="text-muted">전달 방법</dt>
          <dd>{item.methods.map(methodLabel).join(', ')}</dd>
          {!isFood(item.categories) && (
            <>
              <dt className="text-muted">기부 가능</dt>
              <dd>{availabilityLabel(item.availableUntil)}</dd>
            </>
          )}
          {item.detail && (
            <>
              <dt className="text-muted">상세 정보</dt>
              <dd className="break-words">{item.detail}</dd>
            </>
          )}
        </dl>

        {isFood(item.categories) && (
          <div className="mt-4">
            <FoodNotice item={item} />
          </div>
        )}

        <div className="mt-6 border-t border-hairline-soft pt-5">
          <RequestSection item={item} data={data} />
        </div>
      </div>
    </div>
  )
}

/** 상세창 아래쪽: 보는 사람에 따라 요청 폼 또는 안내 */
function RequestSection({ item, data }) {
  const { profile } = useAuth()

  if (data.source !== 'supabase') {
    return <p className="text-sm text-muted">데이터베이스에 연결되지 않아 요청할 수 없어요.</p>
  }
  if (!profile) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">기관 계정으로 로그인하면 이 물품을 바로 요청할 수 있어요.</p>
        <Link to="/login" className={buttonClass('primary', 'md')}>
          로그인하기
        </Link>
      </div>
    )
  }
  if (profile.role !== 'institution') {
    return item.ownerId === profile.id ? (
      <p className="text-sm text-muted">
        내가 올린 물품이에요.{' '}
        <Link to="/mypage" className="font-semibold text-ink underline">
          마이페이지에서 관리
        </Link>
      </p>
    ) : (
      <p className="text-sm text-muted">기관 계정만 홈에서 물품을 요청할 수 있어요. 기부자는 '기부하기' 화면에서 매칭을 확인해 주세요.</p>
    )
  }

  const blocked = itemRequestBlock(item)
  if (blocked) return <p className="text-sm font-semibold text-red-600">{blocked}</p>

  return <InstitutionRequestForm item={item} data={data} orgName={profile.org_name} userId={profile.id} />
}

/** 기관 계정: 내 필요 물품 하나 + 전달 방법을 골라 요청 */
function InstitutionRequestForm({ item, data, orgName, userId }) {
  const myNeeds = data.institutionNeeds.filter((n) => n.ownerId === userId && (n.status ?? 'open') === 'open')
  const ranked = rankNeedsForItem(item, myNeeds)
  const myMethods = data.institutions.find((i) => i.name === orgName)?.methods ?? []
  const methods = commonMethods(item.methods, myMethods)

  const [needId, setNeedId] = useState(ranked.find((n) => n.score !== null)?.id ?? '')
  const [method, setMethod] = useState(methods[0] ?? '')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (myNeeds.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">요청하려면 이 물품과 연결할 필요 물품이 있어야 해요. 먼저 필요 물품을 등록해 주세요.</p>
        <Link to="/institution" className={buttonClass('primary', 'md')}>
          필요 물품 등록하기
        </Link>
      </div>
    )
  }
  if (methods.length === 0) {
    return (
      <p className="text-sm text-red-600">
        기부자가 가능한 전달 방법({item.methods.map(methodLabel).join(', ')})과 우리 기관이 받을 수 있는 방법이 겹치지 않아요.
        마이페이지 '프로필 수정'에서 받을 수 있는 방법을 바꿀 수 있어요.
      </p>
    )
  }
  if (sent) {
    return (
      <p role="status" className="rounded-2xl bg-canvas-soft p-4 text-sm">
        요청을 보냈어요. 기부자가 수락하면 매칭이 확정돼요.{' '}
        <Link to="/mypage" state={{ tab: 'requests' }} className="font-semibold underline">
          마이페이지 요청함에서 확인
        </Link>
      </p>
    )
  }

  async function send() {
    if (busy || !needId) return
    setBusy(true)
    setError('')
    try {
      await requestItemMatch(item.id, needId, method)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const noneEligible = !ranked.some((n) => n.score !== null)

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">어떤 필요 물품으로 받을까요?</legend>
        <ul className="space-y-2">
          {ranked.map((need) => {
            const eligible = need.score !== null
            return (
              <li key={need.id}>
                <label
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors ${
                    !eligible ? 'cursor-not-allowed bg-canvas-soft text-faint' : needId === need.id ? 'cursor-pointer bg-canvas ring-2 ring-ink' : 'cursor-pointer bg-field hover:bg-hairline'
                  }`}
                >
                  <input
                    type="radio"
                    name={`need-${item.id}`}
                    value={need.id}
                    checked={needId === need.id}
                    disabled={!eligible}
                    onChange={() => setNeedId(need.id)}
                    className="accent-ink"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{need.title}</span>
                    <span className="block text-xs">
                      {need.categories.map(formatCategory).join(', ')} · 필요 수량 {need.quantity}
                      {!eligible && ' · 범주·이름이 맞지 않아 요청할 수 없어요'}
                    </span>
                  </span>
                  {eligible && (
                    <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold tabular-nums text-white">{need.score}점</span>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {noneEligible ? (
        <p className="text-sm text-red-600">이 물품과 범주나 이름이 맞는 필요 물품이 없어요. 비슷한 필요 물품을 먼저 등록해 주세요.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`method-${item.id}`} className="text-sm font-semibold text-ink">
              전달 방법
            </label>
            <select
              id={`method-${item.id}`}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={busy}
              className="rounded-full bg-field px-4 py-2 text-sm"
            >
              {methods.map((m) => (
                <option key={m} value={m}>
                  {methodLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted">
            물품 전체 {item.quantity}개를 요청해요. 기부자가 수락하면 매칭이 확정되고, 물품을 주고받은 뒤 양쪽이 모두 '전달 완료'를 누르면 끝나요.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button type="button" onClick={send} disabled={busy || !needId} className={`${buttonClass('primary', 'lg')} w-full`}>
            {busy ? '요청 보내는 중…' : '이 물품 매칭 요청하기'}
          </button>
        </>
      )}
    </div>
  )
}

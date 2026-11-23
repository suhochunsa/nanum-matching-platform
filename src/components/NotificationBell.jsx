import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildNotifications } from '../data/notifications.js'
import useMatchingDashboard from '../hooks/useMatchingDashboard.js'

// 마지막으로 종을 열어 본 시각을 이 브라우저에만 기억한다 (계정별)
const seenKey = (userId) => `nanum.notifications.seenAt.${userId}`

function readSeen(userId) {
  try {
    const saved = Number(localStorage.getItem(seenKey(userId)))
    if (saved) return saved
    // 처음이면 지금부터 센다 (예전 기록이 한꺼번에 새 알림으로 뜨지 않게)
    const now = Date.now()
    localStorage.setItem(seenKey(userId), String(now))
    return now
  } catch {
    return Date.now()
  }
}

function writeSeen(userId, time) {
  try {
    localStorage.setItem(seenKey(userId), String(time))
  } catch {
    // 저장이 막힌 브라우저에서는 이번 방문 동안만 기억한다
  }
}

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}시간 전`
  return `${Math.round(minutes / 60 / 24)}일 전`
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

/**
 * 상단 종 알림. 왼쪽 아래 빨간 원에 알림 수를 보여주고, 누르면 알림 목록을 연다.
 * 알림을 누르면 마이페이지 매칭 요청함의 그 요청으로 이동한다.
 */
export default function NotificationBell({ userId }) {
  const navigate = useNavigate()
  const { data } = useMatchingDashboard()
  const [seenAt, setSeenAt] = useState(() => readSeen(userId))
  const [open, setOpen] = useState(false)
  // 목록을 연 순간의 기준 시각: 열어 둔 동안에는 방금 본 알림에도 '새 알림' 점을 남겨 둔다
  const [openedSeenAt, setOpenedSeenAt] = useState(seenAt)
  const box = useRef(null)

  const requests = data?.requests
  const { count } = useMemo(() => buildNotifications(requests ?? [], seenAt), [requests, seenAt])
  const { items } = useMemo(() => buildNotifications(requests ?? [], openedSeenAt), [requests, openedSeenAt])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (open) return setOpen(false)
    const now = Date.now()
    setOpenedSeenAt(seenAt)
    setSeenAt(now)
    writeSeen(userId, now)
    setOpen(true)
  }

  function go(state) {
    setOpen(false)
    navigate('/mypage', { state: { tab: 'requests', ...state } })
  }

  const label = count > 99 ? '99+' : String(count)

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count ? `알림 ${count}개` : '알림'}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors ${open ? 'bg-canvas' : 'hover:bg-canvas'}`}
      >
        <BellIcon />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -left-0.5 h-[18px] min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white tabular-nums ring-2 ring-canvas-soft"
          >
            {label}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="알림"
          className="fixed inset-x-3 top-[68px] z-50 max-h-[70vh] overflow-y-auto rounded-3xl border border-hairline-soft bg-canvas p-2 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96"
        >
          <p className="px-3 pb-1 pt-2 text-sm font-semibold text-ink">알림</p>
          {!data && <p className="px-3 py-6 text-center text-sm text-muted">불러오는 중…</p>}
          {data && items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">새 알림이 없어요.</p>}
          <ul>
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => go({ direction: n.direction, focus: n.id })}
                  className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-canvas-soft"
                >
                  <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.unread ? 'bg-red-600' : 'bg-transparent'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink">{n.text}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                      {n.action && <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-white">내 차례</span>}
                      {n.at && timeAgo(n.at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => go({})}
            className="mt-1 w-full rounded-2xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-canvas-soft"
          >
            매칭 요청함 전체 보기
          </button>
        </div>
      )}
    </div>
  )
}

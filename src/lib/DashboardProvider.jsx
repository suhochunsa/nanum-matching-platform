import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchMatchingDashboard } from '../data/store.js'
import { DashboardContext } from '../hooks/useMatchingDashboard.js'
import { useAuth } from './authContext.js'

/** 로그인한 동안 내 매칭 요청함을 불러와 앱 전체(상단 알림·마이페이지)에 나눠 준다. (main.jsx에서 App을 감싼다) */
export default function DashboardProvider({ children }) {
  const { profile } = useAuth()
  const userId = profile?.id ?? null
  const [state, setState] = useState({ userId: null, data: null, error: '' })
  const sequence = useRef(0)

  const reload = useCallback(async () => {
    if (!userId) return
    const current = ++sequence.current
    try {
      const next = await fetchMatchingDashboard()
      if (sequence.current === current) setState({ userId, data: next, error: '' })
    } catch (err) {
      if (sequence.current === current) setState((s) => ({ userId, data: s.userId === userId ? s.data : null, error: err.message }))
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    queueMicrotask(reload)
    const timer = setInterval(reload, 15000)
    window.addEventListener('focus', reload)
    return () => {
      // 요청 순서 번호는 DOM 참조가 아니며, 진행 중 응답을 무효화하려고 최신 값을 증가시킨다.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      sequence.current++
      clearInterval(timer)
      window.removeEventListener('focus', reload)
    }
  }, [userId, reload])

  // 계정이 바뀌면 이전 계정의 요청함이 잠깐이라도 보이지 않게 한다
  const mine = state.userId === userId
  const data = mine ? state.data : null
  const error = mine ? state.error : ''
  const value = useMemo(() => ({ data, error, reload }), [data, error, reload])
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMatchingDashboard } from '../data/store.js'

export default function useMatchingDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  const reload = useCallback(async () => {
    const current = ++sequence.current
    try {
      const next = await fetchMatchingDashboard()
      if (sequence.current === current) { setData(next); setError('') }
    } catch (err) {
      if (sequence.current === current) setError(err.message)
    }
  }, [])

  useEffect(() => {
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
  }, [reload])
  return { data, error, reload }
}

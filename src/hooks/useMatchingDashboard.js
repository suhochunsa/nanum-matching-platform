import { createContext, useContext } from 'react'

export const DashboardContext = createContext({ data: null, error: '', reload: async () => {} })

/**
 * 내 매칭 요청함 데이터 { data, error, reload }.
 * DashboardProvider가 로그인한 동안 15초마다(그리고 창으로 돌아올 때) 갱신한다.
 * 상단 종 알림과 마이페이지가 같은 데이터를 쓰므로, 마이페이지에서 처리하면 종 숫자도 바로 바뀐다.
 */
export default function useMatchingDashboard() {
  return useContext(DashboardContext)
}

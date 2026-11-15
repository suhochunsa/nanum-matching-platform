import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Avatar from '../components/Avatar.jsx'
import MyDonorItems from '../components/mypage/MyDonorItems.jsx'
import MyNeeds from '../components/mypage/MyNeeds.jsx'
import MyMatchRequests from '../components/mypage/MyMatchRequests.jsx'
import MyCredits from '../components/mypage/MyCredits.jsx'
import useMatchingDashboard from '../hooks/useMatchingDashboard.js'
import ProfileSettings from '../components/mypage/ProfileSettings.jsx'
import { needsMyCompletion } from '../data/status.js'
import { buttonClass, pageTitleClass } from '../components/ui.js'
import { ROLE_LABEL, displayName, useAuth } from '../lib/authContext.js'

/**
 * 마이페이지: 내 물품 관리 + 프로필 수정.
 * 다른 화면에서 { state: { tab: 'profile', notice } }로 열면 프로필 탭과 안내 문구를 바로 보여준다.
 */
export default function MyPage() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p className="px-4 py-16 text-center text-sm text-muted">불러오는 중…</p>

  if (!profile) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-muted">로그인하면 마이페이지를 볼 수 있어요.</p>
        <Link
          to="/login"
          className={`${buttonClass('primary', 'md')} mt-5`}
        >
          로그인하기
        </Link>
      </div>
    )
  }

  return <AccountPage key={profile.id} session={session} profile={profile} initialTab={location.state?.tab} initialNotice={location.state?.notice} />
}

function AccountPage({ session, profile, initialTab, initialNotice }) {
  const [tab, setTab] = useState(initialTab ?? 'items')
  const { data, error, reload } = useMatchingDashboard()
  // 내가 처리할 일: 받은 요청 응답 + 내가 아직 누르지 않은 전달 완료
  const pending = data?.requests.filter((row) => (row.incoming && row.status === 'requested') || needsMyCompletion(row)).length ?? 0
  // 매칭이 확정되거나 최종 완료되면 물품 목록을 다시 불러온다 (물품 상태가 매칭됨 → 기부 완료로 바뀜)
  const matchRevision = data?.requests.filter((row) => ['confirmed', 'completed'].includes(row.status)).map((row) => `${row.id}:${row.status}`).join(',') ?? ''
  const isDonor = profile.role === 'donor'
  const tabs = [
    ['items', isDonor ? '내 기부 물품' : '내 필요 물품'],
    ['requests', `매칭 요청함${pending ? ` (${pending})` : ''}`],
    ...(isDonor ? [['credits', '크레딧']] : []),
    ['profile', '프로필 수정'],
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className={pageTitleClass}>마이페이지</h1>

      <div className="mt-8 flex items-center gap-5 rounded-3xl bg-canvas-soft p-5 sm:p-6">
        <Avatar src={profile.avatar_url} name={displayName(profile)} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-display text-ink">{displayName(profile)}</p>
          <p className="truncate text-sm text-muted">
            {ROLE_LABEL[profile.role]} 계정 · {session?.user.email}
          </p>
          {isDonor && <button type="button" onClick={() => setTab('credits')} className="mt-2 text-sm font-semibold underline">누적 크레딧: {data ? data.creditTotal.toLocaleString() : '…'}</button>}
        </div>
        <Link
          to={isDonor ? '/donor' : '/institution'}
          className={`${buttonClass('primary', 'md')} hidden sm:inline-flex`}
        >
          {isDonor ? '+ 기부 물품 등록' : '+ 필요 물품 등록'}
        </Link>
      </div>

      <div role="tablist" aria-label="마이페이지 메뉴" className="mt-8 flex w-fit max-w-full flex-wrap gap-1 rounded-3xl bg-canvas-soft p-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-700">요청·크레딧을 불러오지 못했어요. {error} <button type="button" onClick={reload} className="underline">다시 불러오기</button></p>}
      <div role="tabpanel" className="mt-6">
        {tab === 'items' && (isDonor ? <MyDonorItems key={matchRevision} userId={profile.id} /> : <MyNeeds key={matchRevision} userId={profile.id} />)}
        {tab === 'requests' && (data ? <MyMatchRequests requests={data.requests} reload={reload} /> : <p className="text-sm text-muted">요청을 불러오는 중…</p>)}
        {tab === 'credits' && isDonor && (data ? <MyCredits total={data.creditTotal} entries={data.creditEntries} /> : <p className="text-sm text-muted">크레딧을 불러오는 중…</p>)}
        {tab === 'profile' && <ProfileSettings initialNotice={initialNotice} />}
      </div>
    </div>
  )
}

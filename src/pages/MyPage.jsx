import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Avatar from '../components/Avatar.jsx'
import MyDonorItems from '../components/mypage/MyDonorItems.jsx'
import MyNeeds from '../components/mypage/MyNeeds.jsx'
import ProfileSettings from '../components/mypage/ProfileSettings.jsx'
import { buttonClass, pageTitleClass } from '../components/ui.js'
import { ROLE_LABEL, displayName, useAuth } from '../lib/authContext.js'

/**
 * 마이페이지: 내 물품 관리 + 프로필 수정.
 * 다른 화면에서 { state: { tab: 'profile', notice } }로 열면 프로필 탭과 안내 문구를 바로 보여준다.
 */
export default function MyPage() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.tab ?? 'items')

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

  const isDonor = profile.role === 'donor'
  const tabs = [
    ['items', isDonor ? '내 기부 물품' : '내 필요 물품'],
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
        </div>
        <Link
          to={isDonor ? '/donor' : '/institution'}
          className={`${buttonClass('primary', 'md')} hidden sm:inline-flex`}
        >
          {isDonor ? '+ 기부 물품 등록' : '+ 필요 물품 등록'}
        </Link>
      </div>

      <div role="tablist" aria-label="마이페이지 메뉴" className="mt-8 inline-flex rounded-full bg-canvas-soft p-1">
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

      <div role="tabpanel" className="mt-6">
        {tab === 'items' && (isDonor ? <MyDonorItems userId={profile.id} /> : <MyNeeds userId={profile.id} />)}
        {tab === 'profile' && <ProfileSettings initialNotice={location.state?.notice} />}
      </div>
    </div>
  )
}

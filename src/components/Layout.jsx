import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { displayName, useAuth } from '../lib/authContext.js'
import Avatar from './Avatar.jsx'

const navLink = 'rounded-md px-3 py-1.5 hover:bg-white/10 transition-colors'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, loading, signOut } = useAuth()
  const isHome = location.pathname === '/'

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-700 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-bold text-lg tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-base">
              🤝
            </span>
            나눔 매칭
          </Link>

          <nav className="flex min-w-0 items-center gap-1 sm:gap-2 text-sm">
            {!isHome && (
              <Link to="/" className={`${navLink} hidden sm:inline-block`}>
                홈으로
              </Link>
            )}

            {/* 로그인 상태를 확인하는 동안에는 버튼을 비워둔다 (깜빡임 방지) */}
            {!loading && !profile && (
              <Link
                to="/login"
                className="rounded-md bg-white/15 px-3 py-1.5 font-medium hover:bg-white/25 transition-colors"
              >
                로그인
              </Link>
            )}

            {!loading && profile && (
              <>
                <Link to={profile.role === 'donor' ? '/donor' : '/institution'} className={navLink}>
                  {profile.role === 'donor' ? '기부하기' : '필요 물품 등록'}
                </Link>
                <Link
                  to="/mypage"
                  className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 hover:bg-white/10 transition-colors"
                  aria-label="마이페이지"
                  title="마이페이지"
                >
                  <Avatar src={profile.avatar_url} name={displayName(profile)} size="sm" />
                  <span className="hidden max-w-[9rem] truncate sm:inline">{displayName(profile)}</span>
                </Link>
                <button type="button" onClick={handleSignOut} className={`${navLink} text-brand-100`}>
                  로그아웃
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-[#f6f8f9]">
        <Outlet />
      </main>

      <footer className="bg-brand-900 text-brand-100 text-xs text-center py-4">
        정보과학 프로젝트 · 기부자·기관 자동 매칭 플랫폼
      </footer>
    </div>
  )
}

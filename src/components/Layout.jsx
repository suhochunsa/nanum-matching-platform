import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { displayName, useAuth } from '../lib/authContext.js'
import Avatar from './Avatar.jsx'
import { buttonClass } from './ui.js'

/** 로고: 잉크색 스쿼클(모서리 30%) 안에 '나' + 워드마크 */
function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2 text-[17px] font-display text-ink" aria-label="나눔 매칭 홈">
      <span className="flex h-8 w-8 items-center justify-center rounded-[30%] bg-ink text-sm font-display text-white">나</span>
      나눔 매칭
    </Link>
  )
}

const navLinkClass = ({ isActive }) =>
  `rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-canvas text-ink' : 'text-muted hover:text-ink'
  }`

export default function Layout() {
  const navigate = useNavigate()
  const { profile, loading, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* 떠 있는 알약 모양 메뉴 (스크롤해도 위에 붙어 있음) */}
      <header className="sticky top-0 z-40 bg-canvas px-3 pt-3 pb-2 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full bg-canvas-soft py-2 pl-5 pr-2">
          <Logo />

          <nav className="flex min-w-0 items-center gap-1 text-sm">
            {/* 로그인 상태를 확인하는 동안에는 비워둔다 (깜빡임 방지) */}
            {!loading && !profile && (
              <Link to="/login" className={buttonClass('primary', 'sm')}>
                로그인
              </Link>
            )}

            {!loading && profile && (
              <>
                <NavLink to={profile.role === 'donor' ? '/donor' : '/institution'} className={navLinkClass}>
                  {profile.role === 'donor' ? '기부하기' : '필요 물품 등록'}
                </NavLink>
                <NavLink
                  to="/mypage"
                  title="마이페이지"
                  aria-label="마이페이지"
                  className={({ isActive }) =>
                    `flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors sm:pr-3.5 ${
                      isActive ? 'bg-canvas' : 'hover:bg-canvas'
                    }`
                  }
                >
                  <Avatar src={profile.avatar_url} name={displayName(profile)} size="sm" />
                  <span className="hidden max-w-[9rem] truncate font-semibold text-ink sm:inline">
                    {displayName(profile)}
                  </span>
                </NavLink>
                <button type="button" onClick={handleSignOut} className={buttonClass('ghost', 'sm')}>
                  로그아웃
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* 위쪽이 둥근 잉크색 푸터 */}
      <footer className="mt-20 rounded-t-3xl bg-ink px-6 py-12 text-white sm:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-4xl font-display leading-none sm:text-5xl">나눔 매칭.</p>
          <p className="mt-4 max-w-md text-sm text-faint">
            남는 물건을 필요한 곳으로. 기부자와 복지 기관을 물품 정보로 자동 연결하는 서비스예요.
          </p>
          <p className="mt-10 text-xs text-faint">정보과학 프로젝트 · 기부자·기관 프로필과 기부 크레딧 기반 나눔 자동 매칭 플랫폼</p>
        </div>
      </footer>
    </div>
  )
}

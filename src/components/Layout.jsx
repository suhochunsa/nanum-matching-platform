import { Link, Outlet, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-700 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-base">
              🤝
            </span>
            나눔 매칭
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 text-sm">
            {!isHome && (
              <Link
                to="/"
                className="rounded-md px-3 py-1.5 hover:bg-white/10 transition-colors"
              >
                홈으로
              </Link>
            )}
            <Link
              to="/donor"
              className="rounded-md px-3 py-1.5 hover:bg-white/10 transition-colors"
            >
              기부자
            </Link>
            <Link
              to="/institution"
              className="rounded-md px-3 py-1.5 hover:bg-white/10 transition-colors"
            >
              기관
            </Link>
            <Link
              to="/login"
              className="ml-1 rounded-md bg-white/15 px-3 py-1.5 font-medium hover:bg-white/25 transition-colors"
            >
              로그인
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-[#f6f8f9]">
        <Outlet />
      </main>

      <footer className="bg-brand-900 text-brand-100 text-xs text-center py-4">
        정보과학 프로젝트 · 기부자·기관 자동 매칭 플랫폼 (프론트엔드 목업 · 데이터는 아직 저장되지 않습니다)
      </footer>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [userType, setUserType] = useState('individual') // 'individual' | 'institution'
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    // TODO(6~7차시): Supabase Auth 연동 후 실제 로그인 처리로 교체
    navigate(userType === 'institution' ? '/institution' : '/donor')
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-brand-800 text-center mb-8">로그인</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 기관 / 개인 체크 */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-brand-50 p-1">
          <button
            type="button"
            onClick={() => setUserType('individual')}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              userType === 'individual'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-brand-700'
            }`}
          >
            개인(기부자)
          </button>
          <button
            type="button"
            onClick={() => setUserType('institution')}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              userType === 'institution'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-brand-700'
            }`}
          >
            기관
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-black/70 mb-1">아이디</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="아이디 입력"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black/70 mb-1">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 py-2.5 text-white font-semibold hover:bg-brand-700 transition-colors"
        >
          로그인
        </button>

        <p className="text-xs text-center text-black/40">
          * 아직 회원 데이터베이스가 연결되지 않아, 로그인 시 선택한 유형의 화면으로 바로 이동합니다.
        </p>
      </form>
    </div>
  )
}

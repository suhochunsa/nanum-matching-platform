import { useState } from 'react'
import { Link } from 'react-router-dom'
import MatchList from '../components/MatchList.jsx'
import { CATEGORIES } from '../data/mockData.js'
import { matchInstitutionToDonors } from '../data/matching.js'

export default function InstitutionPage() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [quantity, setQuantity] = useState(1)
  const [orgInfo, setOrgInfo] = useState('')
  const [result, setResult] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    // TODO(6~7차시): Supabase에 기관·필요 물품 정보 저장
    setResult({
      id: Date.now(),
      category,
      ...matchInstitutionToDonors({ category, title, quantity }),
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-xl font-bold text-brand-800 mb-6">기관용 화면</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* 왼쪽: 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Link
            to="/"
            className="inline-block rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
          >
            홈 화면으로 가기
          </Link>

          <div>
            <label className="block text-sm font-medium text-black/70 mb-1">
              필요 물품 이름 입력
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 겨울 패딩 점퍼"
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black/70 mb-1">
              필요 물품 범주 입력
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black/70 mb-1">
              필요 물품 수량 입력
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black/70 mb-1">기관 정보 입력</label>
            <input
              type="text"
              value={orgInfo}
              onChange={(e) => setOrgInfo(e.target.value)}
              placeholder="기관명 · 위치 · 연락처"
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-accent-500 py-2.5 text-white font-semibold hover:bg-accent-600 transition-colors"
          >
            일치 결과 확인하기
          </button>
        </form>

        {/* 오른쪽: 데이터베이스 내 일치 결과 */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-[320px] rounded-2xl bg-brand-700 p-6 text-white">
            <h2 className="font-semibold mb-4">데이터베이스 내 일치 결과</h2>

            {!result && (
              <p className="text-brand-100 text-sm">
                왼쪽 입력을 채우고 "일치 결과 확인하기"를 누르면 결과가 여기에 표시돼요.
              </p>
            )}

            {result && result.matches.length > 0 && (
              <div>
                <p className="text-sm text-brand-100 mb-2">
                  조건과 잘 맞는 기부 물품 {result.matches.length}건 (점수 높은 순)
                </p>
                <MatchList
                  key={result.id}
                  matches={result.matches}
                  primary={(m) => m.title}
                  secondary={(m) => `${m.category} · 기부자 ${m.donor} · 수량 ${m.quantity} · ${m.condition}`}
                />
              </div>
            )}

            {result && result.matches.length === 0 && (
              <p className="text-sm text-brand-100">
                비슷한 물품을 등록한 기부자가 아직 없어요. 조건을 데이터베이스에
                등록해두면 나중에 등록되는 기부 물품과 자동으로 연결돼요.
              </p>
            )}
          </div>

          <button
            type="button"
            className="rounded-xl bg-brand-100 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-200 transition-colors"
          >
            {result && result.matches.length === 0
              ? '데이터베이스 등록 안내'
              : '(매칭 결과가 없을 경우) 데이터베이스 등록 안내'}
          </button>
        </div>
      </div>
    </div>
  )
}

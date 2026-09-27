import { useState } from 'react'
import { Link } from 'react-router-dom'
import MatchList from '../components/MatchList.jsx'
import { CATEGORIES, CONDITIONS } from '../data/mockData.js'
import { matchDonorToInstitutions } from '../data/matching.js'

export default function DonorPage() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState(CONDITIONS[0])
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    // TODO(6~7차시): Supabase에 기부 물품 정보 저장
    setResult({
      id: Date.now(),
      category,
      ...matchDonorToInstitutions({ category, title, quantity, condition }),
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-xl font-bold text-brand-800 mb-6">기부자 신청</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* 왼쪽: 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Link
            to="/"
            className="inline-block rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
          >
            홈으로 가기
          </Link>

          <div>
            <label className="block text-sm font-medium text-black/70 mb-1">
              이미지·사진 입력
            </label>
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 text-sm text-brand-600 hover:bg-brand-100 transition-colors">
              {fileName || '사진을 선택하세요'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-black/70 mb-1">물품 이름 입력</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 아디다스 겨울 패딩"
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black/70 mb-1">
              물품의 범주 입력
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
            <label className="block text-sm font-medium text-black/70 mb-1">수량 입력</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black/70 mb-1">상태 입력</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-accent-500 py-2.5 text-white font-semibold hover:bg-accent-600 transition-colors"
          >
            매칭 확인하기
          </button>
        </form>

        {/* 오른쪽: 매칭 결과 · 예상 적립 크레딧 화면 */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-[320px] rounded-2xl bg-brand-700 p-6 text-white">
            <h2 className="font-semibold mb-4">매칭 결과, 예상 적립 크레딧 화면</h2>

            {!result && (
              <p className="text-brand-100 text-sm">
                왼쪽 입력을 채우고 "매칭 확인하기"를 누르면 결과가 여기에 표시돼요.
              </p>
            )}

            {result && (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/10 px-4 py-3">
                  <p className="text-sm text-brand-100">이번 기부로 예상되는 적립 크레딧</p>
                  <p className="text-2xl font-bold">{result.estimatedCredit} 크레딧</p>
                </div>

                {result.matches.length > 0 ? (
                  <div>
                    <p className="text-sm text-brand-100 mb-2">
                      이 물품과 잘 맞는 기관 필요 물품 {result.matches.length}건 (점수 높은 순)
                    </p>
                    <MatchList
                      key={result.id}
                      matches={result.matches}
                      primary={(m) => `${m.org} · ${m.title}`}
                      secondary={(m) => `${m.category} · 필요 수량 ${m.quantity}`}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-brand-100">
                    비슷한 물품을 필요로 하는 기관이 아직 없어요. 아래 버튼으로 데이터베이스에
                    등록해두면 나중에 필요한 기관과 자동으로 연결돼요.
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="rounded-xl bg-brand-100 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-200 transition-colors"
          >
            {result && result.matches.length === 0
              ? '데이터베이스에 등록하기'
              : '매칭 안내 · 데이터베이스 등록 버튼'}
          </button>
        </div>
      </div>
    </div>
  )
}

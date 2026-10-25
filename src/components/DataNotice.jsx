/**
 * DB 대신 예시(mock) 데이터를 보여주고 있을 때만 나타나는 안내.
 * source: store.js loadData()의 source ('supabase' | 'mock'), error: 연결하지 못한 이유
 */
export default function DataNotice({ source, error }) {
  if (source !== 'mock') return null
  return (
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">데이터베이스에 연결하지 못해 예시 데이터를 보여주고 있어요.</p>
      {error && <p className="mt-0.5 text-xs text-amber-800">이유: {error}</p>}
    </div>
  )
}

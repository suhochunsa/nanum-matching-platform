import { useState } from 'react'

const PAGE_SIZE = 10

const SCORE_CHIPS = [
  ['category', '카테고리'],
  ['name', '이름'],
  ['quantity', '수량'],
]

/**
 * 점수 순으로 정렬된 매칭 결과를 상위 10개까지 보여주고,
 * 나머지는 "더보기" 버튼을 누를 때마다 10개씩 펼친다.
 * 새 검색마다 부모에서 key를 바꿔 펼침 상태를 초기화한다.
 */
export default function MatchList({ matches, primary, secondary }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const remaining = matches.length - visible

  return (
    <div>
      <ul className="space-y-2">
        {matches.slice(0, visible).map((m, i) => (
          <li key={m.id} className="rounded-lg bg-white/10 px-3 py-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="mr-2 text-brand-200">{i + 1}</span>
                  {primary(m)}
                </p>
                <p className="mt-0.5 text-brand-100">{secondary(m)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-semibold text-white">
                {m.score}점
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-brand-100">
              {SCORE_CHIPS.map(([key, label]) => (
                <span key={key} className="rounded bg-white/10 px-1.5 py-0.5">
                  {label} {Math.round(m.breakdown[key] * 100)}%
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mt-3 w-full rounded-lg bg-white/15 py-2 text-sm font-medium hover:bg-white/25 transition-colors"
        >
          더보기 ({remaining}개 남음)
        </button>
      )}
    </div>
  )
}

import { useState } from 'react'
import PhotoThumb from './PhotoThumb.jsx'
import { buttonClass } from './ui.js'

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
 * renderDetail을 주면 항목마다 detailLabel 버튼이 생기고, 누르면 그 내용(기부·수령 방법)을 펼친다.
 * photo를 주면 항목 왼쪽에 물품 사진 썸네일을 보여준다. (기관 화면의 기부 물품 목록)
 */
export default function MatchList({ matches, primary, secondary, detailLabel, renderDetail, photo }) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [openIds, setOpenIds] = useState(() => new Set())
  const remaining = matches.length - visible

  function toggleDetail(id) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <ul className="space-y-2">
        {matches.slice(0, visible).map((m, i) => {
          const isOpen = openIds.has(m.id)
          return (
            <li key={m.id} className="rounded-2xl bg-canvas px-4 py-3.5 text-sm">
              <div className="flex items-start gap-3">
                {photo && <PhotoThumb src={photo(m)} alt={primary(m)} />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    <span className="mr-2 tabular-nums text-faint">{i + 1}</span>
                    {primary(m)}
                  </p>
                  <p className="mt-0.5 text-muted">{secondary(m)}</p>
                </div>
                {/* 매칭 점수: 화면에서 유일하게 파란색을 쓰는 "결정 신호" */}
                <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
                  {m.score}점
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                {SCORE_CHIPS.map(([key, label]) => (
                  <span key={key} className="rounded-full bg-canvas-soft px-2 py-0.5 tabular-nums">
                    {label} {Math.round(m.breakdown[key] * 100)}%
                  </span>
                ))}
                {renderDetail && (
                  <button
                    type="button"
                    onClick={() => toggleDetail(m.id)}
                    aria-expanded={isOpen}
                    className="ml-auto rounded-full bg-canvas-soft px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-field"
                  >
                    {detailLabel} {isOpen ? '▴' : '▾'}
                  </button>
                )}
              </div>
              {renderDetail && isOpen && <div className="mt-2.5">{renderDetail(m)}</div>}
            </li>
          )
        })}
      </ul>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className={`${buttonClass('outline', 'md')} mt-3 w-full`}
        >
          더보기 ({remaining}개 남음)
        </button>
      )}
    </div>
  )
}

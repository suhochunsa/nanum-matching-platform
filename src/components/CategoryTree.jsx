import { useState } from 'react'
import { CATEGORY_TREE, formatCategory, leafId } from '../data/categories.js'

/**
 * 큰 카테고리 → 세부 카테고리 트리에서 여러 개를 고르는 입력.
 * - 큰 카테고리 이름을 누르면 세부 카테고리 가지가 펼쳐진다.
 * - 큰 카테고리 체크박스는 그 아래 세부 카테고리를 한 번에 선택/해제한다.
 * value / onChange는 "큰/세부" 문자열 배열.
 */
export default function CategoryTree({ id, value, onChange, error }) {
  const [open, setOpen] = useState(() => new Set())
  const selected = new Set(value)

  function toggleLeaf(leaf) {
    onChange(selected.has(leaf) ? value.filter((l) => l !== leaf) : [...value, leaf])
  }

  function toggleGroup(group, leaves) {
    const allSelected = leaves.every((l) => selected.has(l))
    onChange(allSelected ? value.filter((l) => !leaves.includes(l)) : [...value, ...leaves.filter((l) => !selected.has(l))])
    setOpen((prev) => new Set(prev).add(group))
  }

  function toggleOpen(group) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <div
      id={id}
      tabIndex={-1}
      className={`rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 ${
        error ? 'border-red-400 focus:ring-red-300' : 'border-black/10 focus:ring-brand-400'
      }`}
    >
      {/* 선택한 항목 요약: × 로 바로 뺄 수 있다 */}
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 border-b border-black/5 px-3 py-2">
        {value.length === 0 ? (
          <span className="text-black/40">아래에서 범주를 하나 이상 골라 주세요</span>
        ) : (
          value.map((leaf) => (
            <span
              key={leaf}
              className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-brand-700"
            >
              {formatCategory(leaf)}
              <button
                type="button"
                onClick={() => toggleLeaf(leaf)}
                aria-label={`${formatCategory(leaf)} 선택 해제`}
                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand-500/20"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <ul className="divide-y divide-black/5">
        {CATEGORY_TREE.map((group) => {
          const leaves = group.children.map((child) => leafId(group.name, child))
          const count = leaves.filter((l) => selected.has(l)).length
          const isOpen = open.has(group.name)

          return (
            <li key={group.name}>
              <div className="flex items-center gap-2.5 px-3 py-2">
                <input
                  type="checkbox"
                  checked={count === leaves.length}
                  ref={(el) => {
                    if (el) el.indeterminate = count > 0 && count < leaves.length
                  }}
                  onChange={() => toggleGroup(group.name, leaves)}
                  aria-label={`${group.name} 전체 선택`}
                  className="h-4 w-4 accent-brand-600"
                />
                <button
                  type="button"
                  onClick={() => toggleOpen(group.name)}
                  aria-expanded={isOpen}
                  className="flex flex-1 items-center justify-between text-left"
                >
                  <span className="font-medium">{group.name}</span>
                  <span className="flex items-center gap-2 text-xs text-black/45">
                    {count > 0 && <span className="text-brand-600">{count}개 선택</span>}
                    <span className={`inline-block transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>
                  </span>
                </button>
              </div>

              {isOpen && (
                <div className="mb-2.5 ml-[1.1rem] mr-3 flex flex-wrap gap-1.5 border-l-2 border-brand-200 pl-3">
                  {group.children.map((child) => {
                    const leaf = leafId(group.name, child)
                    const on = selected.has(leaf)
                    return (
                      <button
                        key={leaf}
                        type="button"
                        onClick={() => toggleLeaf(leaf)}
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          on
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-black/10 text-black/70 hover:border-brand-300 hover:bg-brand-50'
                        }`}
                      >
                        {on && '✓ '}
                        {child}
                      </button>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

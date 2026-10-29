import { DELIVERY_METHODS } from '../data/delivery.js'

/**
 * 전달 방법 여러 개 선택. audience가 'donor'면 기부자 입장 설명, 'org'면 기관 입장 설명을 보여준다.
 * value / onChange는 방법 id 배열 (dropoff / parcel / pickup).
 */
export default function MethodPicker({ id, value, onChange, error, audience }) {
  function toggle(methodId) {
    onChange(value.includes(methodId) ? value.filter((v) => v !== methodId) : [...value, methodId])
  }

  return (
    <div id={id} tabIndex={-1} className="grid gap-2 rounded-2xl focus:outline-none">
      {DELIVERY_METHODS.map((m) => {
        const on = value.includes(m.id)
        return (
          <label
            key={m.id}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 text-sm transition-colors ${
              on ? 'bg-canvas ring-2 ring-ink' : error ? 'bg-field ring-2 ring-red-500' : 'bg-field hover:bg-hairline'
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(m.id)}
              className="mt-0.5 h-4 w-4 accent-ink"
            />
            <span>
              <span className="block font-semibold">{m.label}</span>
              <span className="block text-xs text-muted">
                {audience === 'donor' ? m.donorHint : m.orgHint}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

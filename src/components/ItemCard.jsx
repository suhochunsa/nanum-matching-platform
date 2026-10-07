import { formatCategory } from '../data/categories.js'
import PhotoThumb from './PhotoThumb.jsx'

// 카드가 너무 길어지지 않게 범주 뱃지는 2개까지만 보여주고 나머지는 +N으로 줄인다.
const MAX_BADGES = 2

/** showPhoto: 기부 물품 카드처럼 사진 칸이 필요한 경우 true (photo가 없으면 "사진 없음") */
export default function ItemCard({ categories, title, quantity, sub, subLabel, tone = 'brand', showPhoto, photo }) {
  const badgeClasses =
    tone === 'accent'
      ? 'bg-accent-500/15 text-accent-600'
      : 'bg-brand-500/10 text-brand-600'
  const hidden = categories.length - MAX_BADGES

  return (
    <div className="flex gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      {showPhoto && <PhotoThumb src={photo} alt={title} />}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1">
          {categories.slice(0, MAX_BADGES).map((leaf) => (
            <span key={leaf} className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses}`}>
              {formatCategory(leaf)}
            </span>
          ))}
          {hidden > 0 && (
            <span className="inline-block rounded-full px-2 py-1 text-xs text-black/45">+{hidden}</span>
          )}
        </div>
        <h3 className="mt-2 font-semibold text-[15px] leading-snug">{title}</h3>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm text-black/60">
          <span className="whitespace-nowrap">수량 {quantity}</span>
          {sub && (
            <span className="min-w-0 truncate text-black/50">
              {subLabel ? `${subLabel} ` : ''}
              {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

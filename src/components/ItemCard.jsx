import { formatCategory } from '../data/categories.js'
import { availabilityLabel, daysLeft, isExpired } from '../data/dates.js'
import Avatar from './Avatar.jsx'
import PhotoThumb from './PhotoThumb.jsx'
import { chipClass } from './ui.js'

// 카드가 너무 길어지지 않게 범주 뱃지는 2개까지만 보여주고 나머지는 +N으로 줄인다.
const MAX_BADGES = 2

/**
 * 홈 화면 목록 카드 (모서리 24px, 그림자 없이 옅은 1px 테두리).
 * showPhoto: 기부 물품 카드처럼 사진 칸이 필요한 경우 true (photo가 없으면 "사진 없음")
 * availableUntil: 기부 가능 마감일. 지나면 빨간 테두리와 "기부 가능 기간 만료" 표시,
 *   3일 이내로 남으면 파란색으로 강조. null(기한 없음)이나 생략하면 아무것도 표시하지 않는다.
 * meta: 수량 옆에 붙일 짧은 정보 (예: 물품 상태)
 * owner: { name, avatar } 올린 사람(기부자 닉네임·기관명). 카드 오른쪽 아래에 작게 보여준다.
 */
export default function ItemCard({ categories, title, quantity, meta, owner, showPhoto, photo, availableUntil }) {
  const hidden = categories.length - MAX_BADGES
  const expired = isExpired(availableUntil)
  const urgent = Boolean(availableUntil) && !expired && daysLeft(availableUntil) <= 3

  return (
    <article
      className={`flex h-full gap-4 rounded-3xl border bg-canvas p-5 transition-colors ${
        expired ? 'border-red-500 ring-1 ring-red-500' : 'border-hairline-soft hover:border-hairline'
      }`}
    >
      {showPhoto && <PhotoThumb src={photo} alt={title} />}

      <div className="flex min-w-0 flex-1 flex-col">
        {expired && (
          <p className="mb-2 self-start rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
            기부 가능 기간 만료
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {categories.slice(0, MAX_BADGES).map((leaf) => (
            <span key={leaf} className={chipClass}>
              {formatCategory(leaf)}
            </span>
          ))}
          {hidden > 0 && <span className="px-1.5 py-1 text-xs font-semibold text-muted">+{hidden}</span>}
        </div>
        <h3 className="mt-2.5 text-base font-display leading-snug text-ink">{title}</h3>
        <p className="mt-1 text-sm text-muted">
          수량 {quantity}
          {meta && <> · {meta}</>}
        </p>
        {availableUntil && (
          <p
            className={`mt-1 text-xs ${
              expired ? 'font-semibold text-red-600' : urgent ? 'font-semibold text-accent' : 'text-faint'
            }`}
          >
            기부 가능: {availabilityLabel(availableUntil)}
          </p>
        )}

        {/* 맨 아래 오른쪽: 올린 사람 */}
        {owner && (
          <div className="mt-auto flex justify-end pt-3">
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink">
              <Avatar src={owner.avatar} name={owner.name} size="xs" />
              <span className="truncate">{owner.name}</span>
            </span>
          </div>
        )}
      </div>
    </article>
  )
}

import { formatCategory } from '../data/categories.js'
import { availabilityLabel, daysLeft, isExpired } from '../data/dates.js'
import Avatar from './Avatar.jsx'
import PhotoThumb from './PhotoThumb.jsx'

// 카드가 너무 길어지지 않게 범주 뱃지는 2개까지만 보여주고 나머지는 +N으로 줄인다.
const MAX_BADGES = 2

/**
 * showPhoto: 기부 물품 카드처럼 사진 칸이 필요한 경우 true (photo가 없으면 "사진 없음")
 * availableUntil: 기부 가능 마감일. 지나면 빨간 테두리와 "기부 가능 기간 만료" 표시,
 *   3일 이내로 남으면 주황색으로 강조. null(기한 없음)이나 생략하면 아무것도 표시하지 않는다.
 * meta: 수량 옆에 붙일 짧은 정보 (예: 물품 상태)
 * owner: { name, avatar } 올린 사람(기부자 닉네임·기관명). 카드 오른쪽 아래에 작게 보여준다.
 */
export default function ItemCard({
  categories,
  title,
  quantity,
  meta,
  owner,
  tone = 'brand',
  showPhoto,
  photo,
  availableUntil,
}) {
  const badgeClasses =
    tone === 'accent'
      ? 'bg-accent-500/15 text-accent-600'
      : 'bg-brand-500/10 text-brand-600'
  const hidden = categories.length - MAX_BADGES
  const expired = isExpired(availableUntil)
  const urgent = Boolean(availableUntil) && !expired && daysLeft(availableUntil) <= 3

  return (
    <div
      className={`flex gap-3 rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${
        expired ? 'border-red-500 ring-1 ring-red-500' : 'border-black/5'
      }`}
    >
      {showPhoto && <PhotoThumb src={photo} alt={title} />}

      <div className="flex min-w-0 flex-1 flex-col">
        {expired && (
          <p className="mb-1.5 self-start rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
            기부 가능 기간 만료
          </p>
        )}
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
        <p className="mt-2 text-sm text-black/60">
          수량 {quantity}
          {meta && <span className="text-black/45"> · {meta}</span>}
        </p>

        {/* 맨 아래 줄: 왼쪽 기부 가능 기간, 오른쪽 올린 사람 */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          {availableUntil ? (
            <p
              className={`text-xs ${
                expired ? 'text-red-600' : urgent ? 'font-medium text-accent-600' : 'text-black/45'
              }`}
            >
              기부 가능: {availabilityLabel(availableUntil)}
            </p>
          ) : (
            <span />
          )}
          {owner && (
            <span className="flex min-w-0 shrink items-center gap-1.5 text-xs text-black/55">
              <Avatar src={owner.avatar} name={owner.name} size="xs" />
              <span className="truncate">{owner.name}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

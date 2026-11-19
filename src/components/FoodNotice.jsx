import { formatDate } from '../data/dates.js'
import { COLD_STORAGE, foodState, foodSummary } from '../data/food.js'
import PhotoThumb from './PhotoThumb.jsx'

/** 사진 한 장 + 아래 작은 설명 */
function CaptionedPhoto({ src, alt, caption }) {
  return (
    <figure className="flex flex-col items-center gap-1">
      <PhotoThumb src={src} alt={alt} />
      <figcaption className="text-[11px] text-muted">{caption}</figcaption>
    </figure>
  )
}

/**
 * 식품 물품의 소비기한·보관·개봉 정보와 사진 (기관 매칭 결과, 홈 상세창, 마이페이지에서 사용)
 * 기관이 '입력된 소비기한'과 '소비기한 표시 사진'을 나란히 보고 대조할 수 있게 한다.
 */
export default function FoodNotice({ item }) {
  const state = foodState(item)
  if (state === 'none') return null
  return (
    <div className="space-y-3 rounded-2xl bg-canvas-soft px-4 py-3 text-[13px]">
      <div className="space-y-1">
        <p className="font-semibold">식품 정보</p>
        <p className={state === 'expired' ? 'font-semibold text-red-600' : 'text-muted'}>
          {foodSummary(item)}
          {state === 'expired' && ' · 소비기한 지남'}
        </p>
        {COLD_STORAGE.includes(item.foodStorage) && (
          <p className="text-xs font-semibold text-ink">
            {item.foodStorage === 'frozen' ? '냉동' : '냉장'} 식품이에요. 택배로 받으면 바로 상태를 확인하고 {item.foodStorage === 'frozen' ? '냉동' : '냉장'} 보관하세요.
          </p>
        )}
        {item.foodOpened && <p className="text-xs font-semibold text-red-600">개봉한 식품이에요. 받기 전에 상태를 꼭 확인하세요.</p>}
        {state === 'missing' && <p className="text-xs text-red-600">소비기한·사진 정보가 없어 매칭할 수 없어요.</p>}
      </div>

      {(item.foodExpiryPhoto || item.foodLabel) && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            {item.foodExpiryPhoto && (
              <CaptionedPhoto src={item.foodExpiryPhoto} alt={`${item.title} 소비기한 표시`} caption="소비기한 표시" />
            )}
            {item.foodLabel && <CaptionedPhoto src={item.foodLabel} alt={`${item.title} 라벨`} caption="라벨" />}
          </div>
          {item.foodExpiryPhoto && item.foodExpiry && (
            <p className="rounded-xl bg-canvas px-3 py-2 text-xs">
              입력된 소비기한 <strong>{formatDate(item.foodExpiry)} ({item.foodExpiry.slice(0, 4)}년)</strong> — 사진의 날짜와 같은지 확인하세요.
              사진을 누르면 크게 볼 수 있어요.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

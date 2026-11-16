import { COLD_STORAGE, foodState, foodSummary } from '../data/food.js'
import PhotoThumb from './PhotoThumb.jsx'

/** 식품 물품의 소비기한·보관·개봉 정보와 라벨 사진 (기관 매칭 결과, 마이페이지에서 사용) */
export default function FoodNotice({ item }) {
  const state = foodState(item)
  if (state === 'none') return null
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-canvas-soft px-4 py-3 text-[13px]">
      {item.foodLabel && <PhotoThumb src={item.foodLabel} alt={`${item.title} 라벨`} />}
      <div className="min-w-0 space-y-1">
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
        {state === 'missing' && <p className="text-xs text-red-600">소비기한·라벨 정보가 없어 매칭할 수 없어요.</p>}
        {item.foodLabel && <p className="text-xs text-faint">라벨 사진을 누르면 크게 볼 수 있어요.</p>}
      </div>
    </div>
  )
}

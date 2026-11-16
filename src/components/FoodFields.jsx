import { useEffect, useState } from 'react'
import { FOOD_STORAGE } from '../data/food.js'
import { todayString } from '../data/dates.js'
import { MAX_PHOTO_MB } from '../data/validation.js'
import FormField from './FormField.jsx'
import { fieldClass } from './ui.js'

const OPENED_CHOICES = [
  ['unopened', '미개봉'],
  ['opened', '개봉함'],
]

/** 알약 모양 선택 버튼 묶음 (라디오) */
function PillChoice({ id, value, onChange, options, error }) {
  return (
    <div id={id} tabIndex={-1} role="radiogroup" className={`flex flex-wrap gap-2 rounded-2xl focus:outline-none ${error ? 'ring-2 ring-red-500 p-1' : ''}`}>
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            value === key ? 'bg-ink text-white' : 'bg-field text-ink hover:bg-hairline'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * 식품 정보 입력칸: 소비기한, 개봉 여부, 보관 방법, 라벨 사진.
 * values: { foodExpiry, foodOpened, foodStorage, foodLabel(File) }, onChange(field, value)
 * idPrefix: 한 화면에 여러 개가 있을 때 id가 겹치지 않게 (기부자 신청 폼은 '')
 */
export default function FoodFields({ values, onChange, errors = {}, idPrefix = '' }) {
  const id = (name) => `${idPrefix}${name}`
  const [preview, setPreview] = useState('')
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function handleLabel(e) {
    const file = e.target.files?.[0] ?? null
    onChange('foodLabel', file)
    setPreview(file?.type.startsWith('image/') ? URL.createObjectURL(file) : '')
  }

  return (
    <div className="space-y-4">
      <FormField
        id={id('foodExpiry')}
        label="소비기한"
        required
        hint="포장에 적힌 소비기한이에요. 이 날짜까지만 기부할 수 있고, 지나면 자동으로 매칭되지 않아요."
        error={errors.foodExpiry}
      >
        <input
          id={id('foodExpiry')}
          type="date"
          min={todayString()}
          value={values.foodExpiry}
          onChange={(e) => onChange('foodExpiry', e.target.value)}
          className={fieldClass(errors.foodExpiry)}
        />
      </FormField>

      <FormField id={id('foodOpened')} label="개봉 여부" required error={errors.foodOpened}>
        <PillChoice id={id('foodOpened')} value={values.foodOpened} onChange={(v) => onChange('foodOpened', v)} options={OPENED_CHOICES} error={errors.foodOpened} />
      </FormField>
      {values.foodOpened === 'opened' && (
        <p role="note" className="rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-700">
          개봉한 식품은 위생 문제로 받지 않는 기관이 많아요. 기관에는 '개봉함'으로 표시돼요.
        </p>
      )}

      <FormField
        id={id('foodStorage')}
        label="보관 방법"
        required
        hint="냉장·냉동 식품을 택배로 보낼 때는 아이스팩·보냉 포장을 해 주세요."
        error={errors.foodStorage}
      >
        <PillChoice id={id('foodStorage')} value={values.foodStorage} onChange={(v) => onChange('foodStorage', v)} options={Object.entries(FOOD_STORAGE)} error={errors.foodStorage} />
      </FormField>

      <FormField
        id={id('foodLabel')}
        label="라벨 사진"
        required
        hint={`제품명·소비기한·원재료가 보이게 찍어 주세요. ${MAX_PHOTO_MB}MB 이하 이미지`}
        error={errors.foodLabel}
      >
        <label
          className={`flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-field text-sm font-semibold transition-colors ${
            errors.foodLabel ? 'text-red-600 ring-2 ring-red-500' : 'text-muted hover:bg-hairline'
          }`}
        >
          {preview ? (
            <img src={preview} alt="선택한 식품 라벨 사진 미리보기" className="h-full w-full object-contain" />
          ) : (
            values.foodLabel?.name || '라벨 사진을 선택하세요'
          )}
          <input id={id('foodLabel')} type="file" accept="image/*" className="sr-only" onChange={handleLabel} />
        </label>
      </FormField>
    </div>
  )
}

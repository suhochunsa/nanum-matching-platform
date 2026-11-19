import { useEffect, useState } from 'react'
import { FOOD_STORAGE, maxExpiryDate } from '../data/food.js'
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

/** 사진 한 장 고르기 (미리보기 포함). 파일은 onChange(File | null)로 넘긴다. */
function PhotoPicker({ id, file, onChange, error, placeholder, alt }) {
  const [preview, setPreview] = useState('')
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function handle(e) {
    const next = e.target.files?.[0] ?? null
    onChange(next)
    setPreview(next?.type.startsWith('image/') ? URL.createObjectURL(next) : '')
  }

  return (
    <label
      className={`flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-field text-sm font-semibold transition-colors ${
        error ? 'text-red-600 ring-2 ring-red-500' : 'text-muted hover:bg-hairline'
      }`}
    >
      {preview ? <img src={preview} alt={alt} className="h-full w-full object-contain" /> : file?.name || placeholder}
      <input id={id} type="file" accept="image/*" className="sr-only" onChange={handle} />
    </label>
  )
}

/**
 * 식품 정보 입력칸: 소비기한, 소비기한 표시 사진, 개봉 여부, 보관 방법, 라벨 사진.
 * values: { foodExpiry, foodExpiryPhoto(File), foodOpened, foodStorage, foodLabel(File) }, onChange(field, value)
 * idPrefix: 한 화면에 여러 개가 있을 때 id가 겹치지 않게 (기부자 신청 폼은 '')
 */
export default function FoodFields({ values, onChange, errors = {}, idPrefix = '' }) {
  const id = (name) => `${idPrefix}${name}`

  return (
    <div className="space-y-4">
      <FormField
        id={id('foodExpiry')}
        label="소비기한"
        required
        hint="포장에 적힌 소비기한이에요. 이 날짜까지만 기부할 수 있고, 지나면 자동으로 매칭되지 않아요. (최대 3년 뒤까지)"
        error={errors.foodExpiry}
      >
        <input
          id={id('foodExpiry')}
          type="date"
          min={todayString()}
          max={maxExpiryDate()}
          value={values.foodExpiry}
          onChange={(e) => onChange('foodExpiry', e.target.value)}
          className={fieldClass(errors.foodExpiry)}
        />
      </FormField>

      <FormField
        id={id('foodExpiryPhoto')}
        label="소비기한 표시 사진"
        required
        hint={`포장에 날짜가 찍힌 부분을 가까이, 글자가 읽히게 찍어 주세요. 기관이 위에 입력한 날짜와 대조해요. ${MAX_PHOTO_MB}MB 이하`}
        error={errors.foodExpiryPhoto}
      >
        <PhotoPicker
          id={id('foodExpiryPhoto')}
          file={values.foodExpiryPhoto}
          onChange={(file) => onChange('foodExpiryPhoto', file)}
          error={errors.foodExpiryPhoto}
          placeholder="소비기한이 찍힌 부분 사진 선택"
          alt="선택한 소비기한 표시 사진 미리보기"
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
        hint={`제품명·원재료가 보이게 찍어 주세요. ${MAX_PHOTO_MB}MB 이하 이미지`}
        error={errors.foodLabel}
      >
        <PhotoPicker
          id={id('foodLabel')}
          file={values.foodLabel}
          onChange={(file) => onChange('foodLabel', file)}
          error={errors.foodLabel}
          placeholder="라벨 사진을 선택하세요"
          alt="선택한 식품 라벨 사진 미리보기"
        />
      </FormField>
    </div>
  )
}

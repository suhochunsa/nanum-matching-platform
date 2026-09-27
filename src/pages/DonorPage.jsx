import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../components/FormField.jsx'
import InputSummary from '../components/InputSummary.jsx'
import MatchList from '../components/MatchList.jsx'
import { fieldClass } from '../components/formStyles.js'
import { CATEGORIES, CONDITIONS } from '../data/mockData.js'
import { matchDonorToInstitutions } from '../data/matching.js'
import { MAX_DETAIL_LENGTH, MAX_PHOTO_MB, validateDonor } from '../data/validation.js'

const INITIAL_VALUES = {
  donorName: '',
  donorPhone: '',
  photo: null,
  title: '',
  category: CATEGORIES[0],
  condition: CONDITIONS[0],
  quantity: '1',
  detail: '',
}

export default function DonorPage() {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState(null)

  // 한 번 제출을 시도한 뒤부터는 입력할 때마다 다시 검사해서 오류 표시를 갱신한다.
  const errors = submitted ? validateDonor(values) : {}

  // 사진이 바뀌거나 페이지를 떠날 때 이전 미리보기 URL을 해제한다.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function update(field) {
    return (e) => setValues((v) => ({ ...v, [field]: e.target.value }))
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0] ?? null
    setValues((v) => ({ ...v, photo: file }))
    setPreview(file?.type.startsWith('image/') ? URL.createObjectURL(file) : '')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)

    const found = validateDonor(values)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    // TODO(6~7차시): Supabase에 기부자·기부 물품 정보 저장 (사진은 Storage에 업로드)
    setResult({
      id: Date.now(),
      submitted: {
        ...values,
        title: values.title.trim(),
        detail: values.detail.trim(),
        registeredAt: new Date().toLocaleDateString('ko-KR'),
      },
      ...matchDonorToInstitutions(values),
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-xl font-bold text-brand-800 mb-6">기부자 신청</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* 왼쪽: 입력 폼 */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <Link
            to="/"
            className="inline-block rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
          >
            홈으로 가기
          </Link>

          <fieldset className="space-y-4">
            <legend className="mb-3 font-semibold text-brand-800">기부자 정보</legend>

            <FormField id="donorName" label="이름" required error={errors.donorName}>
              <input
                id="donorName"
                type="text"
                value={values.donorName}
                onChange={update('donorName')}
                placeholder="홍길동"
                className={fieldClass(errors.donorName)}
              />
            </FormField>

            <FormField
              id="donorPhone"
              label="연락처"
              required
              hint="매칭된 기관이 연락할 번호예요."
              error={errors.donorPhone}
            >
              <input
                id="donorPhone"
                type="tel"
                inputMode="tel"
                value={values.donorPhone}
                onChange={update('donorPhone')}
                placeholder="010-1234-5678"
                className={fieldClass(errors.donorPhone)}
              />
            </FormField>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 font-semibold text-brand-800">물품 정보</legend>

            <FormField
              id="photo"
              label="이미지·사진 입력"
              hint={`선택 · ${MAX_PHOTO_MB}MB 이하 이미지`}
              error={errors.photo}
            >
              <label
                className={`flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-sm transition-colors ${
                  errors.photo
                    ? 'border-red-400 bg-red-50 text-red-600'
                    : 'border-brand-300 bg-brand-50 text-brand-600 hover:bg-brand-100'
                }`}
              >
                {preview ? (
                  <img src={preview} alt="선택한 물품 사진 미리보기" className="h-full w-full object-cover" />
                ) : (
                  values.photo?.name || '사진을 선택하세요'
                )}
                <input id="photo" type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
              </label>
            </FormField>

            <FormField id="title" label="물품 이름 입력" required error={errors.title}>
              <input
                id="title"
                type="text"
                value={values.title}
                onChange={update('title')}
                placeholder="예: 아디다스 겨울 패딩"
                className={fieldClass(errors.title)}
              />
            </FormField>

            <FormField id="category" label="물품의 범주 입력" required>
              <select
                id="category"
                value={values.category}
                onChange={update('category')}
                className={fieldClass()}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField id="quantity" label="수량 입력" required error={errors.quantity}>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max="999"
                  value={values.quantity}
                  onChange={update('quantity')}
                  className={fieldClass(errors.quantity)}
                />
              </FormField>

              <FormField id="condition" label="상태 입력" required>
                <select
                  id="condition"
                  value={values.condition}
                  onChange={update('condition')}
                  className={fieldClass()}
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField
              id="detail"
              label="상세 정보"
              hint={`선택 · 사이즈, 구매 시기, 하자 여부 등 (${values.detail.length}/${MAX_DETAIL_LENGTH})`}
              error={errors.detail}
            >
              <textarea
                id="detail"
                rows={3}
                value={values.detail}
                onChange={update('detail')}
                placeholder="예: 남성 L 사이즈, 작년 겨울 구매, 얼룩 없음"
                className={`${fieldClass(errors.detail)} resize-none`}
              />
            </FormField>
          </fieldset>

          <button
            type="submit"
            className="w-full rounded-lg bg-accent-500 py-2.5 text-white font-semibold hover:bg-accent-600 transition-colors"
          >
            매칭 확인하기
          </button>
        </form>

        {/* 오른쪽: 매칭 결과 · 예상 적립 크레딧 화면 */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-[320px] rounded-2xl bg-brand-700 p-6 text-white">
            <h2 className="font-semibold mb-4">매칭 결과, 예상 적립 크레딧 화면</h2>

            {!result && (
              <p className="text-brand-100 text-sm">
                왼쪽 입력을 채우고 "매칭 확인하기"를 누르면 결과가 여기에 표시돼요.
              </p>
            )}

            {result && (
              <div className="space-y-4">
                <InputSummary
                  rows={[
                    ['기부자', `${result.submitted.donorName} · ${result.submitted.donorPhone}`],
                    [
                      '물품',
                      `${result.submitted.title} (${result.submitted.category} · ${result.submitted.condition} · ${result.submitted.quantity}개)`,
                    ],
                    ['사진', result.submitted.photo ? result.submitted.photo.name : '없음'],
                    ['상세 정보', result.submitted.detail || '없음'],
                    ['등록일', result.submitted.registeredAt],
                  ]}
                />

                <div className="rounded-xl bg-white/10 px-4 py-3">
                  <p className="text-sm text-brand-100">이번 기부로 예상되는 적립 크레딧</p>
                  <p className="text-2xl font-bold">{result.estimatedCredit} 크레딧</p>
                </div>

                {result.matches.length > 0 ? (
                  <div>
                    <p className="text-sm text-brand-100 mb-2">
                      이 물품과 잘 맞는 기관 필요 물품 {result.matches.length}건 (점수 높은 순)
                    </p>
                    <MatchList
                      key={result.id}
                      matches={result.matches}
                      primary={(m) => `${m.org} · ${m.title}`}
                      secondary={(m) => `${m.category} · 필요 수량 ${m.quantity}`}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-brand-100">
                    비슷한 물품을 필요로 하는 기관이 아직 없어요. 아래 버튼으로 데이터베이스에
                    등록해두면 나중에 필요한 기관과 자동으로 연결돼요.
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="rounded-xl bg-brand-100 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-200 transition-colors"
          >
            {result && result.matches.length === 0
              ? '데이터베이스에 등록하기'
              : '매칭 안내 · 데이터베이스 등록 버튼'}
          </button>
        </div>
      </div>
    </div>
  )
}

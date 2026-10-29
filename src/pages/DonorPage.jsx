import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CategoryTree from '../components/CategoryTree.jsx'
import DataNotice from '../components/DataNotice.jsx'
import FormField from '../components/FormField.jsx'
import GuideBox from '../components/GuideBox.jsx'
import InputSummary from '../components/InputSummary.jsx'
import MatchList from '../components/MatchList.jsx'
import MethodPicker from '../components/MethodPicker.jsx'
import RegisterButton from '../components/RegisterButton.jsx'
import { buttonClass, fieldClass, pageTitleClass } from '../components/ui.js'
import { formatCategory } from '../data/categories.js'
import { availabilityLabel, todayString } from '../data/dates.js'
import { donationGuide, methodLabel } from '../data/delivery.js'
import { compressImage } from '../data/image.js'
import { CONDITIONS } from '../data/mockData.js'
import { matchDonorToInstitutions } from '../data/matching.js'
import { loadData, registerDonorItem, uploadItemPhoto } from '../data/store.js'
import { MAX_DETAIL_LENGTH, MAX_PHOTO_MB, validateDonor } from '../data/validation.js'
import { useAuth } from '../lib/authContext.js'

const INITIAL_VALUES = {
  donorName: '',
  donorPhone: '',
  region: '',
  photo: null,
  title: '',
  categories: [],
  condition: CONDITIONS[0],
  quantity: '1',
  availableUntil: '',
  noDeadline: false,
  detail: '',
  methods: [],
}

export default function DonorPage() {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [registerStatus, setRegisterStatus] = useState('idle')
  const [registerError, setRegisterError] = useState('')
  const { profile } = useAuth()
  const blockedReason = !profile
    ? '로그인한 기부자만 물품을 등록할 수 있어요.'
    : profile.role !== 'donor'
      ? '기부자 계정으로 로그인해야 물품을 등록할 수 있어요.'
      : ''

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

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)

    const found = validateDonor(values)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    // 매칭할 때마다 DB에서 최신 목록을 불러온다.
    setChecking(true)
    const data = await loadData()
    setChecking(false)

    setResult({
      id: Date.now(),
      submitted: {
        ...values,
        title: values.title.trim(),
        region: values.region.trim(),
        availableUntil: values.noDeadline ? null : values.availableUntil,
        detail: values.detail.trim(),
        registeredAt: new Date().toLocaleDateString('ko-KR'),
      },
      ...matchDonorToInstitutions(values, data),
      source: data.source,
      sourceError: data.error,
    })
    setRegisterStatus('ready')
  }

  // 매칭 확인 때 제출한 값(result.submitted)을 그대로 등록한다.
  // 사진이 있으면 줄여서 Storage에 먼저 올리고, 그 주소와 함께 DB 함수로 저장한다.
  async function handleRegister() {
    const s = result.submitted
    setRegisterStatus('saving')
    setRegisterError('')

    try {
      let photoUrl = ''
      if (s.photo) {
        let blob
        try {
          blob = await compressImage(s.photo)
        } catch {
          throw new Error('사진을 읽지 못했어요. JPG나 PNG 사진으로 다시 골라 매칭을 확인해 주세요.')
        }
        photoUrl = await uploadItemPhoto(blob)
      }

      await registerDonorItem({
        donorName: s.donorName,
        donorPhone: s.donorPhone,
        title: s.title,
        categories: s.categories,
        quantity: Number(s.quantity),
        condition: s.condition,
        detail: s.detail,
        region: s.region,
        methods: s.methods,
        availableUntil: s.availableUntil,
        photoUrl,
      })
      setRegisterStatus('done')
    } catch (e) {
      setRegisterError(e.message)
      setRegisterStatus('error')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h1 className={pageTitleClass}>기부자 신청</h1>
      <p className="mt-3 max-w-2xl text-base font-light text-muted sm:text-lg">나눌 물건의 정보를 입력하면 그 물건을 찾는 기관을 점수 순으로 보여드려요. 로그인하면 바로 등록할 수 있어요.</p>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[400px_1fr]">
        {/* 왼쪽: 입력 폼 */}
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <Link
            to="/"
            className={buttonClass('soft', 'sm')}
          >
            ← 홈으로
          </Link>

          <fieldset className="space-y-4">
            <legend className="mb-4 text-xl font-display text-ink">기부자 정보</legend>

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

            <FormField
              id="region"
              label="지역"
              required
              hint="시·구까지만 적어 주세요. 방문 수거 안내에 쓰여요."
              error={errors.region}
            >
              <input
                id="region"
                type="text"
                value={values.region}
                onChange={update('region')}
                placeholder="예: 서울 마포구"
                className={fieldClass(errors.region)}
              />
            </FormField>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-4 text-xl font-display text-ink">물품 정보</legend>

            <FormField
              id="photo"
              label="이미지·사진 입력"
              hint={`선택 · ${MAX_PHOTO_MB}MB 이하 이미지`}
              error={errors.photo}
            >
              <label
                className={`flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-field text-sm font-semibold transition-colors ${
                  errors.photo ? 'text-red-600 ring-2 ring-red-500' : 'text-muted hover:bg-hairline'
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

            <FormField
              id="categories"
              label="물품의 범주 입력"
              required
              hint="여러 개 선택할 수 있어요. 큰 범주를 눌러 세부 범주를 펼치세요."
              error={errors.categories}
            >
              <CategoryTree
                id="categories"
                value={values.categories}
                onChange={(categories) => setValues((v) => ({ ...v, categories }))}
                error={errors.categories}
              />
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
              id="availableUntil"
              label="기부 가능 마감일"
              required
              hint="유통기한 등으로 이 날짜까지만 기부할 수 있어요. 지나면 목록에 '만료'로 표시돼요."
              error={errors.availableUntil}
            >
              <div className="flex items-center gap-3">
                <input
                  id="availableUntil"
                  type="date"
                  min={todayString()}
                  value={values.availableUntil}
                  onChange={update('availableUntil')}
                  disabled={values.noDeadline}
                  className={`${fieldClass(errors.availableUntil)} disabled:opacity-40`}
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={values.noDeadline}
                    onChange={(e) => setValues((v) => ({ ...v, noDeadline: e.target.checked }))}
                    className="h-4 w-4 accent-ink"
                  />
                  기한 없음
                </label>
              </div>
            </FormField>

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

          <fieldset>
            <legend className="mb-4 text-xl font-display text-ink">전달 방법</legend>
            <FormField
              id="methods"
              label="가능한 전달 방법"
              required
              hint="여러 개 선택할 수 있어요. 기관이 받을 수 있는 방법과 맞춰 기부 방법을 안내해요."
              error={errors.methods}
            >
              <MethodPicker
                id="methods"
                audience="donor"
                value={values.methods}
                onChange={(methods) => setValues((v) => ({ ...v, methods }))}
                error={errors.methods}
              />
            </FormField>
          </fieldset>

          <button
            type="submit"
            disabled={checking}
            className={`${buttonClass('primary', 'lg')} w-full disabled:cursor-wait`}
          >
            {checking ? '불러오는 중…' : '매칭 확인하기'}
          </button>
        </form>

        {/* 오른쪽: 매칭 결과 · 예상 적립 크레딧 화면 */}
        <div className="flex flex-col gap-4">
          <div className="min-h-[320px] rounded-3xl bg-canvas-soft p-6 sm:p-8">
            <h2 className="mb-5 text-2xl font-display text-ink">매칭 결과</h2>

            {!result && (
              <p className="text-muted text-sm">
                왼쪽 입력을 채우고 "매칭 확인하기"를 누르면 결과가 여기에 표시돼요.
              </p>
            )}

            {result && (
              <div className="space-y-4">
                <DataNotice source={result.source} error={result.sourceError} />
                <InputSummary
                  rows={[
                    ['기부자', `${result.submitted.donorName} · ${result.submitted.donorPhone}`],
                    ['지역', result.submitted.region],
                    [
                      '물품',
                      `${result.submitted.title} (${result.submitted.condition} · ${result.submitted.quantity}개)`,
                    ],
                    [
                      '범주',
                      result.submitted.categories.map(formatCategory).join(', '),
                    ],
                    ['사진', result.submitted.photo ? result.submitted.photo.name : '없음'],
                    ['기부 가능 기간', availabilityLabel(result.submitted.availableUntil)],
                    ['상세 정보', result.submitted.detail || '없음'],
                    ['전달 방법', result.submitted.methods.map(methodLabel).join(', ')],
                    ['등록일', result.submitted.registeredAt],
                  ]}
                />

                <div className="rounded-2xl bg-ink px-5 py-4 text-white">
                  <p className="text-sm text-faint">이번 기부로 예상되는 적립 크레딧</p>
                  <p className="mt-1 text-4xl font-display tabular-nums">{result.estimatedCredit} 크레딧</p>
                </div>

                {result.matches.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted mb-2">
                      이 물품과 잘 맞는 기관 필요 물품 {result.matches.length}건 (점수 높은 순)
                    </p>
                    <MatchList
                      key={result.id}
                      matches={result.matches}
                      primary={(m) => `${m.org} · ${m.title}`}
                      secondary={(m) => `${m.categories.map(formatCategory).join(', ')} · 필요 수량 ${m.quantity}`}
                      detailLabel="기부 방법 보기"
                      renderDetail={(m) =>
                        m.institution ? (
                          <GuideBox
                            guide={donationGuide(result.submitted, m.institution)}
                            fallback={`선택한 전달 방법으로는 이 기관에 기부하기 어려워요. 기관이 받는 방법: ${m.institution.methods
                              .map(methodLabel)
                              .join(', ')} · 문의 ${m.institution.phone}`}
                          />
                        ) : (
                          <GuideBox guide={[]} fallback="기관 정보를 찾을 수 없어요." />
                        )
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    비슷한 물품을 필요로 하는 기관이 아직 없어요. 아래 버튼으로 데이터베이스에
                    등록해두면 나중에 필요한 기관과 자동으로 연결돼요.
                  </p>
                )}
              </div>
            )}
          </div>

          <RegisterButton
            status={registerStatus}
            onRegister={handleRegister}
            readyHint="등록하면 기관이 필요 물품을 찾을 때 이 물품이 검색 결과에 나와요."
            doneMessage="기부 물품을 데이터베이스에 등록했어요."
            errorMessage={registerError}
            blockedReason={blockedReason}
          />
        </div>
      </div>
    </div>
  )
}

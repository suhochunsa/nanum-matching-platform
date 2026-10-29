import { useState } from 'react'
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
import { availabilityLabel } from '../data/dates.js'
import { methodLabel, receiveGuide } from '../data/delivery.js'
import { matchInstitutionToDonors } from '../data/matching.js'
import { loadData, registerInstitutionNeed } from '../data/store.js'
import { validateInstitution } from '../data/validation.js'
import { useAuth } from '../lib/authContext.js'

const INITIAL_VALUES = {
  orgName: '',
  orgLocation: '',
  orgPhone: '',
  hours: '',
  methods: [],
  title: '',
  categories: [],
  quantity: '1',
}

export default function InstitutionPage() {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [registerStatus, setRegisterStatus] = useState('idle')
  const [registerError, setRegisterError] = useState('')
  const { profile } = useAuth()

  // 기관 계정으로 로그인했으면 기관명은 계정의 기관명을 쓴다. (DB도 등록할 때 계정의 기관명을 쓴다)
  const isInstitution = profile?.role === 'institution'
  const formValues = isInstitution ? { ...values, orgName: profile.org_name } : values
  const blockedReason = !profile
    ? '로그인한 기관만 필요 물품을 등록할 수 있어요.'
    : !isInstitution
      ? '기관 계정으로 로그인해야 필요 물품을 등록할 수 있어요.'
      : ''

  // 한 번 제출을 시도한 뒤부터는 입력할 때마다 다시 검사해서 오류 표시를 갱신한다.
  const errors = submitted ? validateInstitution(formValues) : {}

  function update(field) {
    return (e) => setValues((v) => ({ ...v, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)

    const found = validateInstitution(formValues)
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
        ...formValues,
        title: values.title.trim(),
        requestedAt: new Date().toLocaleDateString('ko-KR'),
      },
      institution: {
        name: formValues.orgName.trim(),
        location: values.orgLocation.trim(),
        phone: values.orgPhone.trim(),
        hours: values.hours.trim(),
        methods: values.methods,
      },
      ...matchInstitutionToDonors(values, data),
      source: data.source,
      sourceError: data.error,
    })
    setRegisterStatus('ready')
  }

  // 매칭 확인 때 제출한 값을 그대로 등록한다.
  async function handleRegister() {
    const s = result.submitted
    setRegisterStatus('saving')
    setRegisterError('')

    try {
      await registerInstitutionNeed(
        { categories: s.categories, title: s.title, quantity: Number(s.quantity) },
        result.institution,
      )
      setRegisterStatus('done')
    } catch (e) {
      setRegisterError(e.message)
      setRegisterStatus('error')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h1 className={pageTitleClass}>기관용 화면</h1>
      <p className="mt-3 max-w-2xl text-base font-light text-muted sm:text-lg">필요한 물품과 수량을 입력하면 지금 기부 가능한 물품을 점수 순으로 보여드려요. 기관 계정으로 로그인하면 바로 등록할 수 있어요.</p>

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
            <legend className="mb-4 text-xl font-display text-ink">필요 물품 정보</legend>

            <FormField id="title" label="필요 물품 이름 입력" required error={errors.title}>
              <input
                id="title"
                type="text"
                value={values.title}
                onChange={update('title')}
                placeholder="예: 겨울 패딩 점퍼"
                className={fieldClass(errors.title)}
              />
            </FormField>

            <FormField
              id="categories"
              label="필요 물품 범주 입력"
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

            <FormField id="quantity" label="필요 물품 수량 입력" required error={errors.quantity}>
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
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-4 text-xl font-display text-ink">기관 정보 입력</legend>

            <FormField
              id="orgName"
              label="기관명"
              required
              hint={isInstitution ? '로그인한 기관 계정의 기관명이에요.' : undefined}
              error={errors.orgName}
            >
              <input
                id="orgName"
                type="text"
                value={formValues.orgName}
                onChange={update('orgName')}
                readOnly={isInstitution}
                placeholder="예: 햇살보육원"
                className={`${fieldClass(errors.orgName)} read-only:text-muted`}
              />
            </FormField>

            <FormField
              id="orgLocation"
              label="위치"
              required
              hint="기부자가 물품을 전달할 주소예요."
              error={errors.orgLocation}
            >
              <input
                id="orgLocation"
                type="text"
                value={values.orgLocation}
                onChange={update('orgLocation')}
                placeholder="예: 서울시 마포구 월드컵로 123"
                className={fieldClass(errors.orgLocation)}
              />
            </FormField>

            <FormField id="orgPhone" label="연락처" required error={errors.orgPhone}>
              <input
                id="orgPhone"
                type="tel"
                inputMode="tel"
                value={values.orgPhone}
                onChange={update('orgPhone')}
                placeholder="02-123-4567"
                className={fieldClass(errors.orgPhone)}
              />
            </FormField>

            <FormField
              id="hours"
              label="방문 가능 시간"
              hint="선택 · 기부자가 직접 가져올 때 안내돼요."
              error={errors.hours}
            >
              <input
                id="hours"
                type="text"
                value={values.hours}
                onChange={update('hours')}
                placeholder="예: 평일 10:00~17:00"
                className={fieldClass(errors.hours)}
              />
            </FormField>
          </fieldset>

          <fieldset>
            <legend className="mb-4 text-xl font-display text-ink">수령 방법</legend>
            <FormField
              id="methods"
              label="받을 수 있는 방법"
              required
              hint="여러 개 선택할 수 있어요. 기부자가 가능한 방법과 맞춰 수령 방법을 안내해요."
              error={errors.methods}
            >
              <MethodPicker
                id="methods"
                audience="org"
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
            {checking ? '불러오는 중…' : '일치 결과 확인하기'}
          </button>
        </form>

        {/* 오른쪽: 데이터베이스 내 일치 결과 */}
        <div className="flex flex-col gap-4">
          <div className="min-h-[320px] rounded-3xl bg-canvas-soft p-6 sm:p-8">
            <h2 className="mb-5 text-2xl font-display text-ink">지금 받을 수 있는 기부 물품</h2>

            {!result && (
              <p className="text-muted text-sm">
                왼쪽 입력을 채우고 "일치 결과 확인하기"를 누르면 결과가 여기에 표시돼요.
              </p>
            )}

            {result && (
              <div className="space-y-4">
                <DataNotice source={result.source} error={result.sourceError} />
                <InputSummary
                  rows={[
                    [
                      '필요 물품',
                      `${result.submitted.title} (${result.submitted.quantity}개)`,
                    ],
                    [
                      '범주',
                      result.submitted.categories.map(formatCategory).join(', '),
                    ],
                    ['기관', `${result.submitted.orgName} · ${result.submitted.orgPhone}`],
                    ['위치', result.submitted.orgLocation],
                    ['방문 가능 시간', result.institution.hours || '입력 안 함'],
                    ['받을 수 있는 방법', result.institution.methods.map(methodLabel).join(', ')],
                    ['요청일', result.submitted.requestedAt],
                  ]}
                />

                {result.matches.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted mb-2">
                      조건과 잘 맞는 기부 물품 {result.matches.length}건 (점수 높은 순)
                    </p>
                    <MatchList
                      key={result.id}
                      matches={result.matches}
                      primary={(m) => m.title}
                      secondary={(m) =>
                        `${m.categories.map(formatCategory).join(', ')} · 기부자 ${m.donor} · 수량 ${m.quantity} · ${m.condition} · 기부 가능 ${availabilityLabel(m.availableUntil)}`
                      }
                      photo={(m) => m.photo}
                      detailLabel="수령 방법 보기"
                      renderDetail={(m) => (
                        <GuideBox
                          guide={receiveGuide(m, result.institution)}
                          fallback={`기부자가 가능한 방법(${m.methods
                            .map(methodLabel)
                            .join(', ')})과 받을 수 있는 방법이 겹치지 않아요.`}
                          note="기부자 연락처는 매칭이 확정되면 공개돼요."
                        />
                      )}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    비슷한 물품을 등록한 기부자가 아직 없어요. 조건을 데이터베이스에
                    등록해두면 나중에 등록되는 기부 물품과 자동으로 연결돼요.
                  </p>
                )}
              </div>
            )}
          </div>

          <RegisterButton
            status={registerStatus}
            onRegister={handleRegister}
            readyHint="등록하면 기부자가 물품을 등록할 때 이 필요 물품이 매칭 결과에 나와요."
            doneMessage="필요 물품을 데이터베이스에 등록했어요."
            blockedReason={blockedReason}
            errorMessage={registerError}
          />
        </div>
      </div>
    </div>
  )
}

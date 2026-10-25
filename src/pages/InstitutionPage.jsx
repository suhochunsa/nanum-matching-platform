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
import { fieldClass } from '../components/formStyles.js'
import { formatCategory } from '../data/categories.js'
import { availabilityLabel } from '../data/dates.js'
import { methodLabel, receiveGuide } from '../data/delivery.js'
import { matchInstitutionToDonors } from '../data/matching.js'
import { addInstitutionNeed, loadData } from '../data/store.js'
import { validateInstitution } from '../data/validation.js'

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

  // 한 번 제출을 시도한 뒤부터는 입력할 때마다 다시 검사해서 오류 표시를 갱신한다.
  const errors = submitted ? validateInstitution(values) : {}

  function update(field) {
    return (e) => setValues((v) => ({ ...v, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)

    const found = validateInstitution(values)
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
        requestedAt: new Date().toLocaleDateString('ko-KR'),
      },
      institution: {
        name: values.orgName.trim(),
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
  // TODO(6~7차시): Supabase에 기관·필요 물품 정보 저장
  function handleRegister() {
    const s = result.submitted
    const saved = addInstitutionNeed(
      {
        categories: s.categories,
        title: s.title,
        quantity: Number(s.quantity),
        requestedAt: s.requestedAt,
      },
      result.institution,
    )
    setRegisterStatus(saved ? 'done' : 'error')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-xl font-bold text-brand-800 mb-6">기관용 화면</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* 왼쪽: 입력 폼 */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <Link
            to="/"
            className="inline-block rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
          >
            홈 화면으로 가기
          </Link>

          <fieldset className="space-y-4">
            <legend className="mb-3 font-semibold text-brand-800">필요 물품 정보</legend>

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
            <legend className="mb-3 font-semibold text-brand-800">기관 정보 입력</legend>

            <FormField id="orgName" label="기관명" required error={errors.orgName}>
              <input
                id="orgName"
                type="text"
                value={values.orgName}
                onChange={update('orgName')}
                placeholder="예: 햇살보육원"
                className={fieldClass(errors.orgName)}
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
            <legend className="mb-3 font-semibold text-brand-800">수령 방법</legend>
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
            className="w-full rounded-lg bg-accent-500 py-2.5 text-white font-semibold hover:bg-accent-600 transition-colors disabled:cursor-wait disabled:opacity-70"
          >
            {checking ? '불러오는 중…' : '일치 결과 확인하기'}
          </button>
        </form>

        {/* 오른쪽: 데이터베이스 내 일치 결과 */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-[320px] rounded-2xl bg-brand-700 p-6 text-white">
            <h2 className="font-semibold mb-4">데이터베이스 내 일치 결과</h2>

            {!result && (
              <p className="text-brand-100 text-sm">
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
                    <p className="text-sm text-brand-100 mb-2">
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
                  <p className="text-sm text-brand-100">
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
            doneMessage="필요 물품을 등록했어요."
          />
        </div>
      </div>
    </div>
  )
}

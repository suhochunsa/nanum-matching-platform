import { useState } from 'react'
import { Link } from 'react-router-dom'
import CategoryTree from '../components/CategoryTree.jsx'
import FormField from '../components/FormField.jsx'
import InputSummary from '../components/InputSummary.jsx'
import MatchList from '../components/MatchList.jsx'
import { fieldClass } from '../components/formStyles.js'
import { formatCategory } from '../data/categories.js'
import { matchInstitutionToDonors } from '../data/matching.js'
import { validateInstitution } from '../data/validation.js'

const INITIAL_VALUES = {
  orgName: '',
  orgLocation: '',
  orgPhone: '',
  title: '',
  categories: [],
  quantity: '1',
}

export default function InstitutionPage() {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)

  // 한 번 제출을 시도한 뒤부터는 입력할 때마다 다시 검사해서 오류 표시를 갱신한다.
  const errors = submitted ? validateInstitution(values) : {}

  function update(field) {
    return (e) => setValues((v) => ({ ...v, [field]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)

    const found = validateInstitution(values)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    // TODO(6~7차시): Supabase에 기관·필요 물품 정보 저장
    setResult({
      id: Date.now(),
      submitted: {
        ...values,
        title: values.title.trim(),
        requestedAt: new Date().toLocaleDateString('ko-KR'),
      },
      ...matchInstitutionToDonors(values),
    })
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
          </fieldset>

          <button
            type="submit"
            className="w-full rounded-lg bg-accent-500 py-2.5 text-white font-semibold hover:bg-accent-600 transition-colors"
          >
            일치 결과 확인하기
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
                        `${m.categories.map(formatCategory).join(', ')} · 기부자 ${m.donor} · 수량 ${m.quantity} · ${m.condition}`
                      }
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

          <button
            type="button"
            className="rounded-xl bg-brand-100 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-200 transition-colors"
          >
            {result && result.matches.length === 0
              ? '데이터베이스 등록 안내'
              : '(매칭 결과가 없을 경우) 데이터베이스 등록 안내'}
          </button>
        </div>
      </div>
    </div>
  )
}

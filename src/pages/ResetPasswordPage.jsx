import { useState } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../components/FormField.jsx'
import { buttonClass, fieldClass } from '../components/ui.js'
import { useAuth } from '../lib/authContext.js'
import { authLinkError } from '../lib/supabase.js'

const MIN_PASSWORD = 8
const HOME_OF = { donor: '/donor', institution: '/institution' }

function validate(v) {
  const errors = {}
  if (v.password.length < MIN_PASSWORD) errors.password = `비밀번호는 ${MIN_PASSWORD}자 이상이에요.`
  if (v.passwordConfirm !== v.password) errors.passwordConfirm = '비밀번호가 서로 달라요.'
  return errors
}

/**
 * 새 비밀번호 정하기. 비밀번호 재설정 메일의 링크를 누르면 이 화면으로 온다.
 * 링크를 누르면 Supabase가 잠시 로그인시켜 주므로, 그 상태에서 새 비밀번호를 저장한다.
 */
export default function ResetPasswordPage() {
  const { session, profile, loading, updatePassword } = useAuth()
  const [values, setValues] = useState({ password: '', passwordConfirm: '' })
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const errors = submitted ? validate(values) : {}

  if (loading) return <p className="px-4 py-16 text-center text-sm text-muted">불러오는 중…</p>

  const wrap = (children) => (
    <div className="mx-auto max-w-md px-4 pt-14">
      <h1 className="text-center text-4xl font-display leading-tight text-ink">새 비밀번호 정하기.</h1>
      <div className="mt-8 space-y-5 rounded-3xl border border-hairline-soft p-6 sm:p-8">{children}</div>
    </div>
  )

  if (done) {
    return wrap(
      <>
        <p role="status" className="rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink">
          비밀번호를 바꿨어요. 다음부터 새 비밀번호로 로그인하세요.
        </p>
        <Link to={HOME_OF[profile?.role] ?? '/'} className={`${buttonClass('primary', 'lg')} w-full`}>
          계속하기
        </Link>
      </>,
    )
  }

  // 링크가 만료됐거나 이미 썼거나, 다른 브라우저에서 열어 로그인 상태가 없음
  if (!session) {
    return wrap(
      <>
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {authLinkError ? '링크가 만료됐거나 이미 사용한 링크예요.' : '비밀번호 재설정 링크로 들어와야 새 비밀번호를 정할 수 있어요.'}{' '}
          비밀번호 찾기를 다시 해 주세요. 메일의 링크는 한 번만 쓸 수 있어요.
        </p>
        <Link to="/login" state={{ mode: 'forgot' }} className={`${buttonClass('primary', 'lg')} w-full`}>
          비밀번호 찾기 다시 하기
        </Link>
      </>,
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    setError('')
    const found = validate(values)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(first)?.focus()
      return
    }
    setBusy(true)
    try {
      await updatePassword(values.password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const update = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  return wrap(
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <p className="text-sm text-muted">{session.user.email} 계정의 새 비밀번호를 입력해 주세요.</p>
      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <FormField id="password" label="새 비밀번호" required hint={`${MIN_PASSWORD}자 이상`} error={errors.password}>
        <input id="password" type="password" autoComplete="new-password" value={values.password} onChange={update('password')} className={fieldClass(errors.password)} />
      </FormField>
      <FormField id="passwordConfirm" label="새 비밀번호 확인" required error={errors.passwordConfirm}>
        <input
          id="passwordConfirm"
          type="password"
          autoComplete="new-password"
          value={values.passwordConfirm}
          onChange={update('passwordConfirm')}
          className={fieldClass(errors.passwordConfirm)}
        />
      </FormField>
      <button type="submit" disabled={busy} className={`${buttonClass('primary', 'lg')} w-full disabled:cursor-wait`}>
        {busy ? '저장하는 중…' : '새 비밀번호 저장'}
      </button>
    </form>,
  )
}

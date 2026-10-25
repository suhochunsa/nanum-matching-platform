import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar.jsx'
import FormField from '../components/FormField.jsx'
import { fieldClass } from '../components/formStyles.js'
import { ROLE_LABEL, ROLE_LABEL_RO, useAuth } from '../lib/authContext.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8
const MAX_AVATAR_MB = 5

// 로그인 후 역할에 맞는 화면으로 보낸다.
const HOME_OF = { donor: '/donor', institution: '/institution' }

// 오류를 화면 위에서부터의 순서대로 넣는다. (제출 시 첫 번째 오류 칸으로 포커스를 옮기기 때문)
function validate(mode, role, v) {
  const errors = {}
  if (mode === 'signup') {
    if (v.avatar && !v.avatar.type.startsWith('image/')) errors.avatar = '이미지 파일만 올릴 수 있어요.'
    else if (v.avatar && v.avatar.size > MAX_AVATAR_MB * 1024 * 1024)
      errors.avatar = `사진은 ${MAX_AVATAR_MB}MB 이하만 올릴 수 있어요.`
    const name = v.name.trim()
    const [label, max] = role === 'donor' ? ['닉네임', 20] : ['기관명', 30]
    if (name.length < 2 || name.length > max) errors.name = `${label}은 2~${max}자로 입력해 주세요.`
  }
  if (!EMAIL_RE.test(v.email.trim())) errors.email = '이메일 형식이 올바르지 않아요.'
  if (v.password.length < MIN_PASSWORD) errors.password = `비밀번호는 ${MIN_PASSWORD}자 이상이에요.`
  if (mode === 'signup' && v.passwordConfirm !== v.password) errors.passwordConfirm = '비밀번호가 서로 달라요.'
  return errors
}

export default function LoginPage() {
  const { profile, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState('donor')
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [values, setValues] = useState({ email: '', password: '', passwordConfirm: '', name: '', avatar: null })
  const [preview, setPreview] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { tone: 'error' | 'info', text }

  const errors = submitted ? validate(mode, role, values) : {}

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  // 이미 로그인했으면 프로필 화면으로
  if (!loading && profile) return <Navigate to="/profile" replace />

  function update(field) {
    return (e) => setValues((v) => ({ ...v, [field]: e.target.value }))
  }

  function handleAvatar(e) {
    const file = e.target.files?.[0] ?? null
    setValues((v) => ({ ...v, avatar: file }))
    setPreview(file?.type.startsWith('image/') ? URL.createObjectURL(file) : '')
  }

  function switchMode(next) {
    setMode(next)
    setSubmitted(false)
    setMessage(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    setMessage(null)
    const found = validate(mode, role, values)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setBusy(true)
    try {
      const email = values.email.trim()
      if (mode === 'login') {
        const p = await signIn(role, email, values.password)
        navigate(HOME_OF[p.role])
        return
      }

      const result = await signUp({ role, email, password: values.password, name: values.name.trim(), avatarFile: values.avatar })
      if (result.needsEmailConfirm) {
        switchMode('login')
        setMessage({
          tone: 'info',
          text: `${email}로 인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요. 프로필 사진은 로그인 후 프로필 화면에서 올릴 수 있어요.`,
        })
        return
      }
      if (result.avatarError) {
        // 가입은 됐지만 사진만 실패 → 프로필 화면에서 다시 올리게 안내
        navigate('/profile', { state: { notice: `가입했어요. 다만 ${result.avatarError}` } })
        return
      }
      navigate(HOME_OF[role])
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const nameLabel = role === 'donor' ? '닉네임' : '기관명'

  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-xl font-bold text-brand-800 text-center mb-8">
        {mode === 'login' ? '로그인' : '회원가입'}
      </h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* 기부자 / 기관 선택 */}
        <div role="radiogroup" aria-label="계정 종류" className="grid grid-cols-2 gap-2 rounded-lg bg-brand-50 p-1">
          {['donor', 'institution'].map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={`rounded-md py-2 text-sm font-medium transition-colors ${
                role === r ? 'bg-brand-600 text-white shadow-sm' : 'text-brand-700 hover:bg-brand-100'
              }`}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>

        {message && (
          <p
            role={message.tone === 'error' ? 'alert' : 'status'}
            className={`rounded-lg px-3 py-2.5 text-sm ${
              message.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-800'
            }`}
          >
            {message.text}
          </p>
        )}

        {mode === 'signup' && (
          <>
            <FormField
              id="avatar"
              label="프로필 사진"
              hint="선택 · 홈 화면에서 내가 올린 물품 옆에 작게 보여요."
              error={errors.avatar}
            >
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-3 py-2.5 text-sm text-brand-700 hover:bg-brand-100 transition-colors">
                <Avatar src={preview} name={values.name || ROLE_LABEL[role]} size="sm" />
                {values.avatar?.name || '사진 고르기'}
                <input id="avatar" type="file" accept="image/*" className="sr-only" onChange={handleAvatar} />
              </label>
            </FormField>

            <FormField
              id="name"
              label={nameLabel}
              required
              hint={role === 'donor' ? '다른 사람에게 보이는 이름이에요.' : '가입 후에는 바꿀 수 없어요.'}
              error={errors.name}
            >
              <input
                id="name"
                type="text"
                value={values.name}
                onChange={update('name')}
                placeholder={role === 'donor' ? '예: 나눔왕수호' : '예: 햇살보육원'}
                className={fieldClass(errors.name)}
              />
            </FormField>
          </>
        )}

        <FormField id="email" label="이메일" required error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={update('email')}
            placeholder="name@example.com"
            className={fieldClass(errors.email)}
          />
        </FormField>

        <FormField
          id="password"
          label="비밀번호"
          required
          hint={mode === 'signup' ? `${MIN_PASSWORD}자 이상` : undefined}
          error={errors.password}
        >
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={values.password}
            onChange={update('password')}
            className={fieldClass(errors.password)}
          />
        </FormField>

        {mode === 'signup' && (
          <FormField id="passwordConfirm" label="비밀번호 확인" required error={errors.passwordConfirm}>
            <input
              id="passwordConfirm"
              type="password"
              autoComplete="new-password"
              value={values.passwordConfirm}
              onChange={update('passwordConfirm')}
              className={fieldClass(errors.passwordConfirm)}
            />
          </FormField>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-white font-semibold hover:bg-brand-700 transition-colors disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? '처리하는 중…' : mode === 'login' ? `${ROLE_LABEL_RO[role]} 로그인` : `${ROLE_LABEL_RO[role]} 가입하기`}
        </button>

        <p className="text-center text-sm text-black/55">
          {mode === 'login' ? '아직 계정이 없나요?' : '이미 계정이 있나요?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="font-medium text-brand-600 hover:underline"
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>
      </form>
    </div>
  )
}

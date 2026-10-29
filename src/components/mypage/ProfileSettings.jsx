import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { compressImage } from '../../data/image.js'
import { fetchMyInstitution, updateMyInstitution, updateMyProfile, uploadAvatar } from '../../data/store.js'
import { validateInstitutionInfo } from '../../data/validation.js'
import { useAuth } from '../../lib/authContext.js'
import FormField from '../FormField.jsx'
import { buttonClass, fieldClass } from '../ui.js'
import MethodPicker from '../MethodPicker.jsx'

const primaryButton = buttonClass('primary', 'md')

function Message({ message }) {
  if (!message) return null
  return (
    <p
      role={message.tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl px-4 py-3 text-sm ${
        message.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-canvas-soft text-ink'
      }`}
    >
      {message.text}
    </p>
  )
}

/** 마이페이지 "프로필 수정" 탭: 프로필 사진, 닉네임(기부자), 기관 정보(기관) */
export default function ProfileSettings({ initialNotice }) {
  const { profile, refreshProfile } = useAuth()
  const [nickname, setNickname] = useState(profile.nickname ?? '')
  const [busy, setBusy] = useState('') // '' | 'photo' | 'nickname'
  const [message, setMessage] = useState(initialNotice ? { tone: 'error', text: initialNotice } : null)

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 동작하도록
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ tone: 'error', text: '이미지 파일만 올릴 수 있어요.' })
      return
    }
    setBusy('photo')
    setMessage(null)
    try {
      const url = await uploadAvatar(profile.id, await compressImage(file, { maxSize: 256, quality: 0.8 }))
      await updateMyProfile(profile.id, { avatar_url: url })
      await refreshProfile()
      setMessage({ tone: 'info', text: '프로필 사진을 바꿨어요.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy('')
    }
  }

  async function handleNickname(e) {
    e.preventDefault()
    const name = nickname.trim()
    if (name.length < 2 || name.length > 20) {
      setMessage({ tone: 'error', text: '닉네임은 2~20자로 입력해 주세요.' })
      return
    }
    setBusy('nickname')
    setMessage(null)
    try {
      await updateMyProfile(profile.id, { nickname: name })
      await refreshProfile()
      setMessage({ tone: 'info', text: '닉네임을 바꿨어요.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-8">
      <Message message={message} />

      <section className="space-y-3">
        <h2 className="text-xl font-display text-ink">프로필 사진</h2>
        <p className="text-sm text-muted">홈 화면에서 내가 올린 물품 오른쪽 아래에 작게 보여요.</p>
        <label
          className={`${buttonClass('outline', 'md')} cursor-pointer ${busy === 'photo' ? 'pointer-events-none opacity-40' : ''}`}
        >
          {busy === 'photo' ? '올리는 중…' : '사진 바꾸기'}
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
        </label>
      </section>

      {profile.role === 'donor' ? (
        <form onSubmit={handleNickname} noValidate className="space-y-3">
          <h2 className="text-xl font-display text-ink">닉네임</h2>
          <FormField id="nickname" label="닉네임" hint="다른 사람에게 보이는 이름이에요. (2~20자)">
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={fieldClass()}
            />
          </FormField>
          <button
            type="submit"
            disabled={busy === 'nickname' || nickname.trim() === profile.nickname}
            className={primaryButton}
          >
            {busy === 'nickname' ? '저장하는 중…' : '닉네임 저장'}
          </button>
        </form>
      ) : (
        <InstitutionInfoForm userId={profile.id} orgName={profile.org_name} />
      )}
    </div>
  )
}

/** 기관 정보(위치·연락처·방문 시간·받는 방법) 수정. 기관명은 바꿀 수 없다. */
function InstitutionInfoForm({ userId, orgName }) {
  const [inst, setInst] = useState(undefined) // undefined = 불러오는 중, null = 아직 기관 없음
  const [form, setForm] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchMyInstitution(userId)
      .then((data) => {
        if (cancelled) return
        setInst(data)
        if (data) setForm({ location: data.location, phone: data.phone, hours: data.hours, methods: data.methods })
      })
      .catch((e) => !cancelled && setMessage({ tone: 'error', text: e.message }))
    return () => {
      cancelled = true
    }
  }, [userId])

  const errors = submitted && form ? validateInstitutionInfo(form) : {}

  async function handleSave(e) {
    e.preventDefault()
    setSubmitted(true)
    const found = validateInstitutionInfo(form)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(`inst-${firstInvalid}`)?.focus()
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const fields = {
        location: form.location.trim(),
        phone: form.phone.trim(),
        hours: form.hours.trim(),
        methods: form.methods,
      }
      await updateMyInstitution(inst.id, fields)
      setInst((i) => ({ ...i, ...fields }))
      setMessage({ tone: 'info', text: '기관 정보를 저장했어요. 기부자에게 안내되는 기부 방법에도 바로 반영돼요.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-display text-ink">기관 정보</h2>
      <p className="text-sm text-muted">기관명: {orgName} (가입 후에는 바꿀 수 없어요)</p>
      <Message message={message} />

      {inst === undefined && !message && <p className="text-sm text-muted">불러오는 중…</p>}

      {inst === null && (
        <p className="rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-muted">
          아직 기관 정보가 없어요.{' '}
          <Link to="/institution" className="font-semibold text-ink underline underline-offset-2">
            첫 필요 물품을 등록
          </Link>
          하면 그때 입력한 위치·연락처로 만들어져요.
        </p>
      )}

      {inst && form && (
        <form onSubmit={handleSave} noValidate className="space-y-4">
          <FormField id="inst-location" label="위치" required hint="기부자가 물품을 전달할 주소예요." error={errors.location}>
            <input
              id="inst-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className={fieldClass(errors.location)}
            />
          </FormField>
          <FormField id="inst-phone" label="연락처" required error={errors.phone}>
            <input
              id="inst-phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={fieldClass(errors.phone)}
            />
          </FormField>
          <FormField id="inst-hours" label="방문 가능 시간" hint="선택" error={errors.hours}>
            <input
              id="inst-hours"
              type="text"
              value={form.hours}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
              placeholder="예: 평일 10:00~17:00"
              className={fieldClass(errors.hours)}
            />
          </FormField>
          <FormField id="inst-methods" label="받을 수 있는 방법" required error={errors.methods}>
            <MethodPicker
              id="inst-methods"
              audience="org"
              value={form.methods}
              onChange={(methods) => setForm((f) => ({ ...f, methods }))}
              error={errors.methods}
            />
          </FormField>
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? '저장하는 중…' : '기관 정보 저장'}
          </button>
        </form>
      )}
    </section>
  )
}

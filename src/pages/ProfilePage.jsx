import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Avatar from '../components/Avatar.jsx'
import FormField from '../components/FormField.jsx'
import { fieldClass } from '../components/formStyles.js'
import { compressImage } from '../data/image.js'
import { updateMyProfile, uploadAvatar } from '../data/store.js'
import { ROLE_LABEL, displayName, useAuth } from '../lib/authContext.js'

/** 내 프로필: 프로필 사진 바꾸기, 닉네임 바꾸기(기부자). 기관명은 가입 후 바꿀 수 없다. */
export default function ProfilePage() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const location = useLocation()
  const [nickname, setNickname] = useState(null) // null이면 아직 고치지 않음 → 지금 닉네임을 보여준다
  const [busy, setBusy] = useState('') // '' | 'photo' | 'nickname'
  const [message, setMessage] = useState(
    location.state?.notice ? { tone: 'error', text: location.state.notice } : null,
  )

  if (loading) return <p className="px-4 py-16 text-center text-sm text-black/45">불러오는 중…</p>

  if (!profile) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-black/60">로그인하면 프로필을 볼 수 있어요.</p>
        <Link to="/login" className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          로그인하기
        </Link>
      </div>
    )
  }

  const currentNickname = nickname ?? profile.nickname ?? ''

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
    const name = currentNickname.trim()
    if (name.length < 2 || name.length > 20) {
      setMessage({ tone: 'error', text: '닉네임은 2~20자로 입력해 주세요.' })
      return
    }
    setBusy('nickname')
    setMessage(null)
    try {
      await updateMyProfile(profile.id, { nickname: name })
      await refreshProfile()
      setNickname(null)
      setMessage({ tone: 'info', text: '닉네임을 바꿨어요.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-xl font-bold text-brand-800 mb-8">내 프로필</h1>

      <div className="flex items-center gap-5">
        <Avatar src={profile.avatar_url} name={displayName(profile)} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{displayName(profile)}</p>
          <p className="text-sm text-black/50">
            {ROLE_LABEL[profile.role]} 계정 · {session?.user.email}
          </p>
          <label
            className={`mt-2 inline-block cursor-pointer rounded-md border border-brand-300 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50 transition-colors ${
              busy === 'photo' ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            {busy === 'photo' ? '올리는 중…' : '프로필 사진 바꾸기'}
            <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
          </label>
        </div>
      </div>

      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`mt-6 rounded-lg px-3 py-2.5 text-sm ${
            message.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-800'
          }`}
        >
          {message.text}
        </p>
      )}

      {profile.role === 'donor' ? (
        <form onSubmit={handleNickname} noValidate className="mt-8 space-y-3">
          <FormField id="nickname" label="닉네임" hint="홈 화면에서 내가 올린 물품 옆에 보여요.">
            <input
              id="nickname"
              type="text"
              value={currentNickname}
              onChange={(e) => setNickname(e.target.value)}
              className={fieldClass()}
            />
          </FormField>
          <button
            type="submit"
            disabled={busy === 'nickname' || currentNickname.trim() === profile.nickname}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {busy === 'nickname' ? '저장하는 중…' : '닉네임 저장'}
          </button>
        </form>
      ) : (
        <div className="mt-8 rounded-lg bg-white px-4 py-3 text-sm text-black/60 shadow-sm">
          <p className="font-medium text-black/80">기관명: {profile.org_name}</p>
          <p className="mt-1">
            기관명은 가입 후 바꿀 수 없어요. 위치·연락처·받는 방법은{' '}
            <Link to="/institution" className="text-brand-600 underline">
              필요 물품을 등록할 때
            </Link>{' '}
            새로 입력한 값으로 바뀌어요.
          </p>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { compressImage } from '../data/image.js'
import { fetchProfile, updateMyProfile, uploadAvatar } from '../data/store.js'
import { AuthContext, ROLE_LABEL } from './authContext.js'
import { supabase } from './supabase.js'

// Supabase Auth 오류 메시지를 한국어로 바꾼다.
function authErrorMessage(error) {
  const msg = error?.message ?? ''
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.'
  if (msg.includes('Email not confirmed')) return '이메일 인증이 아직 안 됐어요. 메일함의 인증 링크를 먼저 눌러 주세요.'
  if (msg.includes('User already registered')) return '이미 가입된 이메일이에요. 로그인해 주세요.'
  if (msg.includes('Password should be')) return '비밀번호가 너무 짧거나 쉬워요. 8자 이상으로 정해 주세요.'
  if (msg.includes('rate limit')) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
  // 프로필을 만드는 DB 트리거가 실패한 경우 (대부분 이미 쓰는 기관명)
  if (msg.includes('Database error saving new user')) return '가입하지 못했어요. 이미 다른 계정이 쓰는 기관명일 수 있어요.'
  return msg || '알 수 없는 오류가 났어요.'
}

/** 앱 전체에 로그인 상태를 제공한다. (main.jsx에서 App을 감싼다) */
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  const loadProfile = useCallback(async (user) => {
    const p = user ? await fetchProfile(user.id) : null
    setProfile(p)
    return p
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user)
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      // 이 콜백 안에서 바로 Supabase를 다시 부르면 멈출 수 있어서 다음 차례로 미룬다. (supabase-js 권장 방식)
      setTimeout(() => loadProfile(nextSession?.user), 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  /** 로그인. 고른 역할과 계정 역할이 다르면 로그아웃시키고 오류를 낸다. */
  const signIn = useCallback(
    async (role, email, password) => {
      if (!supabase) throw new Error('데이터베이스 접속 정보가 없어 로그인할 수 없어요.')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(authErrorMessage(error))

      const p = await loadProfile(data.user)
      if (!p) {
        await supabase.auth.signOut()
        throw new Error('프로필을 찾지 못했어요. 다시 가입해 주세요.')
      }
      if (p.role !== role) {
        await supabase.auth.signOut()
        throw new Error(`${ROLE_LABEL[p.role]} 계정이에요. 위의 "${ROLE_LABEL[p.role]}" 탭을 고른 뒤 다시 로그인해 주세요.`)
      }
      return p
    },
    [loadProfile],
  )

  /**
   * 회원가입. 프로필은 DB 트리거가 만든다.
   * 이메일 인증이 켜져 있으면 세션이 바로 생기지 않으므로 needsEmailConfirm: true를 돌려준다.
   * (그 경우 프로필 사진은 로그인한 뒤 마이페이지에서 올린다)
   */
  const signUp = useCallback(
    async ({ role, email, password, name, avatarFile }) => {
      if (!supabase) throw new Error('데이터베이스 접속 정보가 없어 가입할 수 없어요.')
      const meta = role === 'donor' ? { role, nickname: name } : { role, org_name: name }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: meta, emailRedirectTo: `${window.location.origin}/login` },
      })
      if (error) throw new Error(authErrorMessage(error))
      if (!data.session) return { needsEmailConfirm: true }

      let avatarError = ''
      if (avatarFile) {
        try {
          const url = await uploadAvatar(data.user.id, await compressImage(avatarFile, { maxSize: 256, quality: 0.8 }))
          await updateMyProfile(data.user.id, { avatar_url: url })
        } catch (e) {
          avatarError = e.message
        }
      }
      await loadProfile(data.user)
      return { needsEmailConfirm: false, avatarError }
    },
    [loadProfile],
  )

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(() => loadProfile(session?.user), [loadProfile, session])

  const value = useMemo(
    () => ({ session, profile, loading, signIn, signUp, signOut, refreshProfile }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

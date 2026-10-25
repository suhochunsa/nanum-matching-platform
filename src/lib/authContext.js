import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

/**
 * 로그인 상태.
 * { session, profile, loading, signIn, signUp, signOut, refreshProfile }
 * - profile: { id, role: 'donor' | 'institution', nickname, org_name, avatar_url } 또는 로그아웃 상태면 null
 * - loading: 처음 로그인 상태를 확인하는 동안 true
 */
export function useAuth() {
  return useContext(AuthContext)
}

/** 화면에 보여줄 이름: 기부자는 닉네임, 기관은 기관명 */
export function displayName(profile) {
  return profile?.role === 'institution' ? profile.org_name : profile?.nickname
}

export const ROLE_LABEL = { donor: '기부자', institution: '기관' }
/** '기부자로', '기관으로' (받침에 따라 조사가 다름) */
export const ROLE_LABEL_RO = { donor: '기부자로', institution: '기관으로' }

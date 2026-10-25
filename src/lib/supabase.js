import { createClient } from '@supabase/supabase-js'

// 접속 정보는 .env.local(내 컴퓨터)과 Vercel 환경변수(배포 사이트)에 있다.
// publishable 키는 공개용이라 브라우저 코드에 들어가도 된다. (어떤 표를 읽고 쓸 수 있는지는 DB의 RLS 정책이 정한다)
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** 접속 정보가 없으면 null → store.js가 예시(mock) 데이터를 대신 쓴다. */
export const supabase = url && key ? createClient(url, key) : null

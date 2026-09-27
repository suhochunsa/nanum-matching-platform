// 입력칸 공통 스타일. 오류가 있으면 빨간 테두리로 바뀐다.
export function fieldClass(error) {
  return `w-full rounded-lg border px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 ${
    error ? 'border-red-400 focus:ring-red-300' : 'border-black/10 focus:ring-brand-400'
  }`
}

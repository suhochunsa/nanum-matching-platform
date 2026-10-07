import { useEffect, useState } from 'react'

/**
 * 물품 사진 썸네일. 누르면 화면 가운데에 크게 보여주고, 바깥을 누르거나 Esc로 닫는다.
 * 사진이 없으면 같은 크기의 "사진 없음" 칸을 보여줘서 카드 모양이 흐트러지지 않게 한다.
 * tone: 밝은 배경(light) / 어두운 결과 패널(dark)
 */
export default function PhotoThumb({ src, alt, tone = 'light' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const box = 'h-16 w-16 shrink-0 rounded-lg'

  if (!src) {
    return (
      <div
        className={`${box} flex items-center justify-center text-center text-[11px] leading-tight ${
          tone === 'dark' ? 'bg-white/10 text-brand-200' : 'bg-brand-50 text-brand-400'
        }`}
      >
        사진
        <br />
        없음
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} 사진 크게 보기`}
        className={`${box} overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent-500`}
      >
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} 사진`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <img src={src} alt={alt} className="max-h-[85vh] max-w-full rounded-xl shadow-2xl" />
        </div>
      )}
    </>
  )
}

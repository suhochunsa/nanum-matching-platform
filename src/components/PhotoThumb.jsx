import { useEffect, useState } from 'react'

const BOX = {
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
}

/**
 * 물품 사진 썸네일(모서리 16px). 누르면 화면 가운데에 크게 보여주고, 바깥을 누르거나 Esc로 닫는다.
 * 사진이 없으면 같은 크기의 "사진 없음" 칸을 보여줘서 카드 모양이 흐트러지지 않게 한다.
 */
export default function PhotoThumb({ src, alt, size = 'md' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const box = `${BOX[size]} shrink-0 rounded-2xl`

  if (!src) {
    return (
      <div className={`${box} flex items-center justify-center bg-canvas-soft text-center text-[11px] leading-tight text-faint`}>
        사진
        <br />
        없음
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${alt} 사진 크게 보기`} className={`${box} overflow-hidden`}>
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} 사진`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
        >
          <img src={src} alt={alt} className="max-h-[85vh] max-w-full rounded-3xl" />
        </div>
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const BOX = {
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
  // 식품 소비기한·라벨 사진: 글자가 가로로 길게 찍히는 경우가 많아 가로로 넓게
  wide: 'h-24 w-40',
}

/**
 * 물품 사진 썸네일(모서리 16px). 누르면 화면 가운데에 크게 보여주고, 바깥을 누르거나 Esc로 닫는다.
 * 사진이 없으면 같은 크기의 "사진 없음" 칸을 보여줘서 카드 모양이 흐트러지지 않게 한다.
 * fit: 'cover'(기본, 칸을 꽉 채우고 넘치는 부분은 잘림) | 'contain'(사진 전체가 보이게, 남는 곳은 흰 배경)
 *   소비기한 사진처럼 가장자리의 글자가 잘리면 안 되는 사진은 'contain'을 쓴다.
 * 확대 화면은 document.body에 바로 그린다(portal). 카드 안에 그리면 카드의 층(z-index)에 갇혀서
 * 다른 카드의 사진이 확대 화면 위로 비쳐 보인다.
 */
export default function PhotoThumb({ src, alt, size = 'md', fit = 'cover' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    // 상세창 안에서 연 경우 Esc가 상세창까지 닫지 않도록 먼저 받아서 멈춘다
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
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
      <button type="button" onClick={() => setOpen(true)} aria-label={`${alt} 사진 크게 보기`} className={`${box} overflow-hidden ${fit === 'contain' ? 'bg-canvas' : ''}`}>
        <img src={src} alt={alt} className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`} />
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${alt} 사진`}
            onClick={(e) => {
              e.stopPropagation() // portal이어도 React 이벤트는 부모로 올라가므로 상세창 등에 전달되지 않게
              setOpen(false)
            }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-4"
          >
            <img src={src} alt={alt} className="max-h-[85vh] max-w-full rounded-3xl" />
          </div>,
          document.body,
        )}
    </>
  )
}

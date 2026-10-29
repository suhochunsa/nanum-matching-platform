import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// 배경 이미지. 다른 사진으로 바꾸려면 public/hero/ 에 파일을 넣고 이 경로만 바꾸면 된다.
export const HERO_IMAGE = '/hero/hero.webp'

// 스크롤 1px당 움직이는 양: 배경은 느리게(깊이감), 글자는 조금 더 빠르게 위로
const BG_SPEED = 0.35
const TEXT_SPEED = -0.15

/**
 * 홈 첫 화면: 사진 위에 소개 문장을 올리고, 스크롤하면 배경과 글자가 서로 다른 속도로 움직인다(패럴랙스).
 * 운영체제에서 '동작 줄이기'를 켠 사용자에게는 움직이지 않는다.
 */
export default function HeroParallax({ primaryAction }) {
  const bgRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0

    function update() {
      frame = 0
      const y = window.scrollY
      if (bgRef.current) bgRef.current.style.transform = `translate3d(0, ${y * BG_SPEED}px, 0)`
      if (textRef.current) {
        textRef.current.style.transform = `translate3d(0, ${y * TEXT_SPEED}px, 0)`
        textRef.current.style.opacity = String(Math.max(0, 1 - y / 520))
      }
    }
    // 스크롤 이벤트마다 바로 그리지 않고 다음 화면 갱신 때 한 번만 그린다.
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section className="relative mt-4 overflow-hidden rounded-3xl bg-ink">
      {/* 배경: 스크롤하면 아래로 내려간다. 위쪽 여분(4rem)은 카드 윗부분이 화면 밖으로 나가기 전까지만
          필요하므로 조금만 키운다 (많이 키우면 사진이 확대되어 인물이 잘린다) */}
      <div
        ref={bgRef}
        aria-hidden="true"
        className="absolute inset-x-0 -top-16 h-[calc(100%+4rem)] bg-cover bg-[position:70%_center] will-change-transform"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      />
      {/* 글자가 잘 읽히도록 어둡게: 휴대폰은 아래쪽, 넓은 화면은 왼쪽(사진의 빈 배경 쪽). 인물 얼굴은 가리지 않는다 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/5 sm:bg-gradient-to-r sm:from-ink/85 sm:via-ink/40 sm:to-transparent"
      />
      <p className="absolute right-4 bottom-3 z-10 text-[11px] text-white/55">AI 생성 이미지</p>

      <div
        ref={textRef}
        className="relative flex min-h-[560px] flex-col items-start justify-end px-7 py-12 text-left will-change-transform sm:min-h-[640px] sm:px-14 sm:py-16"
      >
        <p className="inline-flex rounded-full bg-[rgba(115,115,115,0.56)] px-3 py-1 text-xs font-semibold text-white">
          기부자 · 기관 자동 매칭
        </p>
        <h1 className="mt-5 text-5xl font-display leading-[1.05] text-white sm:text-6xl">
          남는 물건을
          <br />
          필요한 곳으로.
        </h1>
        <p className="mt-5 max-w-md text-lg font-light leading-relaxed text-white/85 sm:text-xl">
          물건 정보를 입력하면 그 물건을 찾는 기관을, 필요한 물품을 입력하면 지금 기부 가능한 물품을 바로 찾아드려요.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Link
            to={primaryAction[0]}
            className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-canvas-soft"
          >
            {primaryAction[1]}
          </Link>
          <a
            href="#list"
            className="inline-flex h-12 items-center justify-center rounded-full bg-white/15 px-6 text-[15px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            물품 둘러보기
          </a>
        </div>
      </div>
    </section>
  )
}

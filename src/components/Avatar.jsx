const SIZES = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  lg: 'h-20 w-20 text-2xl',
}

/** 프로필 사진(동그라미). 사진이 없으면 이름 첫 글자를 보여준다. */
export default function Avatar({ src, name, size = 'sm' }) {
  const box = `${SIZES[size]} shrink-0 rounded-full`
  if (src) return <img src={src} alt="" className={`${box} object-cover`} />
  return (
    <span aria-hidden="true" className={`${box} inline-flex items-center justify-center bg-field font-display text-ink`}>
      {name?.trim()[0] ?? '?'}
    </span>
  )
}

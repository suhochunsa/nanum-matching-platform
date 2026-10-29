// 공통 스타일 (DESIGN-mobbin.md): 모든 버튼은 알약 모양, 입력칸은 테두리 없는 회색 칸.

/** 입력칸. 평소엔 회색 칸, 클릭하면 2px 잉크 테두리, 오류면 빨간 테두리 */
export function fieldClass(error) {
  return `w-full rounded-2xl bg-field px-4 py-3 text-sm text-ink placeholder:text-faint outline-none transition-shadow ${
    error ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-ink'
  }`
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40'

const BUTTON_SIZE = {
  lg: 'h-12 px-6 text-[15px]',
  md: 'h-11 px-5 text-sm',
  sm: 'h-9 px-4 text-sm',
}

const BUTTON_VARIANT = {
  primary: 'bg-ink text-white hover:bg-ink-soft', // 가장 중요한 행동 (한 화면에 하나)
  outline: 'border border-hairline bg-canvas text-ink hover:bg-canvas-soft',
  soft: 'bg-canvas-soft text-ink hover:bg-field',
  ghost: 'text-muted hover:bg-canvas-soft hover:text-ink',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  'danger-ghost': 'text-red-600 hover:bg-red-50',
}

/** 버튼 모양. variant: primary | outline | soft | ghost | danger | danger-ghost, size: lg | md | sm */
export function buttonClass(variant = 'primary', size = 'md') {
  return `${BUTTON_BASE} ${BUTTON_SIZE[size]} ${BUTTON_VARIANT[variant]}`
}

/** 작은 알약 뱃지 (범주 등) */
export const chipClass =
  'inline-flex items-center whitespace-nowrap rounded-full bg-canvas-soft px-2.5 py-1 text-xs font-semibold text-ink'

/** 화면 제목 */
export const pageTitleClass = 'text-3xl font-display leading-tight text-ink sm:text-4xl'

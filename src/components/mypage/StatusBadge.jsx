const TONES = {
  active: 'bg-ink text-white',
  done: 'bg-canvas-soft text-muted',
  warn: 'bg-red-50 text-red-600',
}

/** 상태 뱃지(알약). tone: 진행 중(active) / 끝남(done) / 주의(warn) */
export default function StatusBadge({ label, tone }) {
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {label}
    </span>
  )
}

const TONES = {
  active: 'bg-brand-500/10 text-brand-700',
  done: 'bg-black/5 text-black/55',
  warn: 'bg-red-50 text-red-600',
}

/** 상태 뱃지. tone: 진행 중(active) / 끝남(done) / 주의(warn) */
export default function StatusBadge({ label, tone }) {
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {label}
    </span>
  )
}

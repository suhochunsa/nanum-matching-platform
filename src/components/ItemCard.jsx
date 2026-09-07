export default function ItemCard({ category, title, quantity, sub, subLabel, tone = 'brand' }) {
  const badgeClasses =
    tone === 'accent'
      ? 'bg-accent-500/15 text-accent-600'
      : 'bg-brand-500/10 text-brand-600'

  return (
    <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses}`}>
        {category}
      </span>
      <h3 className="mt-2 font-semibold text-[15px] leading-snug">{title}</h3>
      <div className="mt-2 flex items-center justify-between text-sm text-black/60">
        <span>수량 {quantity}</span>
        {sub && (
          <span className="text-black/50">
            {subLabel ? `${subLabel} ` : ''}
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

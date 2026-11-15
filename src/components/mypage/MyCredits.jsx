export default function MyCredits({ total, entries }) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-ink p-6 text-white">
        <p className="text-sm">누적 기부 크레딧</p>
        <p className="mt-2 text-4xl font-display tabular-nums">{total.toLocaleString()} <span className="text-lg">크레딧</span></p>
        <p className="mt-3 text-xs opacity-70">매칭이 확정된 뒤 기부자와 기관이 모두 '전달 완료'를 누르면 한 번 적립돼요. 범주별 기본 크레딧에 물품 1개당 10크레딧을 더해요.</p>
      </div>
      <h3 className="text-xl font-display">적립 내역</h3>
      {entries.length === 0 ? <p className="text-sm text-muted">아직 적립된 크레딧이 없어요. 전달이 최종 완료되면 여기에 표시돼요.</p> :
        <ul className="space-y-2">{entries.map((entry) => <li key={entry.id} className="flex items-center gap-3 rounded-2xl bg-canvas-soft p-4">
          <div className="min-w-0 flex-1"><p className="font-semibold">{entry.item_title}</p><p className="mt-1 text-xs text-muted">전달 완료 · {new Date(entry.created_at).toLocaleString('ko-KR')}</p></div>
          <span className="shrink-0 font-semibold tabular-nums">+{entry.amount.toLocaleString()}</span>
        </li>)}</ul>}
    </div>
  )
}

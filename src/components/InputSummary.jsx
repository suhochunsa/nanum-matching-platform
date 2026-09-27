/** 제출된 입력값을 결과 화면 위쪽에 다시 보여주는 카드 (입력값 확인용) */
export default function InputSummary({ rows }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3">
      <p className="text-sm text-brand-100 mb-2">입력한 정보</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-brand-100">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

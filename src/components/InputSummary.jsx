/** 제출된 입력값을 결과 화면 위쪽에 다시 보여주는 카드 (입력값 확인용) */
export default function InputSummary({ rows }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3.5">
      <p className="mb-2 text-xs font-semibold text-muted">입력한 정보</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

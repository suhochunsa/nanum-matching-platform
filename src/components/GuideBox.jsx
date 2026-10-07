/**
 * 매칭 항목 아래에 펼쳐지는 기부 방법 / 수령 방법 안내.
 * guide: delivery.js의 donationGuide·receiveGuide 결과 ({ method, lines }[])
 * 둘 다 가능한 방법이 없으면 fallback 문구를 보여준다.
 */
export default function GuideBox({ guide, fallback, note }) {
  return (
    <div className="rounded-lg bg-brand-900/40 px-3 py-2.5 text-[13px] leading-relaxed">
      {guide.length === 0 ? (
        <p className="text-accent-500">{fallback}</p>
      ) : (
        <ul className="space-y-2">
          {guide.map((g) => (
            <li key={g.method}>
              <p className="font-semibold">{g.method}</p>
              {g.lines.map((line) => (
                <p key={line} className="text-brand-100">
                  {line}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
      {note && <p className="mt-2 text-xs text-brand-200">{note}</p>}
    </div>
  )
}

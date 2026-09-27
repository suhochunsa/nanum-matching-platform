/** 라벨 + 입력칸 + (오류 메시지 또는 안내 문구) 묶음 */
export default function FormField({ id, label, required, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-black/70 mb-1">
        {label}
        {required && <span className="ml-0.5 text-accent-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-black/45">{hint}</p>
      )}
    </div>
  )
}

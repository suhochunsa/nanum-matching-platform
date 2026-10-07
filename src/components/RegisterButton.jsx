import { Link } from 'react-router-dom'

/**
 * 결과 화면 아래 "데이터베이스에 등록하기" 버튼.
 * status: 'idle'(아직 매칭 확인 전) | 'ready' | 'done' | 'error'
 */
export default function RegisterButton({ status, onRegister, readyHint, doneMessage }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onRegister}
        disabled={status !== 'ready'}
        className="w-full rounded-xl bg-brand-100 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-200 transition-colors disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-100"
      >
        {status === 'done' ? '등록 완료 ✓' : '데이터베이스에 등록하기'}
      </button>

      {status === 'idle' && (
        <p className="text-center text-xs text-black/45">먼저 매칭 결과를 확인하면 등록할 수 있어요.</p>
      )}
      {status === 'ready' && <p className="text-center text-xs text-black/50">{readyHint}</p>}
      {status === 'done' && (
        <p className="text-center text-xs text-brand-700">
          {doneMessage}{' '}
          <Link to="/" className="font-medium underline">
            홈에서 확인하기
          </Link>
        </p>
      )}
      {status === 'error' && (
        <p className="text-center text-xs text-red-600">
          저장하지 못했어요. 브라우저의 사이트 데이터 저장이 막혀 있는지 확인해 주세요.
        </p>
      )}
    </div>
  )
}

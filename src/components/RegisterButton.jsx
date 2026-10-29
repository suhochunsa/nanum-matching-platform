import { Link } from 'react-router-dom'
import { buttonClass } from './ui.js'

/**
 * 결과 화면 아래 "데이터베이스에 등록하기" 버튼.
 * status: 'idle'(아직 매칭 확인 전) | 'ready' | 'saving'(사진 올리기·저장 중) | 'done' | 'error'
 * blockedReason: 등록할 수 없는 이유(로그인 안 함, 다른 역할 계정 등). 있으면 버튼을 막고 로그인 링크를 보여준다.
 */
export default function RegisterButton({ status, onRegister, readyHint, doneMessage, errorMessage, blockedReason }) {
  const blocked = status === 'ready' && Boolean(blockedReason)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onRegister}
        disabled={status !== 'ready' || blocked}
        className={`${buttonClass('primary', 'lg')} w-full`}
      >
        {status === 'done' ? '등록 완료 ✓' : status === 'saving' ? '등록하는 중…' : '데이터베이스에 등록하기'}
      </button>

      {status === 'idle' && (
        <p className="text-center text-xs text-muted">먼저 매칭 결과를 확인하면 등록할 수 있어요.</p>
      )}
      {blocked && (
        <p className="text-center text-xs text-muted">
          {blockedReason}{' '}
          <Link to="/login" className="font-semibold text-ink underline">
            로그인하기
          </Link>
        </p>
      )}
      {status === 'ready' && !blocked && <p className="text-center text-xs text-muted">{readyHint}</p>}
      {status === 'done' && (
        <p className="text-center text-xs text-ink">
          {doneMessage}{' '}
          <Link to="/" className="font-semibold underline">
            홈에서 확인
          </Link>
          {' · '}
          <Link to="/mypage" className="font-semibold underline">
            마이페이지에서 관리
          </Link>
        </p>
      )}
      {status === 'error' && (
        <p className="text-center text-xs text-red-600">
          {errorMessage || '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'}
        </p>
      )}
    </div>
  )
}

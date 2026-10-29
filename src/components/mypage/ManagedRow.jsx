import { useState } from 'react'
import { buttonClass } from '../ui.js'

/**
 * 마이페이지 목록의 한 줄. 보기 → [수정] / [삭제] → 삭제 확인을 관리한다.
 * - view: 보기 모드 내용
 * - renderEditor(close): 수정 폼 (저장·취소 후 close()를 부른다)
 * - onDelete: 삭제 함수 (실패하면 Error를 던진다)
 */
export default function ManagedRow({ view, renderEditor, onDelete, name }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'confirm'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setBusy(true)
    setError('')
    try {
      await onDelete()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <li className="rounded-3xl border border-hairline-soft bg-canvas p-5">
      {view}

      {mode === 'edit' && <div className="mt-4 border-t border-hairline-soft pt-4">{renderEditor(() => setMode('view'))}</div>}

      {mode === 'confirm' && (
        <div role="alertdialog" aria-label="삭제 확인" className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-red-50 px-4 py-3">
          <p className="mr-auto text-sm text-red-700">
            <strong>{name}</strong> 항목을 삭제할까요? 되돌릴 수 없어요.
          </p>
          <button type="button" onClick={handleDelete} disabled={busy} className={buttonClass('danger', 'sm')}>
            {busy ? '삭제하는 중…' : '삭제'}
          </button>
          <button type="button" onClick={() => setMode('view')} disabled={busy} className={buttonClass('ghost', 'sm')}>
            취소
          </button>
        </div>
      )}

      {mode === 'view' && (
        <div className="mt-4 flex justify-end gap-1.5">
          <button type="button" onClick={() => setMode('edit')} className={buttonClass('outline', 'sm')}>
            수정
          </button>
          <button type="button" onClick={() => setMode('confirm')} className={buttonClass('danger-ghost', 'sm')}>
            삭제
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  )
}

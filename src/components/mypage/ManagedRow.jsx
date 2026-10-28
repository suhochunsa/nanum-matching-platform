import { useState } from 'react'

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

  const button = 'rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50'

  return (
    <li className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
      {view}

      {mode === 'edit' && <div className="mt-3 border-t border-black/5 pt-3">{renderEditor(() => setMode('view'))}</div>}

      {mode === 'confirm' && (
        <div role="alertdialog" aria-label="삭제 확인" className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5">
          <p className="mr-auto text-sm text-red-700">
            <strong>{name}</strong> 항목을 삭제할까요? 되돌릴 수 없어요.
          </p>
          <button type="button" onClick={handleDelete} disabled={busy} className={`${button} bg-red-600 text-white hover:bg-red-700`}>
            {busy ? '삭제하는 중…' : '삭제'}
          </button>
          <button type="button" onClick={() => setMode('view')} disabled={busy} className={`${button} text-black/60 hover:bg-black/5`}>
            취소
          </button>
        </div>
      )}

      {mode === 'view' && (
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setMode('edit')} className={`${button} border border-brand-300 text-brand-700 hover:bg-brand-50`}>
            수정
          </button>
          <button type="button" onClick={() => setMode('confirm')} className={`${button} text-red-600 hover:bg-red-50`}>
            삭제
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  )
}

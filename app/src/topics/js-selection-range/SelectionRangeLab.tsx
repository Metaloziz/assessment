import { useRef } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

function selectSentence(p: HTMLParagraphElement | null, log: (k: 'ok' | 'err' | 'info', t: string) => void) {
  const node = p?.firstChild
  if (!p || !node || node.nodeType !== Node.TEXT_NODE) return
  const end = 'Платёж подтверждён'.length
  const range = document.createRange()
  range.setStart(node, 0)
  range.setEnd(node, end)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
  log('ok', `выделено: «${range.toString()}»`)
}

export function SelectionRangeLab() {
  const { lines, log, clear } = useLabLog()
  const problemText = useRef<HTMLParagraphElement>(null)
  const sandboxText = useRef<HTMLParagraphElement>(null)

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        В тексте нужно подсветить фрагмент программно — как будто пользователь сам выделил слова.
      </p>
      <ol className={shell.steps}>
        <li>Возьмите текстовый узел абзаца.</li>
        <li>Создайте <code>Range</code> с границами.</li>
        <li>Положите его в <code>Selection</code>.</li>
      </ol>
      <p className={shell.stage} ref={problemText}>
        Платёж подтверждён. Сумма списана со счёта. Сохраните чек.
      </p>
      <div className={shell.row}>
        <LabButton variant="primary" onClick={() => selectSentence(problemText.current, log)}>
          Выделить первое предложение
        </LabButton>
        <LabButton
          onClick={() => {
            const sel = window.getSelection()
            log('info', `сейчас: «${sel?.toString() || '(пусто)'}», ranges=${sel?.rangeCount ?? 0}`)
          }}
        >
          Что выделено
        </LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>Выделите текст мышью или расширьте range кнопками.</p>
      <p className={shell.stage} ref={sandboxText}>
        Платёж подтверждён. Сумма списана со счёта. Сохраните чек.
      </p>
      <div className={shell.row}>
        <LabButton onClick={() => selectSentence(sandboxText.current, log)}>
          Выделить предложение
        </LabButton>
        <LabButton
          onClick={() => {
            const sel = window.getSelection()
            if (!sel || sel.rangeCount === 0) {
              log('err', 'нет выделения')
              return
            }
            const range = sel.getRangeAt(0)
            try {
              const len = range.endContainer.textContent?.length ?? 0
              range.setEnd(range.endContainer, Math.min(range.endOffset + 5, len))
              sel.removeAllRanges()
              sel.addRange(range)
              log('ok', `расширено: «${range.toString()}»`)
            } catch (e) {
              log('err', String(e))
            }
          }}
        >
          Расширить +5
        </LabButton>
        <LabButton
          onClick={() => {
            window.getSelection()?.removeAllRanges()
            log('info', 'selection очищен')
          }}
        >
          Снять выделение
        </LabButton>
        <LabButton onClick={clear}>Очистить лог</LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <LabCodePanel
      snippets={[
        {
          label: 'Range + Selection',
          code: `const range = document.createRange();
range.setStart(textNode, 0);
range.setEnd(textNode, 10);
const sel = getSelection();
sel.removeAllRanges();
sel.addRange(range);`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Выделить текст из кода"
      lead="Selection — текущее выделение; Range — границы фрагмента в DOM."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}

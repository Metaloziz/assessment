import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { LabVizPanel } from '../../components/lab/LabViz'
import { useLabLog } from '../../components/lab/useLabLog'
import styles from './SelectionRangeLab.module.css'

const TOPIC_ID = '106-js-selection-range'

type CaseId = 'sentence' | 'contents' | 'clone'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'sentence', label: 'Фраза по offset' },
  { id: 'contents', label: 'Весь блок' },
  { id: 'clone', label: 'Копия fragment' },
]

const PAIN = (
  <>
    Нужно попасть не в строку HTML, а в реальный кусок DOM. <code>Range</code> хранит границы как
    узел и смещение, а <code>Selection</code> показывает этот диапазон пользователю.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  sentence: (
    <>
      Берём текстовый узел и ставим границы через <code>setStart</code> / <code>setEnd</code>.
    </>
  ),
  contents: (
    <>
      <code>selectNodeContents()</code> выделяет весь текст внутри блока, но не сам контейнер.
    </>
  ),
  clone: (
    <>
      <code>cloneContents()</code> снимает копию выделенного DOM во <code>DocumentFragment</code>,
      не меняя исходник.
    </>
  ),
}

const CASE_HINT: Record<CaseId, string> = {
  sentence: 'границы range живут в text node и считаются по offset',
  contents: 'контейнер остаётся на месте, выделяется только его содержимое',
  clone: 'fragment можно вставить в preview, а исходный текст не режется',
}

const CODE_INTRO: Record<CaseId, string> = {
  sentence:
    'Выделение фразы: `createRange()` → `setStart()` / `setEnd()` → `removeAllRanges()` → `addRange()`.',
  contents:
    'Выделение блока: `selectNodeContents(article)` полезно для кнопок “выделить абзац целиком”.',
  clone:
    'Копирование без мутаций: `cloneContents()` возвращает `DocumentFragment`, который можно вставить в preview.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  sentence: [
    {
      id: 'selection-command',
      label: 'src/editor/selectStatusLine.ts',
      note: '`Range` ставит границы внутри text node, затем `Selection` показывает их в UI.',
      executable: false,
      languageLabel: 'ts',
      code: `export function selectStatusLine(host: HTMLElement) {
  const textNode = host.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

  const range = document.createRange();
  range.setStart(textNode, 0);   // ← START OFFSET
  range.setEnd(textNode, 18);    // ← END OFFSET

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);    // ← Selection показывает Range пользователю
}`,
    },
    {
      id: 'toolbar-handler',
      label: 'src/editor/toolbar.tsx',
      note: 'Кнопка вызывает команду, но сама не знает, где именно лежат start/end границы.',
      executable: false,
      languageLabel: 'tsx',
      code: `type Props = { paragraphRef: React.RefObject<HTMLParagraphElement | null> };

export const Toolbar = ({ paragraphRef }: Props) => (
  <button
    type="button"
    onClick={() => {
      const host = paragraphRef.current;
      if (host) selectStatusLine(host);
    }}
  >
    Выделить статус
  </button>
);`,
    },
  ],
  contents: [
    {
      id: 'select-contents',
      label: 'src/editor/selectQuote.ts',
      note: '`selectNodeContents()` берёт текст и дочерние узлы внутри блока, не сам элемент.',
      executable: false,
      languageLabel: 'ts',
      code: `export function selectQuoteContents(quote: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(quote); // ← только children / text внутри blockquote

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  return range.toString();
}`,
    },
    {
      id: 'quote-view',
      label: 'src/editor/QuoteCard.tsx',
      note: '`blockquote` остаётся контейнером; меняется только браузерное выделение текста внутри.',
      executable: false,
      languageLabel: 'tsx',
      code: `export const QuoteCard = () => (
  <blockquote className="note">
    <strong>Range:</strong> границы привязаны к DOM,
    а не к строке в \`innerHTML\`.
  </blockquote>
);`,
    },
  ],
  clone: [
    {
      id: 'clone-fragment',
      label: 'src/editor/cloneSelection.ts',
      note: '`cloneContents()` возвращает `DocumentFragment`; исходный `Range` и DOM не режутся.',
      executable: false,
      languageLabel: 'ts',
      code: `export function cloneCurrentSelection(preview: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents(); // ← копия, не extract

  preview.replaceChildren(fragment);
  return range.toString();
}`,
    },
    {
      id: 'preview-slot',
      label: 'src/editor/PreviewPane.tsx',
      note: 'Preview получает уже клонированные узлы и может показать их отдельно от редактора.',
      executable: false,
      languageLabel: 'tsx',
      code: `type Props = { previewRef: React.RefObject<HTMLDivElement | null> };

export const PreviewPane = ({ previewRef }: Props) => (
  <aside>
    <h3>Preview</h3>
    <div ref={previewRef} />
  </aside>
);`,
    },
  ],
}

const clearSelection = () => {
  window.getSelection()?.removeAllRanges()
}

const getTextNode = (el: HTMLElement | null) => {
  const node = el?.firstChild
  return node && node.nodeType === Node.TEXT_NODE ? node : null
}

const selectRange = (range: Range) => {
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

const SelectionRangeViz = ({
  sentenceRef,
  quoteRef,
  cloneStartRef,
  cloneEndRef,
  previewHtml,
  selectionText,
  methodLabel,
  rangeMeta,
  caseId,
  onExpandRange,
}: {
  sentenceRef: RefObject<HTMLSpanElement | null>
  quoteRef: RefObject<HTMLParagraphElement | null>
  cloneStartRef: RefObject<HTMLSpanElement | null>
  cloneEndRef: RefObject<HTMLSpanElement | null>
  previewHtml: string
  selectionText: string
  methodLabel: string
  rangeMeta: string
  caseId: CaseId
  onExpandRange: () => void
}) => (
  <LabVizPanel title="Живой DOM" meta={methodLabel || 'ожидание'}>
    <div className={styles.scene}>
      <section className={styles.editorCard}>
        <div className={styles.cardHead}>
          <strong>Editor</strong>
          <span>Selection в браузере</span>
        </div>

        <p className={styles.paragraph}>
          <span ref={sentenceRef}>Платёж подтверждён.</span> Чек отправлен на почту и сохранён в
          истории операций.
        </p>

        <p ref={quoteRef} className={styles.quote}>
          <strong>Подсказка:</strong> <code>selectNodeContents()</code> выделяет содержимое блока
          целиком.
        </p>

        <p className={styles.paragraph}>
          Для предпросмотра можно взять{' '}
          <span ref={cloneStartRef} className={styles.inlineAccent}>
            дату отгрузки
          </span>{' '}
          и{' '}
          <span ref={cloneEndRef} className={styles.inlineAccent}>
            номер заказа
          </span>{' '}
          как отдельный fragment.
        </p>
      </section>

      <aside className={styles.infoCard}>
        <div className={styles.cardHead}>
          <strong>Inspect</strong>
          <span>текущий результат</span>
        </div>

        <div className={styles.metric}>
          <span>Selection</span>
          <code>{selectionText || '(пусто)'}</code>
        </div>

        <div className={styles.metric}>
          <span>Range</span>
          <code>{rangeMeta || '—'}</code>
        </div>

        <div className={styles.metric}>
          <span>Preview</span>
          <div
            className={styles.preview}
            dangerouslySetInnerHTML={{ __html: previewHtml || '<span>fragment ещё не склонирован</span>' }}
          />
        </div>

        {caseId === 'sentence' ? (
          <div className={shell.row}>
            <LabButton variant="secondary" size="sm" onClick={onExpandRange}>
              Расширить range +5
            </LabButton>
          </div>
        ) : null}
      </aside>
    </div>
  </LabVizPanel>
)

export const SelectionRangeLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('sentence')
  const [selectionText, setSelectionText] = useState('')
  const [rangeMeta, setRangeMeta] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [methodLabel, setMethodLabel] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  const sentenceRef = useRef<HTMLSpanElement | null>(null)
  const quoteRef = useRef<HTMLParagraphElement | null>(null)
  const cloneStartRef = useRef<HTMLSpanElement | null>(null)
  const cloneEndRef = useRef<HTMLSpanElement | null>(null)

  const resetViz = () => {
    clearSelection()
    setSelectionText('')
    setRangeMeta('')
    setPreviewHtml('')
    setMethodLabel('')
    setHint(null)
  }

  useEffect(() => {
    return () => clearSelection()
  }, [])

  const selectCase = (next: CaseId) => {
    clear()
    setCaseId(next)
    resetViz()
  }

  const run = () => {
    clear()
    resetViz()

    if (caseId === 'sentence') {
      const textNode = getTextNode(sentenceRef.current)
      if (!textNode) {
        log('err', 'не нашли text node для первой фразы')
        return
      }

      const range = document.createRange()
      range.setStart(textNode, 0)

      // Выделяем не весь текст: так будет наглядно, что именно меняет Range.
      const raw = textNode.textContent ?? ''
      const firstPart = raw.split('.')[0] ?? raw
      const end = Math.min(firstPart.length, raw.length)
      range.setEnd(textNode, Math.max(1, end))
      selectRange(range)

      const text = range.toString()
      setSelectionText(text)
      setMethodLabel('`setStart()` / `setEnd()`')
      setRangeMeta(`startOffset=${range.startOffset}, endOffset=${range.endOffset}`)
      setHint(CASE_HINT.sentence)
      log('ok', `range выделил: «${text}»`)
      return
    }

    if (caseId === 'contents') {
      if (!quoteRef.current) {
        log('err', 'не нашли блок для selectNodeContents()')
        return
      }

      const range = document.createRange()
      range.selectNodeContents(quoteRef.current)
      selectRange(range)

      const text = range.toString().replace(/\s+/g, ' ').trim()
      setSelectionText(text)
      setMethodLabel('`selectNodeContents()`')
      setRangeMeta(
        `startOffset=${range.startOffset}, endOffset=${range.endOffset} (внутри контейнера)`,
      )
      setHint(CASE_HINT.contents)
      log('ok', `выделено содержимое блока: «${text}»`)
      log('info', 'сам контейнер blockquote в Selection не попадает')
      return
    }

    const startNode = getTextNode(cloneStartRef.current)
    const endNode = getTextNode(cloneEndRef.current)
    if (!startNode || !endNode) {
      log('err', 'не нашли границы для cloneContents()')
      return
    }

    const range = document.createRange()
    range.setStart(startNode, 0)
    range.setEnd(endNode, endNode.textContent?.length ?? 0)
    selectRange(range)

    const fragment = range.cloneContents()
    const mount = document.createElement('div')
    mount.appendChild(fragment)

    const text = range.toString().replace(/\s+/g, ' ').trim()
    setSelectionText(text)
    setPreviewHtml(mount.innerHTML)
    setMethodLabel('`cloneContents()`')
    setRangeMeta(`startOffset=${range.startOffset}, endOffset=${range.endOffset}`)
    setHint(CASE_HINT.clone)
    log('ok', `склонировали fragment: «${text}»`)
    log('info', 'исходный абзац остался на месте — это clone, не extract')
  }

  const onExpandRange = () => {
    if (caseId !== 'sentence') return

    const textNode = getTextNode(sentenceRef.current)
    if (!textNode) {
      log('err', 'не нашли text node для expand')
      return
    }

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      log('err', 'нет текущего выделения (Selection пустой)')
      return
    }

    const range = sel.getRangeAt(0)

    // Для этого кейса ожидаем range внутри одного text node.
    if (range.endContainer !== textNode) {
      log('err', 'endContainer не совпадает с фразой — ожидается range внутри text node')
      return
    }

    try {
      const len = textNode.textContent?.length ?? 0
      const nextEnd = Math.min(range.endOffset + 5, len)
      range.setEnd(textNode, nextEnd)

      selectRange(range)
      const text = range.toString()

      setSelectionText(text)
      setRangeMeta(`startOffset=${range.startOffset}, endOffset=${range.endOffset}`)
      setMethodLabel('`setEnd()` (расширение)')
      setHint(CASE_HINT.sentence)

      log('ok', `range расширен: «${text}»`)
    } catch (e) {
      log('err', String(e))
    }
  }

  const reset = () => {
    clear()
    setCaseId('sentence')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            onClick={() => selectCase(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <SelectionRangeViz
        sentenceRef={sentenceRef}
        quoteRef={quoteRef}
        cloneStartRef={cloneStartRef}
        cloneEndRef={cloneEndRef}
        previewHtml={previewHtml}
        selectionText={selectionText}
        methodLabel={methodLabel}
        rangeMeta={rangeMeta}
        caseId={caseId}
        onExpandRange={onExpandRange}
      />

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            onClick={() => selectCase(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Selection и Range"
      lead="Живой текст: выделение фразы по offset, выбор содержимого блока и копия `DocumentFragment`."
      problem={problem}
      code={code}
    />
  )
}

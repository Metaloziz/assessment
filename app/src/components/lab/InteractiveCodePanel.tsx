import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { cursorCodeMirrorExtensions } from './cursorCodeMirrorTheme'
import { LabButton } from './LabButton'
import styles from './InteractiveCodePanel.module.css'

export type InteractiveSnippet = {
  id: string
  label: string
  code: string
  note?: string
  /** Переопределяет метку языка панели для этого сниппета. */
  languageLabel?: string
  /**
   * false — эталон без песочницы `new Function` (консоль и «Выполнить» скрыты).
   * Живой UI — во вкладке «Решение проблемы», если нужен.
   */
  executable?: boolean
}

type ConsoleKind = 'log' | 'info' | 'warn' | 'error' | 'result' | 'system'

type ConsoleLine = {
  kind: ConsoleKind
  text: string
}

type Props = {
  topicId: string
  intro?: string
  snippets: InteractiveSnippet[]
  /**
   * Cap editor by free dock space (pair with JsLabShell fill).
   * Height follows content; only grows until code fits, then caps and scrolls inside.
   * Default on for all InteractiveCodePanel labs.
   */
  fillAvailable?: boolean
  /** Языковая метка редактора. Для Redux-эталонов — `typescript`. */
  languageLabel?: string
}

function storageKey(topicId: string, snippetId: string) {
  return `assessment-lab-code:${topicId}:${snippetId}`
}

function readStored(topicId: string, snippetId: string): string | null {
  try {
    return localStorage.getItem(storageKey(topicId, snippetId))
  } catch {
    return null
  }
}

function writeStored(topicId: string, snippetId: string, code: string) {
  try {
    localStorage.setItem(storageKey(topicId, snippetId), code)
  } catch {
    /* ignore quota */
  }
}

function clearStored(topicId: string, snippetId: string) {
  try {
    localStorage.removeItem(storageKey(topicId, snippetId))
  } catch {
    /* ignore */
  }
}

function formatArg(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'undefined') return 'undefined'
  if (typeof value === 'symbol') return value.toString()
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

function runUserCode(source: string): ConsoleLine[] {
  const lines: ConsoleLine[] = []
  const push =
    (kind: ConsoleKind) =>
    (...args: unknown[]) => {
      lines.push({ kind, text: args.map(formatArg).join(' ') })
    }

  const fakeConsole = {
    log: push('log'),
    info: push('info'),
    warn: push('warn'),
    error: push('error'),
    debug: push('log'),
  }

  try {
    // eslint-disable-next-line no-new-func -- intentional lab sandbox
    const fn = new Function('console', `"use strict";\n${source}`)
    const result = fn(fakeConsole)
    if (typeof result !== 'undefined') {
      lines.push({ kind: 'result', text: `→ ${formatArg(result)}` })
    }
    if (lines.length === 0) {
      lines.push({ kind: 'system', text: '(нет вывода — добавьте console.log или return)' })
    }
  } catch (err) {
    lines.push({
      kind: 'error',
      text: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    })
  }

  return lines
}

const editorExtensions = [javascript(), ...cursorCodeMirrorExtensions]
const PREFERRED_EDITOR_PX = 176 // ~11rem
const HARD_MIN_EDITOR_PX = 72 // при низком viewport (DevTools снизу) можно сжаться

/** Render `code` backticks like theory inline highlights. */
function formatLabRichText(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={i}>{part.slice(1, -1)}</code>
    }
    return <span key={i}>{part}</span>
  })
}

export function InteractiveCodePanel({
  topicId,
  intro,
  snippets,
  fillAvailable = true,
  languageLabel = 'javascript',
}: Props) {
  const first = snippets[0]
  const [activeId, setActiveId] = useState(first?.id ?? '')
  const activeMeta = useMemo(
    () => snippets.find((s) => s.id === activeId) ?? first,
    [snippets, activeId, first],
  )
  const executable = activeMeta?.executable !== false

  const [code, setCode] = useState(() => {
    if (!first) return ''
    return readStored(topicId, first.id) ?? first.code
  })
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const editorShellRef = useRef<HTMLDivElement>(null)
  const [maxEditorPx, setMaxEditorPx] = useState<number | undefined>()
  /** Пишем в LS только после правки в редакторе, не при mount / смене эталона. */
  const editedRef = useRef(false)
  const persistTimerRef = useRef<number | null>(null)

  const loadSnippet = useCallback(
    (snippet: InteractiveSnippet) => {
      editedRef.current = false
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
      setActiveId(snippet.id)
      setCode(readStored(topicId, snippet.id) ?? snippet.code)
    },
    [topicId],
  )

  const persistIfEdited = useCallback(
    (snippetId: string, canonical: string, next: string) => {
      if (!editedRef.current) return
      if (persistTimerRef.current != null) window.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = window.setTimeout(() => {
        persistTimerRef.current = null
        if (next === canonical) clearStored(topicId, snippetId)
        else writeStored(topicId, snippetId, next)
      }, 400)
    },
    [topicId],
  )

  const onCodeChange = useCallback(
    (value: string) => {
      if (!activeMeta) return
      editedRef.current = true
      setCode(value)
      persistIfEdited(activeMeta.id, activeMeta.code, value)
    },
    [activeMeta, persistIfEdited],
  )

  const run = useCallback((source: string) => {
    setConsoleLines(runUserCode(source))
  }, [])

  useEffect(() => {
    if (!activeMeta) return
    if (activeMeta.executable === false) {
      setConsoleLines([])
      return
    }
    const id = window.setTimeout(() => run(code), 400)
    return () => window.clearTimeout(id)
  }, [code, activeMeta, run])

  // Эталон обновился (HMR / правка лабы), черновика нет — подтянуть новый код без записи в LS.
  useEffect(() => {
    if (!activeMeta || editedRef.current) return
    if (readStored(topicId, activeMeta.id) != null) return
    setCode((prev) => (prev === activeMeta.code ? prev : activeMeta.code))
  }, [activeMeta, topicId])

  useEffect(() => {
    return () => {
      if (persistTimerRef.current != null) window.clearTimeout(persistTimerRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    if (!fillAvailable) {
      setMaxEditorPx(undefined)
      return
    }
    const root = rootRef.current
    const shell = editorShellRef.current
    if (!root || !shell) return

    const measure = () => {
      const rootH = root.clientHeight
      if (rootH <= 0) return
      let used = 0
      for (const child of Array.from(root.children)) {
        if (child === shell) continue
        used += (child as HTMLElement).offsetHeight
      }
      const gapRaw = getComputedStyle(root).rowGap || getComputedStyle(root).gap || '0'
      const gap = Number.parseFloat(gapRaw) || 0
      const gaps = gap * Math.max(0, root.children.length - 1)
      const meta = shell.querySelector(`.${styles.editorMeta}`) as HTMLElement | null
      const metaH = meta?.offsetHeight ?? 0
      const available = Math.floor(rootH - used - gaps - metaH)
      // Не держим 11rem floor — иначе при DevTools снизу редактор раздувает лабу
      setMaxEditorPx(Math.max(HARD_MIN_EDITOR_PX, available))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    // Родительский док тоже меняет высоту при DevTools / resize
    const parent = root.parentElement
    if (parent) ro.observe(parent)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [fillAvailable, intro, activeMeta?.note, consoleLines.length, executable])

  if (!activeMeta) return null

  const dirty = code !== activeMeta.code

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${fillAvailable ? styles.rootFill : ''}`}
    >
      {intro ? <p className={styles.intro}>{formatLabRichText(intro)}</p> : null}

      <div className={styles.snippetTabs} role="tablist" aria-label="Примеры кода">
        {snippets.map((snippet) => (
          <LabButton
            key={snippet.id}
            role="tab"
            aria-selected={snippet.id === activeMeta.id}
            variant="ghost"
            size="sm"
            active={snippet.id === activeMeta.id}
            onClick={() => loadSnippet(snippet)}
          >
            {snippet.label}
          </LabButton>
        ))}
      </div>

      {activeMeta.note ? <p className={styles.note}>{formatLabRichText(activeMeta.note)}</p> : null}

      <div className={styles.toolbar}>
        {executable ? (
          <LabButton variant="primary" onClick={() => run(code)}>
            Выполнить
          </LabButton>
        ) : null}
        <LabButton
          variant="secondary"
          disabled={!dirty}
          onClick={() => {
            editedRef.current = false
            if (persistTimerRef.current != null) {
              window.clearTimeout(persistTimerRef.current)
              persistTimerRef.current = null
            }
            clearStored(topicId, activeMeta.id)
            setCode(activeMeta.code)
          }}
        >
          Сброс кода
        </LabButton>
        {dirty ? <span className={styles.saved}>черновик в localStorage</span> : null}
      </div>

      <div ref={editorShellRef} className={styles.editorShell}>
        <div className={styles.editorMeta}>{activeMeta.languageLabel ?? languageLabel}</div>
        <CodeMirror
          className={styles.editor}
          value={code}
          height="auto"
          minHeight={
            fillAvailable && maxEditorPx != null
              ? `${Math.min(PREFERRED_EDITOR_PX, maxEditorPx)}px`
              : '11rem'
          }
          maxHeight={
            fillAvailable && maxEditorPx != null
              ? `${maxEditorPx}px`
              : fillAvailable
                ? undefined
                : '22rem'
          }
          theme="none"
          extensions={editorExtensions}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            highlightSelectionMatches: false,
            indentOnInput: true,
          }}
          aria-label={`Код: ${activeMeta.label}`}
          onChange={onCodeChange}
        />
      </div>

      {executable ? (
        <div className={styles.console} aria-live="polite">
          <div className={styles.consoleHead}>Консоль</div>
          <pre className={styles.consoleBody}>
            {consoleLines.length === 0 ? (
              <span className={styles.lineSystem}>Запуск…</span>
            ) : (
              consoleLines.map((line, i) => (
                <div
                  key={`${i}-${line.kind}-${line.text.slice(0, 24)}`}
                  className={
                    line.kind === 'error'
                      ? styles.lineError
                      : line.kind === 'warn'
                        ? styles.lineWarn
                        : line.kind === 'result'
                          ? styles.lineResult
                          : line.kind === 'system'
                            ? styles.lineSystem
                            : styles.lineLog
                  }
                >
                  {line.text}
                </div>
              ))
            )}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { cursorCodeMirrorExtensions } from './cursorCodeMirrorTheme'
import styles from './InteractiveCodePanel.module.css'

export type InteractiveSnippet = {
  id: string
  label: string
  code: string
  note?: string
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

export function InteractiveCodePanel({ topicId, intro, snippets }: Props) {
  const first = snippets[0]
  const [activeId, setActiveId] = useState(first?.id ?? '')
  const activeMeta = useMemo(
    () => snippets.find((s) => s.id === activeId) ?? first,
    [snippets, activeId, first],
  )

  const [code, setCode] = useState(() => {
    if (!first) return ''
    return readStored(topicId, first.id) ?? first.code
  })
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([])

  const loadSnippet = useCallback(
    (snippet: InteractiveSnippet) => {
      setActiveId(snippet.id)
      setCode(readStored(topicId, snippet.id) ?? snippet.code)
    },
    [topicId],
  )

  const run = useCallback((source: string) => {
    setConsoleLines(runUserCode(source))
  }, [])

  useEffect(() => {
    if (!activeMeta) return
    const id = window.setTimeout(() => {
      if (code === activeMeta.code) clearStored(topicId, activeMeta.id)
      else writeStored(topicId, activeMeta.id, code)
      run(code)
    }, 400)
    return () => window.clearTimeout(id)
  }, [code, topicId, activeMeta, run])

  if (!activeMeta) return null

  const dirty = code !== activeMeta.code

  return (
    <div className={styles.root}>
      {intro ? <p className={styles.intro}>{intro}</p> : null}

      <div className={styles.snippetTabs} role="tablist" aria-label="Примеры кода">
        {snippets.map((snippet) => (
          <button
            key={snippet.id}
            type="button"
            role="tab"
            aria-selected={snippet.id === activeMeta.id}
            className={`${styles.snippetTab} ${snippet.id === activeMeta.id ? styles.snippetTabActive : ''}`}
            onClick={() => loadSnippet(snippet)}
          >
            {snippet.label}
          </button>
        ))}
      </div>

      {activeMeta.note ? <p className={styles.note}>{activeMeta.note}</p> : null}

      <div className={styles.toolbar}>
        <button type="button" className={styles.btn} onClick={() => run(code)}>
          Выполнить
        </button>
        <button
          type="button"
          className={styles.btn}
          disabled={!dirty && readStored(topicId, activeMeta.id) == null}
          onClick={() => {
            clearStored(topicId, activeMeta.id)
            setCode(activeMeta.code)
          }}
        >
          Сброс кода
        </button>
        {dirty ? <span className={styles.saved}>черновик в localStorage</span> : null}
      </div>

      <div className={styles.editorShell}>
        <div className={styles.editorMeta}>javascript</div>
        <CodeMirror
          className={styles.editor}
          value={code}
          height="auto"
          minHeight="11rem"
          maxHeight="22rem"
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
          onChange={(value) => setCode(value)}
        />
      </div>

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
    </div>
  )
}

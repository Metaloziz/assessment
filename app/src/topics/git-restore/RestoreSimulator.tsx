import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { LabButton } from '../../components/lab/LabButton'
import styles from './RestoreSimulator.module.css'

gsap.registerPlugin(useGSAP)

type Layer = 'head' | 'index' | 'worktree'
type LogLine = { kind: 'ok' | 'err' | 'cmd'; text: string }

const HEAD_CONTENT = `export function greet() {
  return 'hello';
}`

const HEAD_PREV = `export function greet() {
  return 'hi';
}`

const DIRTY = `export function greet() {
  return 'hello world'; // WIP
}`

const STAGED = `export function greet() {
  return 'hello there';
}`

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function layerClass(stylesMap: typeof styles, name: Layer, flash: Layer | null) {
  return `${stylesMap.layer} ${flash === name ? stylesMap.flash : ''}`
}

export function RestoreSimulator() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [head] = useState(HEAD_CONTENT)
  const [index, setIndex] = useState(HEAD_CONTENT)
  const [worktree, setWorktree] = useState(HEAD_CONTENT)
  const [flash, setFlash] = useState<Layer | null>(null)
  const [log, setLog] = useState<LogLine[]>([
    { kind: 'ok', text: 'app.js — clean (HEAD = index = worktree)' },
  ])

  const { contextSafe } = useGSAP({ scope: rootRef })

  const pushLog = (lines: LogLine[]) => {
    setLog((prev) => [...prev.slice(-8), ...lines])
  }

  const pulse = contextSafe((layer: Layer) => {
    setFlash(layer)
    if (prefersReducedMotion()) {
      window.setTimeout(() => setFlash(null), 200)
      return
    }
    const el = rootRef.current?.querySelector(`[data-layer="${layer}"]`)
    if (!el) return
    gsap.fromTo(
      el,
      { boxShadow: '0 0 0 0 rgba(129, 161, 193, 0)' },
      {
        boxShadow: '0 0 0 4px rgba(129, 161, 193, 0.28)',
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        onComplete: () => setFlash(null),
      },
    )
  })

  const editWorktree = () => {
    setWorktree(DIRTY)
    pushLog([
      { kind: 'cmd', text: '# edit app.js in editor' },
      { kind: 'ok', text: 'worktree dirty — unstaged changes' },
    ])
    pulse('worktree')
  }

  const stage = () => {
    setIndex(STAGED)
    setWorktree(STAGED)
    pushLog([
      { kind: 'cmd', text: '$ git add app.js' },
      { kind: 'ok', text: 'staged — index ≠ HEAD' },
    ])
    pulse('index')
  }

  const restoreWorktree = () => {
    if (worktree === index) {
      pushLog([
        { kind: 'cmd', text: '$ git restore app.js' },
        { kind: 'ok', text: 'nothing to restore (worktree already = index)' },
      ])
      return
    }
    setWorktree(index)
    pushLog([
      { kind: 'cmd', text: '$ git restore app.js' },
      { kind: 'ok', text: 'index → worktree (discarded unstaged edits)' },
    ])
    pulse('worktree')
  }

  const restoreStaged = () => {
    if (index === head) {
      pushLog([
        { kind: 'cmd', text: '$ git restore --staged app.js' },
        { kind: 'ok', text: 'nothing to unstage (index already = HEAD)' },
      ])
      return
    }
    setIndex(head)
    pushLog([
      { kind: 'cmd', text: '$ git restore --staged app.js' },
      { kind: 'ok', text: 'HEAD → index (unstage). worktree не тронут' },
    ])
    pulse('index')
  }

  const restoreSource = () => {
    setWorktree(HEAD_PREV)
    pushLog([
      { kind: 'cmd', text: '$ git restore --source=HEAD~1 app.js' },
      { kind: 'ok', text: 'HEAD~1 → worktree (локальная правка, без нового commit)' },
    ])
    pulse('worktree')
  }

  const restoreBoth = () => {
    setIndex(head)
    setWorktree(head)
    pushLog([
      { kind: 'cmd', text: '$ git restore --staged --worktree app.js' },
      { kind: 'ok', text: 'HEAD → index + worktree' },
    ])
    pulse('index')
    pulse('worktree')
  }

  const reset = () => {
    setIndex(HEAD_CONTENT)
    setWorktree(HEAD_CONTENT)
    setFlash(null)
    setLog([{ kind: 'ok', text: 'app.js — clean (HEAD = index = worktree)' }])
  }

  const dirtyWt = worktree !== index
  const dirtyIx = index !== head

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.fileMeta}>
        <span className={styles.fileName}>app.js</span>
        <span className={styles.flags}>
          {dirtyIx ? <span className={styles.flagStaged}>staged</span> : null}
          {dirtyWt ? <span className={styles.flagDirty}>modified</span> : null}
          {!dirtyIx && !dirtyWt ? <span className={styles.flagClean}>clean</span> : null}
        </span>
      </div>

      <div className={styles.layers}>
        <div
          data-layer="head"
          className={layerClass(styles, 'head', flash)}
        >
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>HEAD</span>
            <span className={styles.layerHint}>последний commit</span>
          </div>
          <pre className={styles.code}>{head}</pre>
        </div>

        <div
          data-layer="index"
          className={layerClass(styles, 'index', flash)}
        >
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>Index</span>
            <span className={styles.layerHint}>staging area</span>
          </div>
          <pre className={styles.code}>{index}</pre>
        </div>

        <div
          data-layer="worktree"
          className={layerClass(styles, 'worktree', flash)}
        >
          <div className={styles.layerHead}>
            <span className={styles.layerTitle}>Working tree</span>
            <span className={styles.layerHint}>файлы на диске</span>
          </div>
          <pre className={styles.code}>{worktree}</pre>
        </div>
      </div>

      <div className={styles.actions}>
        <LabButton variant="secondary" onClick={editWorktree}>
          Править файл
        </LabButton>
        <LabButton variant="secondary" onClick={stage}>
          git add
        </LabButton>
        <LabButton variant="primary" onClick={restoreWorktree}>
          git restore
        </LabButton>
        <LabButton variant="primary" onClick={restoreStaged}>
          --staged
        </LabButton>
        <LabButton variant="primary" onClick={restoreSource}>
          --source=HEAD~1
        </LabButton>
        <LabButton variant="primary" onClick={restoreBoth}>
          --staged --worktree
        </LabButton>
        <LabButton variant="secondary" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <pre className={styles.terminal} aria-live="polite">
        {log.map((line, i) => (
          <span key={`${i}-${line.text}`} className={styles[line.kind]}>
            {line.text}
            {'\n'}
          </span>
        ))}
      </pre>
    </div>
  )
}

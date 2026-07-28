import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import styles from './SwitchSimulator.module.css'

gsap.registerPlugin(useGSAP)

const INITIAL = ['main', 'develop', 'feature/login'] as const

type LogLine = { kind: 'ok' | 'err' | 'cmd'; text: string }

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SwitchSimulator() {
  const rootRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLSpanElement>(null)
  const [branches, setBranches] = useState<string[]>([...INITIAL])
  const [current, setCurrent] = useState('main')
  const [previous, setPrevious] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [newName, setNewName] = useState('hotfix/payment')
  const [log, setLog] = useState<LogLine[]>([
    { kind: 'ok', text: 'On branch main' },
  ])

  const { contextSafe } = useGSAP({ scope: rootRef })

  const pushLog = (lines: LogLine[]) => {
    setLog((prev) => [...prev.slice(-8), ...lines])
  }

  const animateHead = contextSafe(() => {
    if (prefersReducedMotion() || !headRef.current) return
    gsap.fromTo(
      headRef.current,
      { scale: 0.75, opacity: 0.4 },
      { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' },
    )
  })

  const doSwitch = (target: string, cmd: string) => {
    if (target === current) {
      pushLog([
        { kind: 'cmd', text: `$ ${cmd}` },
        { kind: 'ok', text: `Already on '${target}'` },
      ])
      return
    }

    if (!branches.includes(target)) {
      pushLog([
        { kind: 'cmd', text: `$ ${cmd}` },
        { kind: 'err', text: `fatal: invalid reference: ${target}` },
      ])
      return
    }

    if (dirty) {
      pushLog([
        { kind: 'cmd', text: `$ ${cmd}` },
        {
          kind: 'err',
          text: `error: Your local changes would be overwritten by checkout.\nPlease commit your changes or stash them before you switch branches.`,
        },
      ])
      return
    }

    setPrevious(current)
    setCurrent(target)
    pushLog([
      { kind: 'cmd', text: `$ ${cmd}` },
      { kind: 'ok', text: `Switched to branch '${target}'` },
    ])
    animateHead()
  }

  const createAndSwitch = () => {
    const name = newName.trim()
    if (!name) return
    const cmd = `git switch -c ${name}`

    if (branches.includes(name)) {
      pushLog([
        { kind: 'cmd', text: `$ ${cmd}` },
        { kind: 'err', text: `fatal: a branch named '${name}' already exists` },
      ])
      return
    }

    if (dirty) {
      pushLog([
        { kind: 'cmd', text: `$ ${cmd}` },
        {
          kind: 'err',
          text: 'error: Your local changes would be overwritten by checkout.\nPlease commit your changes or stash them before you switch branches.',
        },
      ])
      return
    }

    setBranches((b) => [...b, name])
    setPrevious(current)
    setCurrent(name)
    pushLog([
      { kind: 'cmd', text: `$ ${cmd}` },
      { kind: 'ok', text: `Switched to a new branch '${name}'` },
    ])
    animateHead()
  }

  const switchBack = () => {
    if (!previous) {
      pushLog([
        { kind: 'cmd', text: '$ git switch -' },
        { kind: 'err', text: "fatal: unable to find previous revision for '-'" },
      ])
      return
    }
    doSwitch(previous, 'git switch -')
  }

  const reset = () => {
    setBranches([...INITIAL])
    setCurrent('main')
    setPrevious(null)
    setDirty(false)
    setNewName('hotfix/payment')
    setLog([{ kind: 'ok', text: 'On branch main' }])
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.status}>
        <span className={styles.headLabel}>
          HEAD → <span ref={headRef} className={styles.headName}>{current}</span>
        </span>
        <label className={styles.dirtyToggle}>
          <input
            type="checkbox"
            checked={dirty}
            onChange={(e) => setDirty(e.target.checked)}
          />
          Незакоммиченные правки
        </label>
      </div>

      <ul className={styles.branches} aria-label="Локальные ветки">
        {branches.map((branch) => {
          const isHead = branch === current
          return (
            <li key={branch} className={`${styles.branch} ${isHead ? styles.branchHead : ''}`}>
              <button
                type="button"
                className={styles.branchBtn}
                onClick={() => doSwitch(branch, `git switch ${branch}`)}
                disabled={isHead}
              >
                <span className={styles.dot} aria-hidden />
                {branch}
                {isHead ? <span className={styles.badge}>HEAD</span> : null}
              </button>
            </li>
          )
        })}
      </ul>

      <div className={styles.actions}>
        <button type="button" className="uiBtn uiBtnPrimary" onClick={switchBack}>
          git switch -
        </button>
        <div className={styles.createRow}>
          <input
            className={styles.input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="Имя новой ветки"
            spellCheck={false}
          />
          <button type="button" className="uiBtn uiBtnPrimary" onClick={createAndSwitch}>
            git switch -c
          </button>
        </div>
        <button type="button" className="uiBtn uiBtnGhost" onClick={reset}>
          Сброс
        </button>
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

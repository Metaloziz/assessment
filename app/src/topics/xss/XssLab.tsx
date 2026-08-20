import { useEffect, useRef, useState, type ReactNode } from 'react'
import DOMPurify from 'dompurify'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './XssLab.module.css'

const TOPIC_ID = '11-xss'
const HIT_EVENT = 'xss-lab-hit'
const STEP = 0.55

/** Демо-payload: img onerror шлёт событие стенду (не alert). */
const PAYLOAD =
  'Гость <img src=x onerror="window.dispatchEvent(new CustomEvent(\'xss-lab-hit\'))">'

type CaseId = 'danger' | 'text' | 'sanitize'
type Phase = 'idle' | 'insert' | 'hit' | 'safe'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'danger', label: 'innerHTML' },
  { id: 'text', label: 'textContent' },
  { id: 'sanitize', label: 'DOMPurify' },
]

const PAIN = (
  <>
    Недоверенные данные попадают в страницу как код вашего origin. Глаз на стенде: один payload —
    три способа вставки.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  danger: (
    <>
      Сырой <code>innerHTML</code>: браузер разбирает разметку и выполняет{' '}
      <code>onerror</code> у картинки.
    </>
  ),
  text: (
    <>
      <code>textContent</code> кладёт строку как текст — теги и обработчики не оживают.
    </>
  ),
  sanitize: (
    <>
      <code>DOMPurify.sanitize</code>, потом HTML: теги могут остаться, опасные атрибуты —
      срезаны.
    </>
  ),
}

const CASE_HINT: Record<CaseId, string> = {
  danger: 'innerHTML выполнил onerror — XSS в вашем origin',
  text: 'textContent — разметка как текст, скрипт не бежит',
  sanitize: 'DOMPurify убрал onerror — HTML без исполнения',
}

const CODE_INTRO: Record<CaseId, string> = {
  danger: 'Сырой `innerHTML` с недоверенной строкой — классическая DOM XSS.',
  text: 'Текст без интерпретации HTML: `textContent` / JSX `{value}`.',
  sanitize: 'Нужен HTML извне — сначала `DOMPurify.sanitize`, потом вставка.',
}

const SNIPPET_DANGER: InteractiveSnippet = {
  id: 'widget-danger',
  label: 'src/ui/Greeting.ts',
  note: 'Недоверенное в `innerHTML` — браузер исполняет разметку.',
  executable: false,
  languageLabel: 'ts',
  code: `const out = document.querySelector('#out')!;
const name = new URLSearchParams(location.search).get('name') ?? '';

// ═══════════════════════════════════════════
// DANGER ← DOM XSS
// ═══════════════════════════════════════════
out.innerHTML = 'Привет, ' + name; // ← ?name=<img … onerror=…>`,
}

const SNIPPET_TEXT: InteractiveSnippet = {
  id: 'widget-text',
  label: 'src/ui/Greeting.ts',
  note: 'Текст без разбора HTML.',
  executable: false,
  languageLabel: 'ts',
  code: `const out = document.querySelector('#out')!;
const name = new URLSearchParams(location.search).get('name') ?? '';

// ═══════════════════════════════════════════
// TEXT ← без интерпретации разметки
// ═══════════════════════════════════════════
out.textContent = 'Привет, ' + name; // ← теги как символы`,
}

const SNIPPET_ESCAPE: InteractiveSnippet = {
  id: 'search-escape',
  label: 'server/search.js',
  note: 'Reflected: query в HTML только через escape.',
  executable: false,
  languageLabel: 'js',
  code: `function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

app.get('/search', (req, res) => {
  const q = req.query.q ?? '';
  // ═══════════════════════════════════════════
  // ESCAPE ← reflected без XSS
  // ═══════════════════════════════════════════
  res.type('html').send(\`<h1>\${escapeHtml(q)}</h1>\`); // ←
});`,
}

const SNIPPET_SANITIZE: InteractiveSnippet = {
  id: 'comment-sanitize',
  label: 'src/ui/CommentHtml.tsx',
  note: 'HTML из CMS — только после sanitize.',
  executable: false,
  languageLabel: 'tsx',
  code: `import DOMPurify from 'dompurify';

type Props = { html: string };

export const CommentHtml = ({ html }: Props) => {
  // ═══════════════════════════════════════════
  // SANITIZE ← HTML без onerror / script
  // ═══════════════════════════════════════════
  const clean = DOMPurify.sanitize(html); // ←
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
};`,
}

const SNIPPET_REACT_TEXT: InteractiveSnippet = {
  id: 'comment-text',
  label: 'src/ui/CommentText.tsx',
  note: 'JSX экранирует текст в `{body}`.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Comment = { author: string; body: string };

export const CommentText = ({ c }: { c: Comment }) => (
  <article>
    <strong>{c.author}</strong>
    {/* ═══════════════════════════════════════
        JSX ← escape текста
        ═══════════════════════════════════════ */}
    <p>{c.body}</p> {/* ← не innerHTML */}
  </article>
);`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  danger: [SNIPPET_DANGER, SNIPPET_ESCAPE],
  text: [SNIPPET_TEXT, SNIPPET_REACT_TEXT],
  sanitize: [SNIPPET_SANITIZE, SNIPPET_REACT_TEXT],
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function XssLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('danger')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hit, setHit] = useState(false)

  const outRef = useRef<HTMLDivElement | null>(null)
  const badgeRef = useRef<HTMLDivElement | null>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const runIdRef = useRef(0)
  const hitFlagRef = useRef(false)

  useEffect(() => {
    const onHit = () => {
      hitFlagRef.current = true
      setHit(true)
    }
    window.addEventListener(HIT_EVENT, onHit)
    return () => window.removeEventListener(HIT_EVENT, onHit)
  }, [])

  useEffect(() => {
    if (phase !== 'hit' && phase !== 'safe') return
    const badge = badgeRef.current
    if (!badge || reducedMotion()) return
    const tl = gsap.timeline()
    tlRef.current = tl
    tl.fromTo(
      badge,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: STEP, ease: 'power2.inOut' },
    )
    if (phase === 'hit') {
      tl.to(badge, { x: 3, duration: 0.08, yoyo: true, repeat: 3, ease: 'power1.inOut' }, '-=0.2')
    }
    return () => {
      tl.kill()
    }
  }, [phase])

  const clearOut = () => {
    const el = outRef.current
    if (el) el.textContent = 'Здесь появится приветствие…'
    setHit(false)
    hitFlagRef.current = false
    if (badgeRef.current) gsap.set(badgeRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    if (busy) return
    tlRef.current?.kill()
    runIdRef.current += 1
    setCaseId(next)
    setPhase('idle')
    setHint(null)
    clear()
    clearOut()
  }

  const run = () => {
    const runId = ++runIdRef.current
    tlRef.current?.kill()
    clear()
    clearOut()
    setBusy(true)
    setHint(null)
    setPhase('insert')

    const el = outRef.current
    if (!el) {
      setBusy(false)
      return
    }

    const finish = (next: Phase, hintText: string, logFn: () => void) => {
      if (runId !== runIdRef.current) return
      logFn()
      setPhase(next)
      setHint(hintText)
      setBusy(false)
    }

    window.setTimeout(() => {
      if (runId !== runIdRef.current) return

      if (caseId === 'danger') {
        el.innerHTML = PAYLOAD
        window.setTimeout(() => {
          if (runId !== runIdRef.current) return
          const fired = hitFlagRef.current
          finish(
            fired ? 'hit' : 'safe',
            CASE_HINT.danger,
            () => {
              log('info', 'вставка через innerHTML')
              if (fired) {
                log('err', 'onerror сработал — скрипт в origin страницы')
                log('warn', 'в проде так крадут сессию / подменяют UI')
              } else {
                log('warn', 'ожидали onerror — проверьте payload')
              }
            },
          )
        }, 40)
        return
      }

      if (caseId === 'text') {
        el.textContent = PAYLOAD
        finish('safe', CASE_HINT.text, () => {
          log('info', 'вставка через textContent')
          log('ok', 'теги на экране как символы — onerror не бежит')
        })
        return
      }

      const clean = DOMPurify.sanitize(PAYLOAD)
      el.innerHTML = clean
      window.setTimeout(() => {
        if (runId !== runIdRef.current) return
        const fired = hitFlagRef.current
        finish(
          fired ? 'hit' : 'safe',
          CASE_HINT.sanitize,
          () => {
            log('info', 'DOMPurify.sanitize → innerHTML')
            if (fired) {
              log('err', 'onerror всё ещё сработал — проверьте конфиг sanitize')
            } else {
              log('ok', 'опасные атрибуты срезаны')
              log('ok', 'разметка без исполнения')
            }
          },
        )
      }, 40)
    }, reducedMotion() ? 0 : 280)
  }

  const reset = () => {
    tlRef.current?.kill()
    runIdRef.current += 1
    clear()
    clearOut()
    setCaseId('danger')
    setPhase('idle')
    setHint(null)
    setBusy(false)
  }

  const metaLabel =
    phase === 'idle'
      ? 'ожидание'
      : phase === 'insert'
        ? 'вставка…'
        : phase === 'hit'
          ? 'XSS сработал'
          : 'безопасно'

  const pageState =
    phase === 'hit' ? styles.pageHit : phase === 'safe' ? styles.pageSafe : phase === 'insert' ? styles.pageActive : ''

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map(({ id, label }) => (
          <LabButton
            key={id}
            variant="ghost"
            size="sm"
            active={caseId === id}
            disabled={busy}
            onClick={() => selectCase(id)}
          >
            {label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <LabVizPanel title="Мини-страница · yourapp.com" meta={metaLabel}>
        <div className={`${styles.page} ${pageState}`}>
          <div className={styles.chrome}>
            <span className={styles.dots} aria-hidden>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
            <p className={styles.url}>yourapp.com/greet</p>
          </div>
          <div className={styles.body}>
            <p className={styles.label}>Приветствие из query / комментария</p>
            <div ref={outRef} className={styles.out} data-phase={phase}>
              Здесь появится приветствие…
            </div>
            {phase === 'hit' || phase === 'safe' ? (
              <div
                ref={badgeRef}
                className={`${styles.badge} ${phase === 'hit' || hit ? styles.badgeErr : styles.badgeOk}`}
                role="status"
              >
                {phase === 'hit' || hit ? 'XSS сработал' : 'Исполнения нет'}
              </div>
            ) : null}
          </div>
        </div>
      </LabVizPanel>

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
        {CASES.map(({ id, label }) => (
          <LabButton
            key={id}
            variant="ghost"
            size="sm"
            active={caseId === id}
            onClick={() => selectCase(id)}
          >
            {label}
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
      title="XSS"
      lead="Один payload — три вставки: innerHTML, textContent, DOMPurify."
      problem={problem}
      code={code}
    />
  )
}

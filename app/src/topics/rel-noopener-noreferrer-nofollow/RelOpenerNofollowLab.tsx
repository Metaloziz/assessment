import { useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './RelOpenerNofollowLab.module.css'

const TOPIC_ID = '149-rel-noopener-noreferrer-nofollow'
const CHANNEL = 'assessment-rel-lab'
const HOME_URL = 'https://shop.example/cart'
const PHISH_URL = 'https://evil.example/login'
const STEP = 0.55

type CaseId = 'bare' | 'safe' | 'nofollow'
type Phase = 'idle' | 'open' | 'probe' | 'done'

type ChildReport = {
  source: 'assessment-rel-lab'
  hasOpener: boolean
  referrer: string
  caseId: CaseId
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'bare', label: 'Без rel' },
  { id: 'safe', label: 'noopener + noreferrer' },
  { id: 'nofollow', label: 'Только nofollow' },
]

const PAIN = (
  <>
    Ссылка с <code>target=&quot;_blank&quot;</code> может оставить новой вкладке{' '}
    <code>window.opener</code>. Без защиты чужой сайт способен переписать адрес вашей вкладки
    (tabnabbing).
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  bare: (
    <>
      Открываем без <code>rel</code> — у новой вкладки есть <code>window.opener</code>, исходную можно
      «угнать».
    </>
  ),
  safe: (
    <>
      <code>rel=&quot;noopener noreferrer&quot;</code> — <code>opener</code> обнуляется, Referer не
      уходит.
    </>
  ),
  nofollow: (
    <>
      Один <code>nofollow</code> — сигнал поисковику, но <code>opener</code> остаётся: это не защита.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  bare: 'Внешняя ссылка без `rel`: новая вкладка получает `window.opener`.',
  safe: 'Минимум для `_blank`: `noopener` + `noreferrer`.',
  nofollow: '`nofollow` / `ugc` — про SEO; opener не трогают.',
}

const SNIPPET_BARE: InteractiveSnippet = {
  id: 'link-bare',
  label: 'src/ui/ExternalLink.tsx',
  note: 'Без `rel` новая вкладка может держать `window.opener`.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { href: string; children: React.ReactNode };

export const ExternalLink = ({ href, children }: Props) => (
  // ═══════════════════════════════════════════
  // BARE ← target=_blank без rel
  // ═══════════════════════════════════════════
  <a href={href} target="_blank">
    {children} {/* ← opener может остаться */}
  </a>
);`,
}

const SNIPPET_SAFE: InteractiveSnippet = {
  id: 'link-safe',
  label: 'src/ui/ExternalLink.tsx',
  note: 'Безопасный минимум для внешних `_blank`.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { href: string; children: React.ReactNode };

export const ExternalLink = ({ href, children }: Props) => (
  // ═══════════════════════════════════════════
  // SAFE ← обрыв opener + без Referer
  // ═══════════════════════════════════════════
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer" // ← защита от tabnabbing
  >
    {children}
  </a>
);`,
}

const SNIPPET_OPEN: InteractiveSnippet = {
  id: 'open-features',
  label: 'src/lib/openExternal.ts',
  note: '`window.open` с features — явный noopener / noreferrer.',
  executable: false,
  languageLabel: 'ts',
  code: `export function openExternal(url: string) {
  // ═══════════════════════════════════════════
  // OPEN ← features вместо только target=_blank
  // ═══════════════════════════════════════════
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  // w === null при noopener — ссылки на opener нет
  return w;
}`,
}

const SNIPPET_NOFOLLOW: InteractiveSnippet = {
  id: 'link-nofollow',
  label: 'src/ui/CommentLink.tsx',
  note: 'UGC: nofollow / ugc для SEO; opener — отдельно.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { href: string; children: React.ReactNode };

export const CommentLink = ({ href, children }: Props) => (
  // ═══════════════════════════════════════════
  // UGC ← SEO-сигнал + защита opener
  // ═══════════════════════════════════════════
  <a
    href={href}
    target="_blank"
    rel="nofollow ugc noopener noreferrer" // ← nofollow ≠ безопасность
  >
    {children}
  </a>
);`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  bare: [SNIPPET_BARE, SNIPPET_OPEN],
  safe: [SNIPPET_SAFE, SNIPPET_OPEN],
  nofollow: [SNIPPET_NOFOLLOW, SNIPPET_SAFE],
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function buildChildHtml(caseId: CaseId): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Демо · новая вкладка</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1.25rem;
      background: #14161a; color: #e8eaed; }
    code { font-size: 0.9em; }
    .row { margin: 0.55rem 0; padding: 0.45rem 0.6rem; border-radius: 6px;
      background: #1e2228; border: 1px solid #2c3138; }
  </style>
</head>
<body>
  <p>Страница, открытая из лабы <code>rel</code></p>
  <p class="row" id="op">…</p>
  <p class="row" id="rf">…</p>
  <script>
    (function () {
      var hasOpener = Boolean(window.opener);
      var referrer = document.referrer || '';
      document.getElementById('op').textContent = hasOpener
        ? 'window.opener есть — исходную вкладку можно переписать'
        : 'window.opener = null — связи нет';
      document.getElementById('rf').textContent = 'Referer: ' + (referrer || '(пусто)');
      var payload = {
        source: 'assessment-rel-lab',
        hasOpener: hasOpener,
        referrer: referrer,
        caseId: '${caseId}'
      };
      try { new BroadcastChannel('${CHANNEL}').postMessage(payload); } catch (e) {}
      if (hasOpener) {
        try { window.opener.postMessage(payload, '*'); } catch (e) {}
      }
    })();
  </script>
</body>
</html>`
}

function openProbe(caseId: CaseId): Window | null {
  const blob = new Blob([buildChildHtml(caseId)], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  let child: Window | null = null
  if (caseId === 'safe') {
    child = window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    // bare / только nofollow: намеренно без noopener — показать opener
    child = window.open(url, '_blank')
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  return child
}

export function RelOpenerNofollowLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('bare')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hasOpener, setHasOpener] = useState<boolean | null>(null)
  const [referrer, setReferrer] = useState<string | null>(null)
  const [hijacked, setHijacked] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const childRef = useRef<Window | null>(null)
  const bridgeRef = useRef<HTMLDivElement | null>(null)
  const homeRef = useRef<HTMLDivElement | null>(null)
  const pendingRef = useRef<CaseId | null>(null)
  const settleTimer = useRef<number | null>(null)
  const finishRef = useRef<(report: ChildReport, openedNull: boolean) => void>(() => {})

  const closeChild = () => {
    try {
      childRef.current?.close()
    } catch {
      /* ignore */
    }
    childRef.current = null
  }

  const resetViz = () => {
    setPhase('idle')
    setHasOpener(null)
    setReferrer(null)
    setHijacked(false)
    setHint(null)
    if (bridgeRef.current) gsap.set(bridgeRef.current, { clearProps: 'transform,opacity' })
    if (homeRef.current) gsap.set(homeRef.current, { clearProps: 'transform,opacity' })
  }

  const finishWithReport = (report: ChildReport, openedNull: boolean) => {
    if (settleTimer.current != null) {
      window.clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
    const expected = pendingRef.current
    if (!expected || report.caseId !== expected) return
    // один ответ на прогон (postMessage + BroadcastChannel могут прийти оба)
    pendingRef.current = null

    const openerPresent = report.hasOpener && !openedNull
    setHasOpener(openerPresent)
    setReferrer(report.referrer)
    setPhase('probe')

    const steps: Array<() => void> = [
      () => setPhase('probe'),
      () => {
        if (openerPresent && (expected === 'bare' || expected === 'nofollow')) {
          setHijacked(true)
          setPhase('done')
          log('err', 'window.opener есть — новая вкладка видит исходную')
          log('err', `симуляция: opener.location → ${PHISH_URL}`)
          if (expected === 'nofollow') {
            log('warn', 'nofollow не обрывает opener')
            setHint('nofollow — про SEO, не про tabnabbing')
          } else {
            setHint('без rel исходную вкладку можно переписать')
          }
        } else {
          setHijacked(false)
          setPhase('done')
          log('ok', 'window.opener = null')
          log(
            'ok',
            report.referrer
              ? `Referer: ${report.referrer}`
              : 'Referer пуст (noreferrer / политика)',
          )
          setHint('noopener + noreferrer обрывают opener и Referer')
        }
      },
    ]

    tlRef.current?.kill()
    if (reducedMotion()) {
      for (const step of steps) step()
      setBusy(false)
      return
    }

    const tl = gsap.timeline({
      defaults: { duration: 0.5, ease: 'power2.inOut' },
      onComplete: () => setBusy(false),
    })
    tlRef.current = tl
    steps.forEach((step, i) => {
      tl.call(step, undefined, i * STEP)
    })
    if (bridgeRef.current) {
      gsap.set(bridgeRef.current, { scale: 0.92, opacity: 0.45 })
      tl.to(bridgeRef.current, { scale: 1, opacity: 1 }, 0)
    }
    if (homeRef.current && openerPresent) {
      gsap.set(homeRef.current, { y: 0 })
      tl.to(homeRef.current, { y: 4 }, STEP)
      tl.to(homeRef.current, { y: 0 }, STEP + 0.35)
    }
  }

  finishRef.current = finishWithReport

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as ChildReport | null
      if (!data || data.source !== 'assessment-rel-lab') return
      finishRef.current(data, false)
    }
    const bc = new BroadcastChannel(CHANNEL)
    bc.onmessage = (event: MessageEvent<ChildReport>) => {
      const data = event.data
      if (!data || data.source !== 'assessment-rel-lab') return
      finishRef.current(data, childRef.current == null && pendingRef.current === 'safe')
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      bc.close()
      tlRef.current?.kill()
      if (settleTimer.current != null) window.clearTimeout(settleTimer.current)
      closeChild()
    }
  }, [])

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    if (settleTimer.current != null) window.clearTimeout(settleTimer.current)
    setBusy(false)
    pendingRef.current = null
    closeChild()
    setCaseId(next)
    clear()
    resetViz()
  }

  const run = () => {
    clear()
    resetViz()
    closeChild()
    setBusy(true)
    setPhase('open')
    pendingRef.current = caseId
    log('info', `открываем демо-вкладку · кейс «${CASES.find((c) => c.id === caseId)?.label}»`)

    const child = openProbe(caseId)
    childRef.current = child

    if (caseId === 'safe' && child == null) {
      // noopener: open вернул null — ждём BroadcastChannel от дочерней страницы
      settleTimer.current = window.setTimeout(() => {
        if (pendingRef.current !== 'safe') return
        finishWithReport(
          { source: 'assessment-rel-lab', hasOpener: false, referrer: '', caseId: 'safe' },
          true,
        )
      }, 900)
      return
    }

    if (child == null) {
      log('warn', 'браузер заблокировал окно — разрешите всплывающие')
      setHint('нужен разрешённый popup для живого opener')
      setBusy(false)
      pendingRef.current = null
      setPhase('idle')
      return
    }

    settleTimer.current = window.setTimeout(() => {
      if (!pendingRef.current) return
      log('warn', 'нет ответа от вкладки — смотрите её статус opener вручную')
      setBusy(false)
      setPhase('done')
      setHint('ответ не пришёл; проверьте блокировку окон')
      pendingRef.current = null
    }, 2500)
  }

  const reset = () => {
    tlRef.current?.kill()
    if (settleTimer.current != null) window.clearTimeout(settleTimer.current)
    setBusy(false)
    pendingRef.current = null
    closeChild()
    clear()
    setCaseId('bare')
    resetViz()
  }

  const homeUrl = hijacked ? PHISH_URL : HOME_URL
  const homeState = hijacked ? styles.tabErr : phase !== 'idle' ? styles.tabActive : ''
  const remoteState =
    hasOpener === false
      ? styles.tabOk
      : hasOpener === true
        ? styles.tabErr
        : phase === 'open' || phase === 'probe'
          ? styles.tabActive
          : ''

  const bridgeClass = [
    styles.bridge,
    hasOpener === true ? styles.bridgeLive : '',
    hasOpener === false ? styles.bridgeSafe : '',
  ]
    .filter(Boolean)
    .join(' ')

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={busy}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
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

      <LabVizPanel
        title="Две вкладки"
        meta={
          phase === 'idle'
            ? 'после запуска — живой window.open'
            : hasOpener === true
              ? 'opener связан'
              : hasOpener === false
                ? 'opener = null'
                : 'ждём ответ вкладки'
        }
      >
        <div className={styles.stage}>
          <div ref={homeRef} className={[styles.tab, homeState].filter(Boolean).join(' ')}>
            <div className={styles.chrome}>
              <div className={styles.dots} aria-hidden>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
              <p className={[styles.url, hijacked ? styles.urlPhish : ''].filter(Boolean).join(' ')}>
                {homeUrl}
              </p>
            </div>
            <div className={styles.body}>
              <p className={styles.title}>Ваша вкладка</p>
              <p className={styles.meta}>
                {hijacked ? 'адрес подменён (tabnabbing)' : 'исходная страница магазина'}
              </p>
            </div>
          </div>

          <div ref={bridgeRef} className={bridgeClass}>
            <span className={styles.bridgeArrow} aria-hidden>
              {hasOpener === false ? '⟂' : '↔'}
            </span>
            <span>
              {hasOpener === true
                ? 'opener'
                : hasOpener === false
                  ? 'нет связи'
                  : 'rel?'}
            </span>
          </div>

          <div className={[styles.tab, remoteState].filter(Boolean).join(' ')}>
            <div className={styles.chrome}>
              <div className={styles.dots} aria-hidden>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
              <p className={styles.url}>blob:…/demo</p>
            </div>
            <div className={styles.body}>
              <p className={styles.title}>Новая вкладка</p>
              <p className={styles.meta}>
                {hasOpener == null && phase === 'idle'
                  ? 'ещё не открыта'
                  : hasOpener == null
                    ? 'открыта · ждём отчёт'
                    : hasOpener
                      ? 'держит window.opener'
                      : 'opener = null'}
              </p>
              {referrer != null ? (
                <p className={styles.meta}>Referer: {referrer || '(пусто)'}</p>
              ) : null}
            </div>
          </div>
        </div>
      </LabVizPanel>

      {hint ? (
        <p className={shell.hint}>
          Итог: {hint}
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
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
      title="rel · noopener / noreferrer / nofollow"
      lead="Живой window.open: есть ли opener у новой вкладки и помогает ли один nofollow."
      problem={problem}
      code={code}
    />
  )
}

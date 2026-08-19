import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './PwaLab.module.css'

const TOPIC_ID = '70-pwa'
const STEP = 0.6

type Pattern = 'manifest' | 'install'
type ManifestCase = 'browser' | 'standalone'
type InstallCase = 'incomplete' | 'ready'
type CaseId = ManifestCase | InstallCase
type Phase = 'idle' | 'a' | 'b' | 'c' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'manifest', label: 'Manifest' },
  { id: 'install', label: 'Установка' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  manifest: [
    { id: 'browser', label: 'Вкладка браузера' },
    { id: 'standalone', label: 'Standalone' },
  ],
  install: [
    { id: 'incomplete', label: 'Не хватает слоёв' },
    { id: 'ready', label: 'Готово к установке' },
  ],
}

const PAIN: Record<Pattern, ReactNode> = {
  manifest: (
    <>
      Манифест не «украшает сайт» — он говорит браузеру, как назвать ярлык, с какого URL стартовать и
      оставить ли адресную строку через <code>display</code>.
    </>
  ),
  install: (
    <>
      Установка появляется не от одного JSON: нужны <code>HTTPS</code>, валидный manifest с иконками и
      активный <code>Service Worker</code> в scope — иначе ярлык на экран не предложат.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  browser: (
    <>
      При <code>display: browser</code> остаётся адресная строка — сайт ведёт себя как обычная вкладка.
    </>
  ),
  standalone: (
    <>
      При <code>display: standalone</code> оболочка браузера скрыта: своё окно, <code>theme_color</code> в
      статус-баре.
    </>
  ),
  incomplete: (
    <>
      Без иконки нужного размера или без контролирующего SW браузер не считает приложение
      устанавливаемым.
    </>
  ),
  ready: (
    <>
      Все три слоя на месте — кнопка «Установить» и ярлык на домашнем экране становятся доступны.
    </>
  ),
}

const HINT: Record<CaseId, string> = {
  browser: 'Итог: manifest с browser не превращает вкладку в отдельное приложение — только метаданные и иконка.',
  standalone:
    'Итог: standalone убирает UI браузера; пользователь открывает ярлык как отдельное окно.',
  incomplete:
    'Итог: PWA — цепочка условий; один пропущенный слой блокирует установку, хотя сайт во вкладке работает.',
  ready: 'Итог: HTTPS + manifest + SW — база, на которую уже навешивают офлайн, push и синхронизацию.',
}

const CODE_INTRO: Record<Pattern, string> = {
  manifest: '`manifest.webmanifest` и `<link rel="manifest">`: имя, иконки, `display`, `start_url`.',
  install: 'Регистрация SW на главной странице — без него установленное приложение не переживёт офлайн.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  manifest: [
    {
      id: 'manifest-json',
      label: 'public/manifest.webmanifest',
      note: 'Manifest задаёт имя, иконки и режим окна после установки.',
      executable: false,
      languageLabel: 'json',
      code: `{
  "name": "Assessment Prep",
  "short_name": "Assessment",
  "start_url": "/",
  "display": "standalone", // ← без адресной строки
  "theme_color": "#191919",
  "background_color": "#191919",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}`,
    },
    {
      id: 'manifest-link',
      label: 'index.html',
      note: 'Без link браузер не подхватит manifest при проверке установки.',
      executable: false,
      languageLabel: 'html',
      code: `<!doctype html>
<html lang="ru">
  <head>
    <link rel="manifest" href="/manifest.webmanifest" /> <!-- ← manifest -->
    <meta name="theme-color" content="#191919" />          <!-- ← цвет оболочки -->
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
    },
  ],
  install: [
    {
      id: 'register-sw',
      label: 'src/main.ts',
      note: 'SW регистируют после load; scope должен покрывать start_url из manifest.',
      executable: false,
      languageLabel: 'ts',
      code: `if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/', // ← тот же scope, что start_url
    })
  })
}`,
    },
    {
      id: 'sw-shell',
      label: 'public/sw.js',
      note: 'Precache оболочки — без этого офлайн после установки пустой.',
      executable: false,
      languageLabel: 'js',
      code: `const CACHE = 'app-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/', '/index.html', '/app.css', '/app.js']), // ← оболочка
    ),
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  )
})`,
    },
  ],
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: STEP, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
}

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (id: Pattern) => void
}) {
  return (
    <div className={shell.row}>
      {PATTERNS.map((p) => (
        <LabButton
          key={p.id}
          variant="ghost"
          size="sm"
          active={value === p.id}
          disabled={disabled}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </LabButton>
      ))}
    </div>
  )
}

function ManifestScene({ caseId, phase }: { caseId: ManifestCase; phase: Phase }) {
  const isStandalone = caseId === 'standalone'
  const revealed = phase !== 'idle'

  return (
    <div className={styles.scene}>
      <div
        className={[styles.device, revealed ? styles.deviceActive : ''].filter(Boolean).join(' ')}
      >
        {!isStandalone ? (
          <div className={styles.browserChrome}>
            <div className={styles.browserDots}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.urlBar}>https://app.example.com/</div>
          </div>
        ) : (
          <div
            className={[
              styles.statusBar,
              revealed ? '' : styles.statusBarHidden,
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ background: revealed ? 'var(--accent)' : undefined }}
          />
        )}
        <div className={styles.appBody}>
          <p className={styles.appTitle}>Assessment Prep</p>
          <p className={styles.appMeta}>
            {isStandalone
              ? 'display: standalone · без адресной строки'
              : 'display: browser · обычная вкладка'}
          </p>
          <div className={styles.iconSlot}>
            <div className={styles.homeIcon}>AP</div>
            <span className={styles.appMeta}>short_name на домашнем экране</span>
          </div>
        </div>
      </div>
    </div>
  )
}

type CheckKey = 'https' | 'manifest' | 'sw' | 'install'

function InstallScene({
  caseId,
  phase,
  activeStep,
}: {
  caseId: InstallCase
  phase: Phase
  activeStep: CheckKey | null
}) {
  const ready = caseId === 'ready'
  const revealed = phase !== 'idle'

  const itemClass = (key: CheckKey, ok: boolean) =>
    [
      styles.checkItem,
      !revealed ? styles.checkIdle : ok ? styles.checkOk : styles.checkWarn,
      activeStep === key ? styles.checkActive : '',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <div className={styles.scene}>
      <div className={styles.checklist}>
        <div className={itemClass('https', true)}>
          <strong>HTTPS</strong>
          <span>secure context</span>
        </div>
        <div className={itemClass('manifest', true)}>
          <strong>Manifest</strong>
          <span>имя и start_url</span>
        </div>
        <div className={itemClass('sw', ready)}>
          <strong>Service Worker</strong>
          <span>{ready ? 'контролирует scope' : 'не активен'}</span>
        </div>
        <div className={itemClass('install', ready)}>
          <strong>Установка</strong>
          <span>{ready ? 'доступна' : 'заблокирована'}</span>
        </div>
      </div>
      <div className={styles.installRow}>
        {ready ? (
          <div className={styles.homeIcon}>AP</div>
        ) : (
          <div className={styles.iconMissing}>?</div>
        )}
        <button
          type="button"
          className={[
            styles.installBtn,
            ready && revealed ? styles.installReady : styles.installDisabled,
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={!ready || !revealed}
        >
          Установить приложение
        </button>
      </div>
    </div>
  )
}

function ProblemPanel({
  pattern,
  caseId,
  phase,
  activeStep,
  busy,
  finished,
  lines,
  onPatternChange,
  onCaseChange,
  onRun,
  onReset,
}: {
  pattern: Pattern
  caseId: CaseId
  phase: Phase
  activeStep: CheckKey | null
  busy: boolean
  finished: boolean
  lines: ReturnType<typeof useLabLog>['lines']
  onPatternChange: (p: Pattern) => void
  onCaseChange: (id: CaseId) => void
  onRun: () => void
  onReset: () => void
}) {
  const cases = CASES[pattern]

  return (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={onPatternChange} />
      <div className={shell.row}>
        {cases.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            disabled={busy}
            onClick={() => onCaseChange(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>
      <div className={shell.row}>
        <LabButton variant="primary" size="sm" disabled={busy} onClick={onRun}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" size="sm" disabled={busy} onClick={onReset}>
          Сброс
        </LabButton>
      </div>
      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <LabVizPanel
        title={pattern === 'manifest' ? 'режим окна' : 'критерии установки'}
        meta={
          pattern === 'manifest'
            ? caseId === 'standalone'
              ? 'standalone · своё окно'
              : 'browser · вкладка'
            : caseId === 'ready'
              ? 'все слои · install ok'
              : 'SW или иконка · install blocked'
        }
      >
        {pattern === 'manifest' ? (
          <ManifestScene caseId={caseId as ManifestCase} phase={phase} />
        ) : (
          <InstallScene
            caseId={caseId as InstallCase}
            phase={phase}
            activeStep={activeStep}
          />
        )}
      </LabVizPanel>

      {finished ? <p className={shell.hint}>{HINT[caseId]}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}

export function PwaLab() {
  const [pattern, setPattern] = useState<Pattern>('manifest')
  const [caseId, setCaseId] = useState<CaseId>('browser')
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeStep, setActiveStep] = useState<CheckKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const { lines, log, clear } = useLabLog(6)

  const switchPattern = (next: Pattern) => {
    setPattern(next)
    setCaseId(CASES[next][0].id)
    setPhase('idle')
    setActiveStep(null)
    setFinished(false)
    clear()
    tlRef.current?.kill()
  }

  const switchCase = (next: CaseId) => {
    setCaseId(next)
    setPhase('idle')
    setActiveStep(null)
    setFinished(false)
    clear()
    tlRef.current?.kill()
  }

  const reset = () => {
    setPhase('idle')
    setActiveStep(null)
    setFinished(false)
    setBusy(false)
    clear()
    tlRef.current?.kill()
    log('info', 'Сброс стенда')
  }

  const run = () => {
    clear()
    setFinished(false)
    setBusy(true)
    setPhase('idle')
    setActiveStep(null)

    if (pattern === 'manifest') {
      const mode = caseId as ManifestCase
      log('info', `manifest · display: ${mode}`)
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('a')
            log('ok', mode === 'browser' ? 'Вкладка с адресной строкой' : 'Статус-бар theme_color')
          },
          () => {
            setPhase('b')
            log('info', 'Иконка short_name на домашнем экране')
          },
          () => setPhase('done'),
        ],
        () => {
          setFinished(true)
          setBusy(false)
          log('ok', mode === 'browser' ? 'browser · UI браузера остаётся' : 'standalone · своё окно')
        },
      )
      return
    }

    const ready = caseId === 'ready'
    const steps: CheckKey[] = ['https', 'manifest', 'sw', 'install']
    log('info', ready ? 'Проверка готовности к установке' : 'Проверка: не хватает SW или иконки')

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('a')
          setActiveStep('https')
          log('ok', 'HTTPS · secure context')
        },
        () => {
          setActiveStep('manifest')
          log('ok', 'Manifest · name, start_url, icons')
        },
        () => {
          setActiveStep('sw')
          if (ready) {
            log('ok', 'Service Worker · контролирует scope')
          } else {
            log('warn', 'Service Worker · не активен')
          }
        },
        () => {
          setPhase('done')
          setActiveStep('install')
          if (ready) {
            log('ok', 'Install · кнопка доступна')
          } else {
            log('warn', 'Install · заблокирована')
          }
        },
      ],
      () => {
        setFinished(true)
        setBusy(false)
        if (!ready) {
          log('info', `Не пройдено: ${steps.filter((s) => s === 'sw' || s === 'install').join(', ')}`)
        }
      },
    )
  }

  return (
    <JsLabShell
      title="От сайта к установляемому приложению"
      lead="PWA складывается из manifest, secure context и Service Worker: манифест задаёт оболочку, SW — офлайн после установки."
      code={
        <div className={shell.codePane}>
          <PatternSwitch value={pattern} onChange={switchPattern} />
          <InteractiveCodePanel
            topicId={TOPIC_ID}
            intro={CODE_INTRO[pattern]}
            snippets={CODE_SNIPPETS[pattern]}
          />
        </div>
      }
      problem={
        <ProblemPanel
          pattern={pattern}
          caseId={caseId}
          phase={phase}
          activeStep={activeStep}
          busy={busy}
          finished={finished}
          lines={lines}
          onPatternChange={switchPattern}
          onCaseChange={switchCase}
          onRun={run}
          onReset={reset}
        />
      }
    />
  )
}

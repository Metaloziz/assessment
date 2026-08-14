import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useRef,
  useState,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
} from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactCompoundComponentsLab.module.css'

const TOPIC_ID = '193-react-compound-components'
const STEP = 0.6

type CaseId = 'compound' | 'clone' | 'items'
type Phase = 'idle' | 'run' | 'done'
type TabId = 'profile' | 'alerts'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'compound', label: 'Context' },
  { id: 'clone', label: 'cloneElement' },
  { id: 'items', label: 'items[]' },
]

const CODE_INTRO: Record<CaseId, string> = {
  compound: '`Tabs` — `Provider`; `Tab` / `Panel` читают `active` через `useContext`. Между ними — своя разметка.',
  clone: '`Children.map` + `cloneElement` впрыскивает props только прямым детям — обёртка ломает связь.',
  items: 'Закрытый `items[]`: список и панели рисует сам виджет, слота «между» нет.',
}

const SNIPPET_TABS_CTX: InteractiveSnippet = {
  id: 'tabs-context',
  label: 'src/ui/Tabs.tsx',
  note: 'Узкий `Context` внутри виджета; дети не ждут `active` снаружи.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { createContext, useContext, useState, type ReactNode } from 'react';

type TabsValue = { active: string; setActive: (id: string) => void };
const TabsContext = createContext<TabsValue | null>(null);

type TabsProps = { defaultId: string; children: ReactNode };

export const Tabs = ({ defaultId, children }: TabsProps) => {
  const [active, setActive] = useState(defaultId);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      {children} {/* ← композиция вызывающего */}
    </TabsContext.Provider>
  );
};

type TabProps = { id: string; children: ReactNode };

export const Tab = ({ id, children }: TabProps) => {
  const ctx = useContext(TabsContext); // ← не props с App
  if (!ctx) return <button type="button" disabled>{children}</button>;
  return (
    <button
      type="button"
      aria-selected={ctx.active === id}
      onClick={() => ctx.setActive(id)}
    >
      {children}
    </button>
  );
};

type PanelProps = { id: string; children: ReactNode };

export const Panel = ({ id, children }: PanelProps) => {
  const ctx = useContext(TabsContext);
  if (!ctx || ctx.active !== id) return null;
  return <div>{children}</div>;
};

Tabs.Tab = Tab;
Tabs.Panel = Panel;`,
}

const SNIPPET_SETTINGS_CTX: InteractiveSnippet = {
  id: 'settings-compound',
  label: 'src/settings/Settings.tsx',
  note: 'Бейдж стоит между списком и панелью — слот есть, потому что это JSX.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Tabs } from '../ui/Tabs';

export const Settings = () => (
  <Tabs defaultId="profile">
    <div className="tabList">
      <Tabs.Tab id="profile">Профиль</Tabs.Tab>
      <Tabs.Tab id="alerts">Уведомления</Tabs.Tab>
    </div>
    <span className="chip">beta</span> {/* ← между List и Panel */}
    <Tabs.Panel id="profile">Имя · email</Tabs.Panel>
    <Tabs.Panel id="alerts">Письма и пуши</Tabs.Panel>
  </Tabs>
);`,
}

const SNIPPET_TABS_CLONE: InteractiveSnippet = {
  id: 'tabs-clone',
  label: 'src/ui/Tabs.tsx',
  note: '`cloneElement` видит только прямых детей родителя.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Children, cloneElement, isValidElement, useState } from 'react';

type TabsProps = { defaultId: string; children: React.ReactNode };

export const Tabs = ({ defaultId, children }: TabsProps) => {
  const [active, setActive] = useState(defaultId);

  // ═══════════════════════════════════════════
  // CLONE ← впрыск только прямым детям
  // ═══════════════════════════════════════════
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child, { active, onSelect: setActive });
  });
};

type TabProps = {
  id: string;
  children: React.ReactNode;
  active?: string;
  onSelect?: (id: string) => void;
};

export const Tab = ({ id, children, active, onSelect }: TabProps) => (
  <button
    type="button"
    aria-selected={active === id}
    disabled={!onSelect}
    onClick={() => onSelect?.(id)}
  >
    {children}
  </button>
);`,
}

const SNIPPET_SETTINGS_CLONE: InteractiveSnippet = {
  id: 'settings-clone',
  label: 'src/settings/Settings.tsx',
  note: 'Обёртка `tabRow` получает props; `Tab` остаётся без `onSelect`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Tabs, Tab, Panel } from '../ui/Tabs';

export const Settings = () => (
  <Tabs defaultId="profile">
    <div className="tabRow"> {/* ← cloneElement впрыскивает сюда */}
      <Tab id="profile">Профиль</Tab>
      <Tab id="alerts">Уведомления</Tab>
    </div>
    <Panel id="profile">Имя · email</Panel>
    <Panel id="alerts">Письма и пуши</Panel>
  </Tabs>
);`,
}

const SNIPPET_TABS_ITEMS: InteractiveSnippet = {
  id: 'tabs-items',
  label: 'src/ui/Tabs.tsx',
  note: 'Виджет сам рисует список и панели из массива — layout закрыт.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState, type ReactNode } from 'react';

type Item = { id: string; label: string; panel: ReactNode };

type Props = { items: Item[]; defaultId: string };

export const Tabs = ({ items, defaultId }: Props) => {
  const [active, setActive] = useState(defaultId);
  const current = items.find((item) => item.id === active);

  // ═══════════════════════════════════════════
  // ITEMS ← нет слота между списком и панелью
  // ═══════════════════════════════════════════
  return (
    <div>
      <div className="tabList">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-selected={active === item.id}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div>{current?.panel}</div>
    </div>
  );
};`,
}

const SNIPPET_SETTINGS_ITEMS: InteractiveSnippet = {
  id: 'settings-items',
  label: 'src/settings/Settings.tsx',
  note: '`beta` можно поставить только рядом с виджетом, не между вкладками и панелью.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Tabs } from '../ui/Tabs';

export const Settings = () => (
  <section>
    <header>
      <h1>Настройки</h1>
      <span className="chip">beta</span> {/* ← только снаружи */}
    </header>
    <Tabs
      defaultId="profile"
      items={[
        { id: 'profile', label: 'Профиль', panel: 'Имя · email' },
        { id: 'alerts', label: 'Уведомления', panel: 'Письма и пуши' },
      ]}
    />
  </section>
);`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  compound: [SNIPPET_TABS_CTX, SNIPPET_SETTINGS_CTX],
  clone: [SNIPPET_TABS_CLONE, SNIPPET_SETTINGS_CLONE],
  items: [SNIPPET_TABS_ITEMS, SNIPPET_SETTINGS_ITEMS],
}

const PAIN: ReactNode = (
  <>
    Виджет вроде вкладок должен делить <code>active</code> между детьми и оставить layout вызывающему. Закрытый{' '}
    <code>items[]</code> и <code>cloneElement</code> это ломают по-разному.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  compound: (
    <>
      <code>Tabs</code> через <code>Context</code>: бейдж стоит между списком и <code>Panel</code>, вкладки переключаются.
    </>
  ),
  clone: (
    <>
      <code>cloneElement</code> отдаёт <code>onSelect</code> обёртке <code>tabRow</code> — <code>Tab</code> не связан.
    </>
  ),
  items: (
    <>
      <code>items[]</code> рисует список и панели сам: <code>beta</code> помещается только в шапку карточки.
    </>
  ),
}

type TabsValue = { active: TabId; setActive: (id: TabId) => void }

const TabsCtx = createContext<TabsValue | null>(null)

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playTimeline = (
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) => {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

const PANELS: Record<TabId, { title: string; lead: string }> = {
  profile: { title: 'Профиль', lead: 'Имя · email' },
  alerts: { title: 'Уведомления', lead: 'Письма и пуши' },
}

const CtxTab = ({
  id,
  children,
  flash,
  disabled,
}: {
  id: TabId
  children: ReactNode
  flash: boolean
  disabled: boolean
}) => {
  const ctx = useContext(TabsCtx)
  const selected = ctx?.active === id
  return (
    <button
      type="button"
      className={[
        styles.tab,
        selected ? styles.tabActive : '',
        flash ? styles.tabFlash : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-selected={selected}
      disabled={disabled || !ctx}
      onClick={() => ctx?.setActive(id)}
    >
      {children}
    </button>
  )
}

const CtxPanel = ({ id }: { id: TabId }) => {
  const ctx = useContext(TabsCtx)
  if (!ctx || ctx.active !== id) return null
  const panel = PANELS[id]
  return (
    <div className={styles.panel}>
      <p className={styles.panelTitle}>{panel.title}</p>
      <p className={styles.panelLead}>{panel.lead}</p>
    </div>
  )
}

type CloneInjected = { active: TabId; onSelect: (id: TabId) => void }

const CloneTab = ({
  id,
  children,
  active,
  onSelect,
  flash,
}: {
  id: TabId
  children: ReactNode
  active?: TabId
  onSelect?: (id: TabId) => void
  flash?: boolean
}) => {
  const selected = onSelect != null && active === id
  return (
    <button
      type="button"
      className={[
        styles.tab,
        selected ? styles.tabActive : '',
        onSelect == null ? styles.tabDead : '',
        flash ? styles.tabFlash : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-selected={selected}
      disabled={!onSelect}
      onClick={() => onSelect?.(id)}
    >
      {children}
    </button>
  )
}

const ClonePanel = ({
  id,
  active,
  children,
}: {
  id: TabId
  active?: TabId
  children: ReactNode
} & Partial<Pick<CloneInjected, 'onSelect'>>) => {
  if (active !== id) return null
  return <div className={styles.panel}>{children}</div>
}

const CloneRow = ({
  children,
  flash,
  rowRef,
}: {
  children: ReactNode
  flash: boolean
  rowRef: MutableRefObject<HTMLDivElement | null>
} & Partial<CloneInjected>) => (
  <div
    ref={rowRef}
    className={[styles.tabWrap, flash ? styles.tabWrapFlash : ''].filter(Boolean).join(' ')}
  >
    {children}
  </div>
)

const CloneTabs = ({
  active,
  onSelect,
  flash,
  tabFlash,
  rowRef,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  flash: boolean
  tabFlash: TabId | null
  rowRef: MutableRefObject<HTMLDivElement | null>
}) => {
  const children = [
    <CloneRow key="row" flash={flash} rowRef={rowRef}>
      <CloneTab id="profile" flash={tabFlash === 'profile'}>
        Профиль
      </CloneTab>
      <CloneTab id="alerts" flash={tabFlash === 'alerts'}>
        Уведомления
      </CloneTab>
    </CloneRow>,
    <ClonePanel key="profile" id="profile">
      <p className={styles.panelTitle}>{PANELS.profile.title}</p>
      <p className={styles.panelLead}>{PANELS.profile.lead}</p>
    </ClonePanel>,
    <ClonePanel key="alerts" id="alerts">
      <p className={styles.panelTitle}>{PANELS.alerts.title}</p>
      <p className={styles.panelLead}>{PANELS.alerts.lead}</p>
    </ClonePanel>,
  ]

  return (
    <>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child
        return cloneElement(child as ReactElement<Partial<CloneInjected>>, {
          active,
          onSelect,
        })
      })}
    </>
  )
}

const Chip = ({
  tone,
  chipRef,
}: {
  tone: 'ok' | 'warn'
  chipRef: MutableRefObject<HTMLSpanElement | null>
}) => (
  <span
    ref={chipRef}
    className={[styles.chip, tone === 'warn' ? styles.chipWarn : ''].filter(Boolean).join(' ')}
  >
    beta
  </span>
)

type VizProps = {
  caseId: CaseId
  phase: Phase
  active: TabId
  chipVisible: boolean
  wrapFlash: boolean
  tabFlash: TabId | null
  busy: boolean
  onSelect: (id: TabId) => void
  chipRef: MutableRefObject<HTMLSpanElement | null>
  wrapRef: MutableRefObject<HTMLDivElement | null>
}

const CompoundLiveViz = ({
  caseId,
  phase,
  active,
  chipVisible,
  wrapFlash,
  tabFlash,
  busy,
  onSelect,
  chipRef,
  wrapRef,
}: VizProps) => {
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : caseId === 'compound'
        ? 'Context · слот между'
        : caseId === 'clone'
          ? 'cloneElement · обёртка'
          : 'items[] · слот снаружи'

  const receipt =
    caseId === 'compound'
      ? 'Tabs.Provider → Tab / Panel · chip ∈ JSX'
      : caseId === 'clone'
        ? 'cloneElement → tabRow · Tab без onSelect'
        : 'items[] · chip ∈ header'

  const cardTone = phase === 'done' ? (caseId === 'compound' ? styles.cardOk : styles.cardWarn) : ''

  const itemsTabs = (
    <>
      <div className={styles.tabList}>
        {(['profile', 'alerts'] as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={[
              styles.tab,
              active === id ? styles.tabActive : '',
              tabFlash === id ? styles.tabFlash : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-selected={active === id}
            disabled={busy}
            onClick={() => onSelect(id)}
          >
            {id === 'profile' ? 'Профиль' : 'Уведомления'}
          </button>
        ))}
      </div>
      <div className={styles.panel}>
        <p className={styles.panelTitle}>{PANELS[active].title}</p>
        <p className={styles.panelLead}>{PANELS[active].lead}</p>
      </div>
    </>
  )

  const body =
    caseId === 'compound' ? (
      <TabsCtx.Provider value={{ active, setActive: onSelect }}>
        <div className={styles.tabList}>
          <CtxTab id="profile" flash={tabFlash === 'profile'} disabled={busy}>
            Профиль
          </CtxTab>
          <CtxTab id="alerts" flash={tabFlash === 'alerts'} disabled={busy}>
            Уведомления
          </CtxTab>
        </div>
        {chipVisible ? <Chip tone="ok" chipRef={chipRef} /> : null}
        <CtxPanel id="profile" />
        <CtxPanel id="alerts" />
      </TabsCtx.Provider>
    ) : caseId === 'clone' ? (
      <CloneTabs
        active={active}
        onSelect={onSelect}
        flash={wrapFlash}
        tabFlash={tabFlash}
        rowRef={wrapRef}
      />
    ) : (
      itemsTabs
    )

  return (
    <LabVizPanel title="Настройки" meta={meta}>
      <div className={styles.stage}>
        <section className={[styles.card, cardTone].filter(Boolean).join(' ')}>
          <header className={styles.header}>
            <div className={styles.brand}>
              <span className={styles.brandMark} aria-hidden />
              <strong>Настройки</strong>
            </div>
            {caseId === 'items' && chipVisible ? (
              <div className={styles.headerExtra}>
                <Chip tone="warn" chipRef={chipRef} />
              </div>
            ) : null}
          </header>
          <div className={styles.body}>{body}</div>
        </section>
        <p className={styles.receipt}>{receipt}</p>
      </div>
    </LabVizPanel>
  )
}

export const ReactCompoundComponentsLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('compound')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [active, setActive] = useState<TabId>('profile')
  const [chipVisible, setChipVisible] = useState(false)
  const [wrapFlash, setWrapFlash] = useState(false)
  const [tabFlash, setTabFlash] = useState<TabId | null>(null)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const chipRef = useRef<HTMLSpanElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setActive('profile')
    setChipVisible(false)
    setWrapFlash(false)
    setTabFlash(null)
    if (chipRef.current) gsap.set(chipRef.current, { clearProps: 'transform,opacity' })
    if (wrapRef.current) gsap.set(wrapRef.current, { clearProps: 'transform' })
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const finishCase = (id: CaseId) => {
    setPhase('done')
    setTabFlash(null)
    if (id === 'compound') {
      log('ok', 'chip между List и Panel · active=alerts')
      setHint('Context связывает Tab/Panel; JSX оставляет слот вызывающему')
    } else if (id === 'clone') {
      log('warn', 'onSelect ушёл в tabRow · Tab без связи')
      setHint('cloneElement не проходит через обёртку')
    } else {
      log('warn', 'beta в header · слота между списком и панелью нет')
      setHint('items[] закрывает layout виджета')
    }
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    setPhase('run')

    if (caseId === 'compound') {
      playTimeline(
        tlRef,
        [
          () => {
            setChipVisible(true)
            log('info', 'Tabs Provider · active=profile')
          },
          () => {
            log('ok', 'chip ∈ JSX между Tab и Panel')
          },
          () => {
            setActive('alerts')
            setTabFlash('alerts')
            finishCase('compound')
          },
        ],
        (tl) => {
          tl.call(
            () => {
              const el = chipRef.current
              if (!el) return
              gsap.fromTo(el, { opacity: 0.4, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' })
            },
            undefined,
            0.08,
          )
        },
        () => setBusy(false),
      )
      return
    }

    if (caseId === 'clone') {
      playTimeline(
        tlRef,
        [
          () => {
            log('info', 'cloneElement → прямые дети Tabs')
          },
          () => {
            setWrapFlash(true)
            log('warn', 'props → tabRow, не Tab')
          },
          () => {
            setTabFlash('alerts')
            finishCase('clone')
          },
        ],
        (tl) => {
          tl.call(
            () => {
              const el = wrapRef.current
              if (!el) return
              gsap.fromTo(el, { y: 3 }, { y: 0, duration: 0.5, ease: 'power2.inOut' })
            },
            undefined,
            STEP + 0.08,
          )
        },
        () => setBusy(false),
      )
      return
    }

    playTimeline(
      tlRef,
      [
        () => {
          setChipVisible(true)
          log('info', 'Tabs items[] · layout внутри виджета')
        },
        () => {
          log('warn', 'chip только в header')
        },
        () => {
          setActive('alerts')
          setTabFlash('alerts')
          finishCase('items')
        },
      ],
      (tl) => {
        tl.call(
          () => {
            const el = chipRef.current
            if (!el) return
            gsap.fromTo(el, { opacity: 0.4, y: -4 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' })
          },
          undefined,
          0.08,
        )
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('compound')
    resetViz()
  }

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

      <CompoundLiveViz
        caseId={caseId}
        phase={phase}
        active={active}
        chipVisible={chipVisible}
        wrapFlash={wrapFlash}
        tabFlash={tabFlash}
        busy={busy}
        onSelect={(id) => {
          if (busy || caseId === 'clone') return
          setActive(id)
        }}
        chipRef={chipRef}
        wrapRef={wrapRef}
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
    <div className={styles.codePane}>
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
      title="Compound components"
      lead="Живой стенд: вкладки через внутренний `Context`, хрупкий `cloneElement` и закрытый `items[]`."
      problem={problem}
      code={code}
    />
  )
}

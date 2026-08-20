import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactCompoundComponentsLab.module.css'

const TOPIC_ID = '193-react-compound-components'

type CaseId = 'fixed' | 'compound'
type Phase = 'idle' | 'ready'
type TabId = 'buns' | 'cakes'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'fixed', label: 'без паттерна' },
  { id: 'compound', label: 'compound' },
]

const TREE: Record<CaseId, string> = {
  fixed: `<Bakery>
  <header>
    <h1>Булочная «Утро»</h1>
    <span>с печи</span>     ← только в шапке
  </header>
  <Tabs items={[…]} />    ← меню и карточка внутри
</Bakery>`,
  compound: `<Tabs>                      ← Provider
  <Tabs.Tab>Булки</Tabs.Tab>
  <Tabs.Tab>Сладкое</Tabs.Tab>
  <span>с печи</span>        ← слот между частями
  <Tabs.Panel>…</Tabs.Panel>
</Tabs>`,
}

const CODE_INTRO: Record<CaseId, string> = {
  fixed: 'Закрытый `items[]`: виджет сам рисует меню и карточку — бейдж «с печи» только в шапке.',
  compound: '`Tabs` — `Provider`; вкладки меню читают `active`. Между ними — бейдж как обычный JSX.',
}

const SNIPPET_TABS_FIXED: InteractiveSnippet = {
  id: 'tabs-items',
  label: 'src/ui/Tabs.tsx',
  note: 'Layout закрыт: слота между меню и карточкой нет.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState, type ReactNode } from 'react';

type Item = { id: string; label: string; panel: ReactNode };
type Props = { items: Item[]; defaultId: string };

export const Tabs = ({ items, defaultId }: Props) => {
  const [active, setActive] = useState(defaultId);
  const current = items.find((item) => item.id === active);

  // ═══════════════════════════════════════════
  // FIXED ← меню и карточку рисует сам виджет
  // ═══════════════════════════════════════════
  return (
    <div>
      <div className="tabList">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => setActive(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div>{current?.panel}</div>
    </div>
  );
};`,
}

const SNIPPET_BAKERY_FIXED: InteractiveSnippet = {
  id: 'bakery-fixed',
  label: 'src/bakery/Menu.tsx',
  note: '«с печи» только в шапке — внутрь `Tabs` вставить нельзя.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Tabs } from '../ui/Tabs';

export const Menu = () => (
  <section>
    <header>
      <h1>Булочная «Утро»</h1>
      <span className="chip">с печи</span> {/* ← только снаружи */}
    </header>
    <Tabs
      defaultId="buns"
      items={[
        { id: 'buns', label: 'Булки', panel: 'Багет · чиабатта · булочка' },
        { id: 'cakes', label: 'Сладкое', panel: 'Круассан · булочка с корицей' },
      ]}
    />
  </section>
);`,
}

const SNIPPET_TABS_COMPOUND: InteractiveSnippet = {
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
      {children} {/* ← разметку решает вызывающий */}
    </TabsContext.Provider>
  );
};

type TabProps = { id: string; children: ReactNode };

export const Tab = ({ id, children }: TabProps) => {
  const ctx = useContext(TabsContext); // ← не props из App
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

const SNIPPET_BAKERY_COMPOUND: InteractiveSnippet = {
  id: 'bakery-compound',
  label: 'src/bakery/Menu.tsx',
  note: 'Бейдж «с печи» между меню и карточкой — обычный JSX-слот.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { Tabs } from '../ui/Tabs';

export const Menu = () => (
  <Tabs defaultId="buns">
    <div className="tabList">
      <Tabs.Tab id="buns">Булки</Tabs.Tab>
      <Tabs.Tab id="cakes">Сладкое</Tabs.Tab>
    </div>
    <span className="chip">с печи</span> {/* ← между Tab и Panel */}
    <Tabs.Panel id="buns">Багет · чиабатта · булочка</Tabs.Panel>
    <Tabs.Panel id="cakes">Круассан · булочка с корицей</Tabs.Panel>
  </Tabs>
);`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  fixed: [SNIPPET_TABS_FIXED, SNIPPET_BAKERY_FIXED],
  compound: [SNIPPET_TABS_COMPOUND, SNIPPET_BAKERY_COMPOUND],
}

const PAIN: ReactNode = (
  <>
    Меню булочной должно делить активный раздел и оставить место под бейдж «с печи». Закрытый{' '}
    <code>items[]</code> и compound через <code>Context</code> решают это по-разному.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  fixed: (
    <>
      <strong>Запустить</strong> — витрина и живое меню. «с печи» только в шапке; внутрь виджета слота нет.
    </>
  ),
  compound: (
    <>
      <strong>Запустить</strong> — дерево и витрина. «с печи» между вкладками и карточкой; переключай меню.
    </>
  ),
}

const PANELS: Record<TabId, { title: string; lead: string; price: string }> = {
  buns: { title: 'Булки', lead: 'Багет · чиабатта · булочка', price: 'от 45 ₽' },
  cakes: { title: 'Сладкое', lead: 'Круассан · булочка с корицей', price: 'от 90 ₽' },
}

const TAB_LABEL: Record<TabId, string> = {
  buns: 'Булки',
  cakes: 'Сладкое',
}

type TabsValue = { active: TabId; setActive: (id: TabId) => void }

const TabsCtx = createContext<TabsValue | null>(null)

const CtxTab = ({ id, children }: { id: TabId; children: ReactNode }) => {
  const ctx = useContext(TabsCtx)
  const selected = ctx?.active === id
  return (
    <button
      type="button"
      className={[styles.tab, selected ? styles.tabActive : ''].filter(Boolean).join(' ')}
      aria-selected={selected}
      disabled={!ctx}
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
      <div className={styles.panelTop}>
        <p className={styles.panelTitle}>{panel.title}</p>
        <span className={styles.price}>{panel.price}</span>
      </div>
      <p className={styles.panelLead}>{panel.lead}</p>
    </div>
  )
}

const Chip = ({ tone }: { tone: 'ok' | 'warn' }) => (
  <span className={[styles.chip, tone === 'warn' ? styles.chipWarn : ''].filter(Boolean).join(' ')}>
    с печи
  </span>
)

const BakeryHeader = ({ chipInHeader }: { chipInHeader?: boolean }) => (
  <header className={styles.header}>
    <div className={styles.brand}>
      <span className={styles.brandMark} aria-hidden />
      <div className={styles.brandText}>
        <strong>Булочная «Утро»</strong>
        <span className={styles.brandSub}>витрина на сегодня</span>
      </div>
    </div>
    {chipInHeader ? (
      <div className={styles.headerExtra}>
        <Chip tone="warn" />
      </div>
    ) : null}
  </header>
)

const FixedMount = ({
  active,
  onSelect,
  onInteract,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  onInteract: () => void
}) => (
  <section className={styles.card}>
    <BakeryHeader chipInHeader />
    <div className={styles.body}>
      <div className={styles.tabList}>
        {(['buns', 'cakes'] as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={[styles.tab, active === id ? styles.tabActive : ''].filter(Boolean).join(' ')}
            aria-selected={active === id}
            onClick={() => {
              onSelect(id)
              onInteract()
            }}
          >
            {TAB_LABEL[id]}
          </button>
        ))}
      </div>
      <div className={styles.panel}>
        <div className={styles.panelTop}>
          <p className={styles.panelTitle}>{PANELS[active].title}</p>
          <span className={styles.price}>{PANELS[active].price}</span>
        </div>
        <p className={styles.panelLead}>{PANELS[active].lead}</p>
      </div>
    </div>
  </section>
)

const CompoundMount = ({
  active,
  onSelect,
  onInteract,
}: {
  active: TabId
  onSelect: (id: TabId) => void
  onInteract: () => void
}) => (
  <section className={styles.card}>
    <BakeryHeader />
    <div className={styles.body}>
      <TabsCtx.Provider
        value={{
          active,
          setActive: (id) => {
            onSelect(id)
            onInteract()
          },
        }}
      >
        <div className={styles.tabList}>
          <CtxTab id="buns">Булки</CtxTab>
          <CtxTab id="cakes">Сладкое</CtxTab>
        </div>
        <Chip tone="ok" />
        <CtxPanel id="buns" />
        <CtxPanel id="cakes" />
      </TabsCtx.Provider>
    </div>
  </section>
)

export const ReactCompoundComponentsLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('fixed')
  const [phase, setPhase] = useState<Phase>('idle')
  const [active, setActive] = useState<TabId>('buns')
  const [hint, setHint] = useState<string | null>(null)
  const [interacted, setInteracted] = useState(false)

  const selectCase = (next: CaseId) => {
    setCaseId(next)
    clear()
    setPhase('idle')
    setActive('buns')
    setHint(null)
    setInteracted(false)
  }

  const run = () => {
    clear()
    setActive('buns')
    setInteracted(false)
    setPhase('ready')

    if (caseId === 'fixed') {
      log('info', 'items[] · меню и карточку рисует виджет')
      log('warn', '«с печи» только в шапке · слота между частями нет')
      setHint('переключи меню — бейдж остаётся в шапке витрины')
    } else {
      log('info', 'Tabs Provider · вкладки читают Context')
      log('ok', '«с печи» между меню и карточкой · слот в JSX')
      setHint('переключи меню — бейдж остаётся между частями')
    }
  }

  const reset = () => {
    clear()
    setCaseId('fixed')
    setPhase('idle')
    setActive('buns')
    setHint(null)
    setInteracted(false)
  }

  const onInteract = () => {
    if (interacted) return
    setInteracted(true)
    if (caseId === 'fixed') {
      log('ok', 'меню живое · «с печи» по-прежнему в шапке')
      setHint('без паттерна layout закрыт — бейдж нельзя вставить между частями')
    } else {
      log('ok', 'меню живое · «с печи» между Tab и Panel')
      setHint('compound: Context связывает части, JSX оставляет слот')
    }
  }

  const meta =
    phase === 'idle'
      ? 'ожидание'
      : caseId === 'fixed'
        ? 'items[] · бейдж в шапке'
        : 'Context · бейдж в слоте'

  const problem = (
    <div className={shell.panel}>
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

      <LabVizPanel title="Булочная «Утро»" meta={meta}>
        <div className={styles.stage}>
          {phase === 'ready' ? (
            <pre className={styles.treePreview} tabIndex={0}>
              {TREE[caseId]}
            </pre>
          ) : (
            <p className={styles.placeholder}>дерево разметки появится после запуска</p>
          )}

          <div
            className={[styles.mount, phase === 'ready' ? styles.mountLive : '']
              .filter(Boolean)
              .join(' ')}
            data-empty={phase === 'idle' ? 'true' : undefined}
          >
            {phase === 'ready' ? (
              caseId === 'fixed' ? (
                <FixedMount active={active} onSelect={setActive} onInteract={onInteract} />
              ) : (
                <CompoundMount active={active} onSelect={setActive} onInteract={onInteract} />
              )
            ) : null}
          </div>
          {phase === 'idle' ? <p className={styles.mountHint}>витрина пуста до запуска</p> : null}
        </div>
      </LabVizPanel>

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
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
      title="Compound components"
      lead="Витрина булочной: закрытый `items[]` vs compound через `Context` — дерево разметки и живое меню."
      problem={problem}
      code={code}
    />
  )
}

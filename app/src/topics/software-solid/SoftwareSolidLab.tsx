import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './SoftwareSolidLab.module.css'

const TOPIC_ID = '256-software-solid'
const STEP = 0.65

type Principle = 'srp' | 'ocp' | 'lsp' | 'isp' | 'dip'
type SrpCase = 'god' | 'split'
type OcpCase = 'sw' | 'plugin'
type LspCase = 'square' | 'shape'
type IspCase = 'fat' | 'thin'
type DipCase = 'concrete' | 'invert'
type CaseId = SrpCase | OcpCase | LspCase | IspCase | DipCase

type Phase = 'idle' | 'hit' | 'apply' | 'done'

const PRINCIPLES: Array<{ id: Principle; label: string }> = [
  { id: 'srp', label: 'SRP' },
  { id: 'ocp', label: 'OCP' },
  { id: 'lsp', label: 'LSP' },
  { id: 'isp', label: 'ISP' },
  { id: 'dip', label: 'DIP' },
]

const CASES: Record<Principle, Array<{ id: CaseId; label: string }>> = {
  srp: [
    { id: 'god', label: 'Бог-модуль' },
    { id: 'split', label: 'Два модуля' },
  ],
  ocp: [
    { id: 'sw', label: 'switch' },
    { id: 'plugin', label: 'плагин' },
  ],
  lsp: [
    { id: 'square', label: 'Square как Rect' },
    { id: 'shape', label: 'Shape.area' },
  ],
  isp: [
    { id: 'fat', label: 'Толстый Worker' },
    { id: 'thin', label: 'Runnable' },
  ],
  dip: [
    { id: 'concrete', label: 'Импорт Postgres' },
    { id: 'invert', label: 'Порт Store' },
  ],
}

const CODE_INTRO: Record<Principle, string> = {
  srp: 'SRP: смена НДС не должна трогать PDF. Цена и счёт — в разных файлах.',
  ocp: 'OCP: новый Paypal — новый объект с `pay`. Старый `checkout` не правят.',
  lsp: 'LSP: код ждал площадь 20, а «квадрат как прямоугольник» дал сюрприз. Честный договор — `area()`.',
  isp: 'ISP: ping зовёт только `run`. Пустые `persist` / `notify` не нужны.',
  dip: 'DIP: отчёт зависит от договора `Store`, а не от `postgresStore`.',
}

const CODE_SNIPPETS: Record<Principle, InteractiveSnippet[]> = {
  srp: [
    {
      id: 'god-order',
      label: 'src/orders/godOrder.ts',
      note: 'Два дела в одном объекте: НДС и макет счёта.',
      executable: false,
      languageLabel: 'ts',
      code: `type Item = { price: number };

// ═══════════════════════════════════════════
// GOD ← цена и PDF в одном модуле
// ═══════════════════════════════════════════
export function createOrderService() {
  return {
    quote(items: Item[]) {
      const net = items.reduce((s, i) => s + i.price, 0);
      return net * 1.2; // ← НДС
    },
    invoicePdf(orderId: string, total: number) {
      return \`%PDF \${orderId} \${total}\`; // ← второй повод менять
    },
  };
}

// смена ставки НДС правит файл, где живёт макет счёта`,
    },
    {
      id: 'price-policy',
      label: 'src/orders/pricePolicy.ts',
      note: '`quoteWithVat` — только цена; PDF лежит в другом файле.',
      executable: false,
      languageLabel: 'ts',
      code: `type Item = { price: number };

// ═══════════════════════════════════════════
// SRP ← один повод: формула цены
// ═══════════════════════════════════════════
export function quoteWithVat(items: Item[], vat = 0.2) {
  const net = items.reduce((s, i) => s + i.price, 0);
  return net * (1 + vat); // ← только НДС
}

// --- src/orders/invoicePdf.ts ---
export function invoicePdf(orderId: string, total: number) {
  return \`%PDF \${orderId} \${total}\`; // ← другой файл, другой повод менять
}`,
    },
  ],
  ocp: [
    {
      id: 'pay-switch',
      label: 'src/checkout/paySwitch.ts',
      note: 'Каждый новый канал снова правит уже работающий `switch`.',
      executable: false,
      languageLabel: 'ts',
      code: `async function chargeCard(amount: number) {
  return { ok: true as const, amount, channel: 'card' };
}
async function chargePaypal(amount: number) {
  return { ok: true as const, amount, channel: 'paypal' };
}

// ═══════════════════════════════════════════
// SWITCH ← правка уже работающего checkout
// ═══════════════════════════════════════════
export async function pay(channel: string, amount: number) {
  switch (channel) {
    case 'card':
      return chargeCard(amount);
    case 'paypal':
      return chargePaypal(amount); // ← новый канал = правка этого файла
    default:
      throw new Error(\`unknown: \${channel}\`);
  }
}`,
    },
    {
      id: 'pay-method',
      label: 'src/checkout/payMethod.ts',
      note: '`checkout` зовёт `method.pay`; Paypal — отдельный новый объект.',
      executable: false,
      languageLabel: 'ts',
      code: `export type PayMethod = { pay: (amount: number) => Promise<{ ok: true; amount: number }> };

export function checkout(method: PayMethod, amount: number) {
  return method.pay(amount); // ← OCP: Checkout не знает каналы
}

export const cardMethod: PayMethod = {
  pay: async (amount) => ({ ok: true, amount }),
};

// ═══════════════════════════════════════════
// PLUGIN ← новый кусок, checkout цел
// ═══════════════════════════════════════════
export const paypalMethod: PayMethod = {
  pay: async (amount) => ({ ok: true, amount }), // ← Paypal здесь
};

// checkout(paypalMethod, 1500)`,
    },
  ],
  lsp: [
    {
      id: 'rect-square',
      label: 'src/geo/rectangleSquare.ts',
      note: '`setWidth` у Square меняет и высоту — ожидание площади ломается.',
      executable: false,
      languageLabel: 'ts',
      code: `type Rect = { w: number; h: number; kind: 'rect' | 'square' };

function setWidth(r: Rect, w: number): Rect {
  if (r.kind === 'square') return { ...r, w, h: w }; // ← LSP: h тоже
  return { ...r, w };
}

function setHeight(r: Rect, h: number): Rect {
  if (r.kind === 'square') return { ...r, w: h, h };
  return { ...r, h };
}

// ═══════════════════════════════════════════
// STRETCH ← клиент ждал независимые w/h
// ═══════════════════════════════════════════
export function stretch(r: Rect) {
  const a = setWidth(r, 5);
  const b = setHeight(a, 4);
  return b.w * b.h; // Rect → 20; Square → 16
}

// stretch({ w: 1, h: 1, kind: 'square' }) !== 20`,
    },
    {
      id: 'shape-area',
      label: 'src/geo/shape.ts',
      note: 'Общий `area()` — без обещания «ширина и высота независимы».',
      executable: false,
      languageLabel: 'ts',
      code: `export type Shape = { area: () => number };

// ═══════════════════════════════════════════
// LSP ← подстановка по area(), не по setWidth
// ═══════════════════════════════════════════
export const rectangle = (w: number, h: number): Shape => ({
  area: () => w * h,
});

export const square = (side: number): Shape => ({
  area: () => side * side, // ← тот же договор area()
});

export function totalArea(shapes: Shape[]) {
  return shapes.reduce((s, sh) => s + sh.area(), 0); // ← клиент не знает kind
}

// totalArea([rectangle(5, 4), square(4)]) === 36`,
    },
  ],
  isp: [
    {
      id: 'worker-fat',
      label: 'src/jobs/workerFat.ts',
      note: 'Ping вынужден писать пустые `persist` / `notify`.',
      executable: false,
      languageLabel: 'ts',
      code: `type Worker = {
  run: () => void;
  persist: () => void;
  notify: () => void;
};

function ping() {
  /* heartbeat */
}

// ═══════════════════════════════════════════
// FAT ← интерфейс чужого клиента
// ═══════════════════════════════════════════
export function createPingJob(): Worker {
  return {
    run: () => ping(),
    persist: () => {}, // ← пусто: ISP сломан
    notify: () => {},
  };
}`,
    },
    {
      id: 'runnable',
      label: 'src/jobs/runnable.ts',
      note: '`Runnable` — только то, что scheduler реально вызывает.',
      executable: false,
      languageLabel: 'ts',
      code: `export type Runnable = { run: () => void };

function ping() {
  /* heartbeat */
}

// ═══════════════════════════════════════════
// ISP ← тип только под то, что зовут
// ═══════════════════════════════════════════
export function createPingJob(): Runnable {
  return { run: () => ping() }; // ← persist/notify нет в типе
}

export function scheduler(jobs: Runnable[]) {
  for (const job of jobs) job.run();
}`,
    },
  ],
  dip: [
    {
      id: 'pg-report',
      label: 'src/report/pgReport.ts',
      note: 'Отчёт сам тянет Postgres — подменить базу сложно.',
      executable: false,
      languageLabel: 'ts',
      code: `import { postgresStore } from './postgresStore'; // ← DIP сломан: отчёт знает базу

// ═══════════════════════════════════════════
// CONCRETE ← Report знает Postgres
// ═══════════════════════════════════════════
export function createReportService() {
  return {
    users: () => postgresStore.query('select * from users'),
  };
}

// подмена MemoryStore правит этот файл`,
    },
    {
      id: 'store-port',
      label: 'src/report/store.ts',
      note: '`createReportService(store)` смотрит на договор; Postgres — снаружи.',
      executable: false,
      languageLabel: 'ts',
      code: `export type Store = { query: (sql: string) => Promise<unknown[]> };

// ═══════════════════════════════════════════
// DIP ← отчёт зависит от договора Store
// ═══════════════════════════════════════════
export function createReportService(store: Store) {
  return {
    users: () => store.query('select * from users'),
  };
}

export const postgresStore: Store = {
  query: async (sql) => [{ sql }], // ← база следует Store
};

export const memoryStore: Store = {
  query: async () => [{ id: 'stub' }],
};

// createReportService(postgresStore) — стыковка снаружи, не внутри отчёта`,
    },
  ],
}

function PrincipleSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Principle
  disabled?: boolean
  onChange: (id: Principle) => void
}) {
  return (
    <div className={shell.row}>
      {PRINCIPLES.map((p) => (
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

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, ...mods.filter(Boolean)].join(' ')
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) {
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

function pulse(el: HTMLDivElement | null, tl: gsap.core.Timeline, at: number) {
  if (!el) return
  gsap.set(el, { scale: 0.92, opacity: 0.5 })
  tl.to(el, { scale: 1, opacity: 1 }, at)
}

type VizProps = {
  phase: Phase
  packetRef: MutableRefObject<HTMLDivElement | null>
}

function SrpViz({ phase, caseId, packetRef }: VizProps & { caseId: SrpCase }) {
  const split = caseId === 'split'
  const hit = phase !== 'idle'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'
  const godWarn = !split && done

  return (
    <LabVizPanel title="Заказ" meta={split ? 'НДС трогает только цену' : 'НДС бьёт и в PDF'}>
      <div className={styles.srpCol}>
        <div
          ref={packetRef}
          className={nodeCls(styles.change, hit && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}
        >
          <span className={labVizStyles.nodeLabel}>изменение</span>
          <span className={labVizStyles.nodeSub}>ставка НДС</span>
        </div>
        <div className={`${styles.arrow} ${apply ? styles.arrowActive : ''}`}>↓</div>
        {split ? (
          <div className={styles.srpSplit}>
            <div
              className={nodeCls(
                apply && labVizStyles.nodeActive,
                done && labVizStyles.nodeOk,
              )}
            >
              <span className={labVizStyles.nodeLabel}>PricePolicy</span>
              <span className={labVizStyles.nodeSub}>{done ? 'quoteWithVat' : 'цена'}</span>
            </div>
            <div className={nodeCls(styles.nodeSkipped, done && styles.nodeSkipped)}>
              <span className={labVizStyles.nodeLabel}>InvoicePdf</span>
              <span className={labVizStyles.nodeSub}>не трогаем</span>
            </div>
          </div>
        ) : (
          <div
            className={nodeCls(
              apply && labVizStyles.nodeActive,
              godWarn && styles.nodeWarn,
            )}
          >
            <span className={labVizStyles.nodeLabel}>OrderService</span>
            <span className={labVizStyles.nodeSub}>{done ? 'цена + PDF' : 'god-модуль'}</span>
          </div>
        )}
      </div>
    </LabVizPanel>
  )
}

function OcpViz({ phase, caseId, packetRef }: VizProps & { caseId: OcpCase }) {
  const plugin = caseId === 'plugin'
  const hit = phase !== 'idle'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel title="Checkout.pay" meta={plugin ? 'новый объект рядом' : 'правка старого switch'}>
      <div className={styles.ocpRow}>
        <div
          className={nodeCls(
            hit && labVizStyles.nodeActive,
            done && (plugin ? labVizStyles.nodeOk : styles.nodeWarn),
          )}
        >
          <span className={labVizStyles.nodeLabel}>Checkout</span>
          <span className={labVizStyles.nodeSub}>{plugin ? 'method.pay' : done ? 'switch правлен' : 'switch'}</span>
        </div>
        <div
          ref={packetRef}
          className={nodeCls(
            styles.ocpSlot,
            apply && labVizStyles.nodeActive,
            done && (plugin ? labVizStyles.nodeOk : styles.nodeWarn),
          )}
        >
          <span className={labVizStyles.nodeLabel}>{plugin ? 'место' : 'case'}</span>
          <span className={labVizStyles.nodeSub}>{plugin ? 'PayMethod' : 'card | paypal'}</span>
        </div>
        <div
          className={nodeCls(
            styles.ocpNew,
            plugin ? apply && labVizStyles.nodeActive : styles.nodeSkipped,
            plugin && done && labVizStyles.nodeOk,
            !plugin && done && styles.nodeWarn,
          )}
        >
          <span className={labVizStyles.nodeLabel}>{plugin ? 'PaypalMethod' : '—'}</span>
          <span className={labVizStyles.nodeSub}>{plugin ? (done ? 'новый кусок' : 'рядом') : 'правки в Checkout'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

function LspViz({ phase, caseId, packetRef }: VizProps & { caseId: LspCase }) {
  const ok = caseId === 'shape'
  const hit = phase !== 'idle'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel title="Площадь" meta={ok ? 'честный area()' : 'квадрат как прямоугольник'}>
      <div className={styles.fork}>
        <div
          ref={packetRef}
          className={nodeCls(styles.forkTop, hit && labVizStyles.nodeActive, done && (ok ? labVizStyles.nodeOk : styles.nodeWarn))}
        >
          <span className={labVizStyles.nodeLabel}>{ok ? 'totalArea' : 'stretch'}</span>
          <span className={labVizStyles.nodeSub}>{ok ? 'shapes.area()' : 'setWidth 5, setHeight 4'}</span>
        </div>
        <div className={styles.forkLabels}>
          <span className={`${apply ? styles.forkOn : styles.forkIdle}`}>↙</span>
          <span />
          <span className={`${apply ? (ok ? styles.forkOk : styles.forkOn) : styles.forkIdle}`}>↘</span>
        </div>
        <div className={styles.forkBranch}>
          <div className={nodeCls(apply && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}>
            <span className={labVizStyles.nodeLabel}>{ok ? 'rectangle' : 'Rect'}</span>
            <span className={labVizStyles.nodeSub}>{done ? '20' : '5×4'}</span>
          </div>
        </div>
        <div className={styles.arrow}> </div>
        <div className={styles.forkBranch}>
          <div
            className={nodeCls(
              apply && labVizStyles.nodeActive,
              done && (ok ? labVizStyles.nodeOk : labVizStyles.nodeErr),
            )}
          >
            <span className={labVizStyles.nodeLabel}>{ok ? 'square' : 'Square как Rect'}</span>
            <span className={labVizStyles.nodeSub}>{done ? (ok ? '16' : '16 ≠ 20') : 'подстановка'}</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function IspViz({ phase, caseId, packetRef }: VizProps & { caseId: IspCase }) {
  const thin = caseId === 'thin'
  const hit = phase !== 'idle'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel title="Ping-задача" meta={thin ? 'только run' : 'три метода, два пустых'}>
      <div className={styles.ispCol}>
        <div
          ref={packetRef}
          className={nodeCls(styles.ispClient, hit && labVizStyles.nodeActive, done && labVizStyles.nodeOk)}
        >
          <span className={labVizStyles.nodeLabel}>scheduler</span>
          <span className={labVizStyles.nodeSub}>зовёт run()</span>
        </div>
        <div className={`${styles.arrow} ${apply ? styles.arrowActive : ''}`}>↓</div>
        <div className={styles.ispMethods}>
          <div className={nodeCls(apply && labVizStyles.nodeActive, done && labVizStyles.nodeOk, styles.method)}>
            <span className={labVizStyles.nodeLabel}>run</span>
            <span className={labVizStyles.nodeSub}>{done ? 'ping' : 'нужен'}</span>
          </div>
          <div
            className={nodeCls(
              styles.method,
              thin ? styles.nodeSkipped : apply && styles.nodeWarn,
              !thin && done && styles.nodeWarn,
            )}
          >
            <span className={labVizStyles.nodeLabel}>persist</span>
            <span className={labVizStyles.nodeSub}>{thin ? 'нет в типе' : done ? 'пусто' : 'чужой'}</span>
          </div>
          <div
            className={nodeCls(
              styles.method,
              thin ? styles.nodeSkipped : apply && styles.nodeWarn,
              !thin && done && styles.nodeWarn,
            )}
          >
            <span className={labVizStyles.nodeLabel}>notify</span>
            <span className={labVizStyles.nodeSub}>{thin ? 'нет в типе' : done ? 'пусто' : 'чужой'}</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function DipViz({ phase, caseId, packetRef }: VizProps & { caseId: DipCase }) {
  const invert = caseId === 'invert'
  const hit = phase !== 'idle'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel title="Отчёт" meta={invert ? 'договор Store' : 'напрямую Postgres'}>
      <div className={styles.fork}>
        <div
          ref={packetRef}
          className={nodeCls(
            styles.forkTop,
            hit && labVizStyles.nodeActive,
            done && (invert ? labVizStyles.nodeOk : styles.nodeWarn),
          )}
        >
          <span className={labVizStyles.nodeLabel}>ReportService</span>
          <span className={labVizStyles.nodeSub}>{invert ? 'users()' : 'import postgresStore'}</span>
        </div>
        {invert ? (
          <div
            className={nodeCls(
              styles.forkMid,
              apply && labVizStyles.nodeActive,
              done && labVizStyles.nodeOk,
            )}
          >
            <span className={labVizStyles.nodeLabel}>Store</span>
            <span className={labVizStyles.nodeSub}>query(sql)</span>
          </div>
        ) : (
          <div className={`${styles.arrow} ${styles.forkMid} ${apply ? styles.arrowActive : ''}`}>↓ без договора</div>
        )}
        <div className={styles.forkLabels}>
          <span className={`${apply ? (invert ? styles.forkOk : styles.forkOn) : styles.forkIdle}`}>
            {invert ? '↙ база' : '↙ жёстко'}
          </span>
          <span />
          <span className={`${apply ? (invert ? styles.forkOn : styles.forkIdle) : styles.forkIdle}`}>
            {invert ? '↘ память' : '↘ нет выбора'}
          </span>
        </div>
        <div className={styles.forkBranch}>
          <div
            className={nodeCls(
              apply && labVizStyles.nodeActive,
              done && (invert ? labVizStyles.nodeOk : styles.nodeWarn),
            )}
          >
            <span className={labVizStyles.nodeLabel}>PostgresStore</span>
            <span className={labVizStyles.nodeSub}>{invert ? 'следует Store' : done ? 'единственный' : 'база'}</span>
          </div>
        </div>
        <div className={styles.arrow}> </div>
        <div className={styles.forkBranch}>
          <div
            className={nodeCls(
              invert && apply && labVizStyles.nodeActive,
              invert && done && labVizStyles.nodeOk,
              !invert && styles.nodeSkipped,
            )}
          >
            <span className={labVizStyles.nodeLabel}>MemoryStore</span>
            <span className={labVizStyles.nodeSub}>{invert ? 'следует Store' : 'не подставить'}</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

const PAIN: Record<Principle, ReactNode> = {
  srp: (
    <>
      Если в одном файле и цена с НДС, и PDF счёта, смена налога трогает лишнее. Лучше: один файл —
      одна причина менять.
    </>
  ),
  ocp: (
    <>
      Новый способ оплаты лучше добавить новым объектом с <code>pay</code>, а не новой веткой в
      старом <code>switch</code>.
    </>
  ),
  lsp: (
    <>
      Если код ждёт прямоугольник, «квадрат» не должен ломать ожидания. Подмена должна быть честной.
    </>
  ),
  isp: (
    <>
      Не заставляйте простую ping-задачу писать пустые <code>persist</code> и <code>notify</code>
      только потому, что они есть в большом <code>Worker</code>.
    </>
  ),
  dip: (
    <>
      Отчёт лучше зависит от договора <code>Store</code>, а не напрямую от{' '}
      <code>postgresStore</code>. Тогда базу можно подменить.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  god: <>НДС правит <code>OrderService</code>, где рядом лежит PDF — два дела в одном файле.</>,
  split: (
    <>
      НДС попадает только в <code>PricePolicy</code>; файл с PDF не трогают.
    </>
  ),
  sw: (
    <>
      Paypal добавляют новой веткой в старый <code>switch</code> — снова правят уже работающий код.
    </>
  ),
  plugin: (
    <>
      Новый <code>PaypalMethod</code> кладут рядом; файл <code>checkout</code> не меняют.
    </>
  ),
  square: (
    <>
      Код ставит ширину 5 и высоту 4 и ждёт площадь 20 — «квадрат как прямоугольник» даёт 16.
    </>
  ),
  shape: (
    <>
      И прямоугольник, и квадрат отвечают только <code>area()</code> — без сюрпризов с шириной и
      высотой.
    </>
  ),
  fat: (
    <>
      Ping вынужден писать пустые <code>persist</code> и <code>notify</code>, чтобы подойти под
      толстый <code>Worker</code>.
    </>
  ),
  thin: (
    <>
      В типе только <code>run</code> — ровно то, что scheduler реально вызывает.
    </>
  ),
  concrete: (
    <>
      Отчёт сам импортирует Postgres — подставить Memory без правки отчёта нельзя.
    </>
  ),
  invert: (
    <>
      Postgres и Memory оба следуют договору <code>Store</code>; отчёт не знает, какая база внутри.
    </>
  ),
}

const HINT: Record<CaseId, ReactNode> = {
  god: <>Итог: один файл на два дела — налог задел и PDF.</>,
  split: <>Итог: правка НДС осталась в цене; макет счёта цел.</>,
  sw: <>Итог: новый Paypal снова открыл старый <code>pay</code>.</>,
  plugin: <>Итог: добавили новый объект, старый <code>checkout</code> не трогали.</>,
  square: <>Итог: подмена сломала ожидание площади; имя Square ни при чём.</>,
  shape: <>Итог: вызывают только <code>area()</code> — квадрат или нет, не важно.</>,
  fat: <>Итог: пустые методы показывают, что интерфейс слишком большой для ping.</>,
  thin: <>Итог: в договоре только то, что реально зовут.</>,
  concrete: <>Итог: отчёт знает Postgres напрямую — подменить сложно.</>,
  invert: <>Итог: <code>Report → Store ← Postgres | Memory</code>.</>,
}

export function SoftwareSolidLab() {
  const { lines, log, clear } = useLabLog()
  const [principle, setPrinciple] = useState<Principle>('srp')
  const [caseId, setCaseId] = useState<CaseId>('god')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState(false)
  const [busy, setBusy] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const packetRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(false)
    if (packetRef.current) gsap.set(packetRef.current, { clearProps: 'transform,opacity' })
  }

  const selectPrinciple = (next: Principle) => {
    tlRef.current?.kill()
    setBusy(false)
    setPrinciple(next)
    setCaseId(CASES[next][0]!.id)
    clear()
    resetViz()
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    const receipts: Record<CaseId, { kind: 'ok' | 'warn' | 'err'; text: string }> = {
      god: { kind: 'warn', text: 'НДС → OrderService (цена + PDF)' },
      split: { kind: 'ok', text: 'НДС → PricePolicy; InvoicePdf не тронут' },
      sw: { kind: 'warn', text: 'Paypal → правка switch в checkout' },
      plugin: { kind: 'ok', text: 'PaypalMethod рядом; checkout цел' },
      square: { kind: 'err', text: 'stretch(Square) = 16, ждали 20' },
      shape: { kind: 'ok', text: 'area() rectangle=20, square=16' },
      fat: { kind: 'warn', text: 'ping: persist() и notify() пустые' },
      thin: { kind: 'ok', text: 'scheduler → run(); других методов нет' },
      concrete: { kind: 'warn', text: 'Report import postgresStore' },
      invert: { kind: 'ok', text: 'Report → Store ← Postgres | Memory' },
    }

    playTimeline(
      tlRef,
      [
        () => setPhase('hit'),
        () => setPhase('apply'),
        () => {
          setPhase('done')
          const rec = receipts[caseId]
          log(rec.kind, rec.text)
          setHint(true)
        },
      ],
      (tl) => pulse(packetRef.current, tl, 0),
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPrinciple('srp')
    setCaseId('god')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PrincipleSwitch value={principle} disabled={busy} onChange={selectPrinciple} />

      <div className={shell.row}>
        {CASES[principle].map((c) => (
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

      <p className={shell.pain}>{PAIN[principle]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {principle === 'srp' ? (
        <SrpViz phase={phase} caseId={caseId as SrpCase} packetRef={packetRef} />
      ) : null}
      {principle === 'ocp' ? (
        <OcpViz phase={phase} caseId={caseId as OcpCase} packetRef={packetRef} />
      ) : null}
      {principle === 'lsp' ? (
        <LspViz phase={phase} caseId={caseId as LspCase} packetRef={packetRef} />
      ) : null}
      {principle === 'isp' ? (
        <IspViz phase={phase} caseId={caseId as IspCase} packetRef={packetRef} />
      ) : null}
      {principle === 'dip' ? (
        <DipViz phase={phase} caseId={caseId as DipCase} packetRef={packetRef} />
      ) : null}

      {hint ? <p className={shell.hint}>{HINT[caseId]}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <PrincipleSwitch value={principle} onChange={selectPrinciple} />
      <InteractiveCodePanel
        key={principle}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[principle]}
        snippets={CODE_SNIPPETS[principle]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="SOLID"
      lead="Пять правил проще: один повод на файл, новое рядом, без сюрпризов при подмене, только нужные методы, договор вместо базы."
      problem={problem}
      code={code}
    />
  )
}

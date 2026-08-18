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

type Principle = 'srp' | 'ocp' | 'lsp' | 'isp' | 'dip' | 'cohesion' | 'coupling'
type SrpCase = 'god' | 'split'
type OcpCase = 'sw' | 'plugin'
type LspCase = 'square' | 'shape'
type IspCase = 'fat' | 'thin'
type DipCase = 'concrete' | 'invert'
type CohesionCase = 'junk' | 'one'
type CouplingCase = 'tight' | 'loose'
type CaseId = SrpCase | OcpCase | LspCase | IspCase | DipCase | CohesionCase | CouplingCase

type Phase = 'idle' | 'hit' | 'apply' | 'done'

const PRINCIPLES: Array<{ id: Principle; label: string }> = [
  { id: 'cohesion', label: 'Связность' },
  { id: 'coupling', label: 'Зацепление' },
  { id: 'srp', label: 'SRP' },
  { id: 'ocp', label: 'OCP' },
  { id: 'lsp', label: 'LSP' },
  { id: 'isp', label: 'ISP' },
  { id: 'dip', label: 'DIP' },
]

const CASES: Record<Principle, Array<{ id: CaseId; label: string }>> = {
  cohesion: [
    { id: 'junk', label: 'Свалка' },
    { id: 'one', label: 'Одно дело' },
  ],
  coupling: [
    { id: 'tight', label: 'Знает склад' },
    { id: 'loose', label: 'Узкий вызов' },
  ],
  srp: [
    { id: 'god', label: 'Бог-модуль' },
    { id: 'split', label: 'Два модуля' },
  ],
  ocp: [
    { id: 'sw', label: 'switch' },
    { id: 'plugin', label: 'рядом' },
  ],
  lsp: [
    { id: 'square', label: 'Квадратный поднос' },
    { id: 'shape', label: 'grams()' },
  ],
  isp: [
    { id: 'fat', label: 'Толстый тип' },
    { id: 'thin', label: 'Только bake' },
  ],
  dip: [
    { id: 'concrete', label: 'Знает базу' },
    { id: 'invert', label: 'RecipeBook' },
  ],
}

const CODE_INTRO: Record<Principle, string> = {
  cohesion: 'Связность: в одном файле — вещи одного повода. Цена булки не должна жить рядом с ночной уборкой.',
  coupling: 'Зацепление: касса зовёт `loadCart`, а не лезет в SQL склада и в поля принтера чека.',
  srp: 'SRP: новая цена булки не должна трогать печать чека. Цена и чек — в разных файлах.',
  ocp: 'OCP: новая оплата картой — новый объект с `pay`. Старый `checkout` на кассе не правят.',
  lsp: 'LSP: код ждал 20 кусков на подносе, а «квадратный поднос» дал 16. Честный договор — `grams()`.',
  isp: 'ISP: будильник «прогреть духовку» зовёт только `bake`. Пустые `deliver` / `invoice` не нужны.',
  dip: 'DIP: отчёт за день зависит от договора `RecipeBook`, а не от `postgresRecipes` напрямую.',
}

const CODE_SNIPPETS: Record<Principle, InteractiveSnippet[]> = {
  cohesion: [
    {
      id: 'bakery-stuff',
      label: 'src/bakery/bakeryStuff.ts',
      note: 'Четыре разных повода в одном файле: цена, чек, SMS, уборка.',
      executable: false,
      languageLabel: 'ts',
      code: `type Line = { name: string; rub: number };

// ═══════════════════════════════════════════
// JUNK ← свалка: не про одно дело
// ═══════════════════════════════════════════
export function breadTotal(lines: Line[]) {
  return lines.reduce((s, l) => s + l.rub, 0); // ← цена
}

export function printReceipt(total: number) {
  return \`чек: \${total} ₽\`; // ← печать
}

export function smsReady(phone: string) {
  return \`SMS \${phone}: заказ готов\`; // ← доставка
}

export function closeShop() {
  /* выключить печь, помыть пол */ // ← ночная смена
}`,
    },
    {
      id: 'bread-price',
      label: 'src/bakery/breadPrice.ts',
      note: 'Сумма, скидка и округление — одно дело: деньги за хлеб.',
      executable: false,
      languageLabel: 'ts',
      code: `type Line = { name: string; rub: number };

function sum(lines: Line[]) {
  return lines.reduce((s, l) => s + l.rub, 0);
}

function roundRub(n: number) {
  return Math.round(n);
}

// ═══════════════════════════════════════════
// ONE ← только цена булок
// ═══════════════════════════════════════════
export function breadTotal(lines: Line[], discount = 0) {
  return roundRub(sum(lines) * (1 - discount)); // ← только деньги
}

// printReceipt и smsReady — в других файлах`,
    },
  ],
  coupling: [
    {
      id: 'counter-tight',
      label: 'src/bakery/counterTight.ts',
      note: 'Касса сама пишет SQL склада и трогает поля принтера.',
      executable: false,
      languageLabel: 'ts',
      code: `import { stockDb } from '../db/stockDb';
import { ReceiptPrinter } from '../hardware/printer';

// ═══════════════════════════════════════════
// TIGHT ← касса знает SQL и поля принтера
// ═══════════════════════════════════════════
export async function sell(cartId: string) {
  const { rows } = await stockDb.query(
    'select total from carts where id = $1',
    [cartId],
  ); // ← SQL чужого модуля
  const printer = new ReceiptPrinter();
  printer.marginLeft = 8; // ← поле принтера
  printer.line(String(rows[0].total));
  return printer;
}`,
    },
    {
      id: 'counter-loose',
      label: 'src/bakery/counterLoose.ts',
      note: 'Касса зовёт `loadCart` и `printTotal` — не знает SQL и поля принтера.',
      executable: false,
      languageLabel: 'ts',
      code: `type CartStore = { loadCart: (id: string) => Promise<{ total: number }> };
type Receipts = { printTotal: (total: number) => string };

// ═══════════════════════════════════════════
// LOOSE ← только узкие вызовы
// ═══════════════════════════════════════════
export function createCounter(store: CartStore, receipts: Receipts) {
  return {
    async sell(cartId: string) {
      const cart = await store.loadCart(cartId); // ← не SQL
      return receipts.printTotal(cart.total); // ← не marginLeft
    },
  };
}`,
    },
  ],
  srp: [
    {
      id: 'god-counter',
      label: 'src/bakery/godCounter.ts',
      note: 'Два дела в одном объекте: цена булки и печать чека.',
      executable: false,
      languageLabel: 'ts',
      code: `type Line = { name: string; rub: number };

// ═══════════════════════════════════════════
// GOD ← цена и чек в одном модуле
// ═══════════════════════════════════════════
export function createCounter() {
  return {
    total(lines: Line[]) {
      return lines.reduce((s, l) => s + l.rub, 0); // ← цена
    },
    receipt(total: number) {
      return \`чек: \${total} ₽\`; // ← второй повод менять
    },
  };
}

// смена цены булки правит файл, где живёт макет чека`,
    },
    {
      id: 'price-receipt',
      label: 'src/bakery/breadPrice.ts',
      note: '`breadTotal` — только цена; чек лежит в другом файле.',
      executable: false,
      languageLabel: 'ts',
      code: `type Line = { name: string; rub: number };

// ═══════════════════════════════════════════
// SRP ← один повод: цена
// ═══════════════════════════════════════════
export function breadTotal(lines: Line[]) {
  return lines.reduce((s, l) => s + l.rub, 0); // ← только сумма
}

// --- src/bakery/receipt.ts ---
export function printReceipt(total: number) {
  return \`чек: \${total} ₽\`; // ← другой файл, другой повод
}`,
    },
  ],
  ocp: [
    {
      id: 'pay-switch',
      label: 'src/bakery/paySwitch.ts',
      note: 'Каждый новый способ оплаты снова правит уже работающий `switch`.',
      executable: false,
      languageLabel: 'ts',
      code: `async function payCash(amount: number) {
  return { ok: true as const, amount, way: 'cash' };
}
async function payCard(amount: number) {
  return { ok: true as const, amount, way: 'card' };
}

// ═══════════════════════════════════════════
// SWITCH ← правка уже работающей кассы
// ═══════════════════════════════════════════
export async function checkout(way: string, amount: number) {
  switch (way) {
    case 'cash':
      return payCash(amount);
    case 'card':
      return payCard(amount); // ← бонусная карта = правка этого файла
    default:
      throw new Error(\`unknown: \${way}\`);
  }
}`,
    },
    {
      id: 'pay-method',
      label: 'src/bakery/payMethod.ts',
      note: 'Касса зовёт `method.pay`; бонусная карта — отдельный новый объект.',
      executable: false,
      languageLabel: 'ts',
      code: `export type PayMethod = { pay: (amount: number) => Promise<{ ok: true; amount: number }> };

export function checkout(method: PayMethod, amount: number) {
  return method.pay(amount); // ← OCP: касса не знает способы
}

export const cashMethod: PayMethod = {
  pay: async (amount) => ({ ok: true, amount }),
};

// ═══════════════════════════════════════════
// PLUGIN ← новый кусок, checkout цел
// ═══════════════════════════════════════════
export const bonusCardMethod: PayMethod = {
  pay: async (amount) => ({ ok: true, amount }), // ← бонусная карта здесь
};`,
    },
  ],
  lsp: [
    {
      id: 'tray-square',
      label: 'src/bakery/traySquare.ts',
      note: 'У квадратного подноса `setWidth` меняет и длину — ожидание ломается.',
      executable: false,
      languageLabel: 'ts',
      code: `type Tray = { w: number; h: number; kind: 'rect' | 'square' };

function setWidth(t: Tray, w: number): Tray {
  if (t.kind === 'square') return { ...t, w, h: w }; // ← LSP: h тоже
  return { ...t, w };
}

function setHeight(t: Tray, h: number): Tray {
  if (t.kind === 'square') return { ...t, w: h, h };
  return { ...t, h };
}

// ═══════════════════════════════════════════
// STRETCH ← ждали независимые w/h
// ═══════════════════════════════════════════
export function piecesOnTray(t: Tray) {
  const a = setWidth(t, 5);
  const b = setHeight(a, 4);
  return b.w * b.h; // прямоуг. → 20; квадрат → 16
}`,
    },
    {
      id: 'tray-grams',
      label: 'src/bakery/trayWeigh.ts',
      note: 'Общий `grams()` — без обещания «ширина и высота независимы».',
      executable: false,
      languageLabel: 'ts',
      code: `export type Weighable = { grams: () => number };

// ═══════════════════════════════════════════
// LSP ← подстановка по grams(), не по setWidth
// ═══════════════════════════════════════════
export const rectTray = (w: number, h: number, gPerCell: number): Weighable => ({
  grams: () => w * h * gPerCell,
});

export const squareTray = (side: number, gPerCell: number): Weighable => ({
  grams: () => side * side * gPerCell, // ← тот же договор grams()
});

export function batchWeight(trays: Weighable[]) {
  return trays.reduce((s, t) => s + t.grams(), 0);
}`,
    },
  ],
  isp: [
    {
      id: 'oven-fat',
      label: 'src/bakery/ovenTaskFat.ts',
      note: 'Будильник «прогреть» вынужден писать пустые `deliver` / `invoice`.',
      executable: false,
      languageLabel: 'ts',
      code: `type OvenTask = {
  bake: () => void;
  deliver: () => void;
  invoice: () => void;
};

function preheat() {
  /* прогреть до 220° */
}

// ═══════════════════════════════════════════
// FAT ← интерфейс чужого клиента
// ═══════════════════════════════════════════
export function preheatAlarm(): OvenTask {
  return {
    bake: () => preheat(),
    deliver: () => {}, // ← пусто: ISP сломан
    invoice: () => {},
  };
}`,
    },
    {
      id: 'bakeable',
      label: 'src/bakery/bakeable.ts',
      note: '`Bakeable` — только то, что планировщик печи реально вызывает.',
      executable: false,
      languageLabel: 'ts',
      code: `export type Bakeable = { bake: () => void };

function preheat() {
  /* прогреть до 220° */
}

// ═══════════════════════════════════════════
// ISP ← тип только под то, что зовут
// ═══════════════════════════════════════════
export function preheatAlarm(): Bakeable {
  return { bake: () => preheat() }; // ← deliver/invoice нет в типе
}

export function runOven(tasks: Bakeable[]) {
  for (const task of tasks) task.bake();
}`,
    },
  ],
  dip: [
    {
      id: 'report-pg',
      label: 'src/bakery/dailyReportPg.ts',
      note: 'Отчёт сам тянет Postgres — подменить базу рецептов сложно.',
      executable: false,
      languageLabel: 'ts',
      code: `import { postgresRecipes } from './postgresRecipes'; // ← DIP сломан

// ═══════════════════════════════════════════
// CONCRETE ← отчёт знает Postgres
// ═══════════════════════════════════════════
export function createDailyReport() {
  return {
    sold: () => postgresRecipes.query('select * from sales_today'),
  };
}

// подмена MemoryRecipes правит этот файл`,
    },
    {
      id: 'recipe-book',
      label: 'src/bakery/recipeBook.ts',
      note: '`createDailyReport(book)` смотрит на договор; Postgres — снаружи.',
      executable: false,
      languageLabel: 'ts',
      code: `export type RecipeBook = { soldToday: () => Promise<{ item: string; qty: number }[]> };

// ═══════════════════════════════════════════
// DIP ← отчёт зависит от договора RecipeBook
// ═══════════════════════════════════════════
export function createDailyReport(book: RecipeBook) {
  return {
    sold: () => book.soldToday(),
  };
}

export const postgresRecipes: RecipeBook = {
  soldToday: async () => [{ item: 'булка', qty: 42 }],
};

export const memoryRecipes: RecipeBook = {
  soldToday: async () => [{ item: 'круассан', qty: 3 }],
};`,
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

function TrayCells({
  cols,
  rows,
  filled,
  mode,
  active,
}: {
  cols: number
  rows: number
  filled: number
  mode: 'idle' | 'ok' | 'warn'
  active: boolean
}) {
  const cells = cols * rows
  return (
    <div className={styles.trayGrid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cells }, (_, i) => {
        const on = i < filled
        const miss = mode === 'warn' && !on && active
        const cls = [
          styles.trayCell,
          on && active && (mode === 'ok' ? styles.trayCellOk : styles.trayCellOn),
          miss && styles.trayCellMiss,
        ]
          .filter(Boolean)
          .join(' ')
        return <span key={i} className={cls} aria-hidden />
      })}
    </div>
  )
}

function CohesionViz({ phase, caseId, packetRef }: VizProps & { caseId: CohesionCase }) {
  const one = caseId === 'one'
  const hit = phase !== 'idle'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'

  const junkItems = [
    { glyph: '🍞', label: 'цена', sub: 'булка', hit: true },
    { glyph: '🧾', label: 'чек', sub: 'печать', hit: true },
    { glyph: '📱', label: 'SMS', sub: 'готово', hit: true },
    { glyph: '🧹', label: 'уборка', sub: 'ночью', hit: true },
  ]

  const priceItems = [
    { glyph: '₽', label: 'сумма', sub: 'руб', ok: true },
    { glyph: '−', label: 'скидка', sub: '10%', ok: true },
    { glyph: '≈', label: 'округл.', sub: 'коп', ok: true },
  ]

  return (
    <LabVizPanel title="Ящик за стойкой" meta={one ? 'деньги отдельно от чека' : 'всё в одном ящике'}>
      <div className={styles.vizStage}>
        <div
          ref={packetRef}
          className={[
            styles.priceTag,
            hit && styles.priceTagActive,
          ].join(' ')}
        >
          новая цена булки
        </div>

        {one ? (
          <div className={styles.drawerRow}>
            <div className={[styles.drawer, apply && styles.drawerOk, done && styles.drawerOk].filter(Boolean).join(' ')}>
              <span className={styles.drawerTitle}>breadPrice.ts</span>
              <div className={styles.drawerGrid}>
                {priceItems.map((item) => (
                  <div
                    key={item.label}
                    className={[styles.drawerItem, apply && styles.drawerItemOk, done && styles.drawerItemOk]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className={styles.drawerGlyph}>{item.glyph}</span>
                    <span>{item.label}</span>
                    <span className={labVizStyles.nodeSub}>{item.sub}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={[styles.drawer, styles.drawerIdle].join(' ')}>
              <span className={styles.drawerTitle}>receipt.ts</span>
              <div className={styles.drawerGrid}>
                <div className={styles.drawerItem}>
                  <span className={styles.drawerGlyph}>🧾</span>
                  <span>чек</span>
                  <span className={labVizStyles.nodeSub}>не трогаем</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={[styles.drawer, apply && styles.drawerWarn, done && styles.drawerWarn].filter(Boolean).join(' ')}>
            <span className={styles.drawerTitle}>bakeryStuff.ts — один ящик</span>
            <div className={styles.drawerGrid}>
              {junkItems.map((item) => (
                <div
                  key={item.label}
                  className={[styles.drawerItem, apply && styles.drawerItemHit, done && styles.drawerItemHit]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.drawerGlyph}>{item.glyph}</span>
                  <span>{item.label}</span>
                  <span className={labVizStyles.nodeSub}>{item.sub}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={styles.vizCaption}>
          {done
            ? one
              ? 'Цена попала только в ящик с деньгами — чек лежит в другом.'
              : 'Один ящик на всё: правка цены задела чек, SMS и уборку.'
            : 'Смотрим, куда попадёт правка «новая цена булки».'}
        </p>
      </div>
    </LabVizPanel>
  )
}

function CouplingViz({ phase, caseId, packetRef }: VizProps & { caseId: CouplingCase }) {
  const loose = caseId === 'loose'
  const hit = phase !== 'idle'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel title="План зала" meta={loose ? 'тонкие провода' : 'толстые провода внутрь'}>
      <div className={styles.vizStage}>
        <div
          ref={packetRef}
          className={[styles.changeChip, hit && styles.changeChipActive].filter(Boolean).join(' ')}
        >
          другой склад
        </div>

        <div className={styles.floorPlan}>
          <div className={styles.floorRow}>
            <div
              className={[
                styles.floorRoom,
                !loose && apply && styles.floorRoomWarn,
                loose && done && styles.floorRoomOk,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>🏭</span>
              <span>склад</span>
              {!loose && done ? <span className={labVizStyles.nodeSub}>SQL в кассе</span> : null}
            </div>

            <span
              className={[styles.wire, !loose && apply && styles.wireThick, loose && apply && styles.wireThin]
                .filter(Boolean)
                .join(' ')}
            >
              {loose ? 'loadCart' : 'SQL →'}
            </span>

            <div
              className={[
                styles.floorCounter,
                hit && styles.floorCounterActive,
                done && (loose ? styles.floorCounterOk : styles.floorCounterWarn),
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>🛒</span>
              <span>касса</span>
              <span className={labVizStyles.nodeSub}>
                {loose ? 'не знает SQL' : done ? 'знает запрос' : 'sell()'}
              </span>
            </div>

            <span
              className={[styles.wire, !loose && apply && styles.wireThick, loose && apply && styles.wireThin]
                .filter(Boolean)
                .join(' ')}
            >
              {loose ? 'printTotal' : 'marginLeft →'}
            </span>

            <div className={[styles.floorRoom, !loose && apply && styles.floorRoomWarn].filter(Boolean).join(' ')}>
              <span>🖨️</span>
              <span>принтер</span>
              {!loose && done ? <span className={labVizStyles.nodeSub}>поля снаружи</span> : null}
            </div>
          </div>
        </div>

        <p className={styles.vizCaption}>
          {done
            ? loose
              ? 'Касса зовёт склад и принтер по коротким именам — внутренности спрятаны.'
              : 'Касса впаяна в SQL и поля принтера — смена склада бьёт по кассе.'
            : 'Провода показывают, насколько касса знает чужие детали.'}
        </p>
      </div>
    </LabVizPanel>
  )
}

function SrpViz({ phase, caseId, packetRef }: VizProps & { caseId: SrpCase }) {
  const split = caseId === 'split'
  const hit = phase !== 'idle'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel title="Две стойки" meta={split ? 'весы отдельно от чека' : 'один прилавок на всё'}>
      <div className={styles.vizStage}>
        <div
          ref={packetRef}
          className={[styles.priceTag, hit && styles.priceTagActive].filter(Boolean).join(' ')}
        >
          новая цена булки
        </div>

        {split ? (
          <div className={styles.stations}>
            <div className={[styles.station, apply && styles.stationActive, done && styles.stationOk].filter(Boolean).join(' ')}>
              <span className={styles.stationIcon}>⚖️</span>
              <span>breadPrice</span>
              <span className={labVizStyles.nodeSub}>{done ? 'сумма меняется' : 'весы'}</span>
            </div>
            <div className={[styles.station, styles.nodeSkipped].join(' ')}>
              <span className={styles.stationIcon}>🧾</span>
              <span>receipt</span>
              <span className={labVizStyles.nodeSub}>не трогаем</span>
            </div>
          </div>
        ) : (
          <div
            className={[
              styles.station,
              styles.stationMerged,
              apply && styles.stationActive,
              done && styles.stationWarn,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.stationPart}>
              <span className={styles.stationIcon}>⚖️</span>
              <span>цена</span>
            </div>
            <div className={styles.stationPart}>
              <span className={styles.stationIcon}>🧾</span>
              <span>чек</span>
            </div>
          </div>
        )}

        <p className={styles.vizCaption}>
          {done
            ? split
              ? 'Правка цены осталась у весов — принтер чека не открывали.'
              : 'Один прилавок: цена и чек в одном месте — правка задела оба.'
            : 'Куда попадёт изменение цены — на одну стойку или на две?'}
        </p>
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
    <LabVizPanel title="Слот оплаты" meta={plugin ? 'карта в слот' : 'лезем внутрь кассы'}>
      <div className={styles.vizStage}>
        <div className={styles.payLane}>
          <div className={[styles.payRegister, done && (plugin ? styles.payRegisterOk : styles.payRegisterWarn)].filter(Boolean).join(' ')}>
            <span>🛒</span>
            <span>касса</span>
            {!plugin && done ? (
              <span className={styles.payGears} aria-hidden>
                <span>⚙</span>
                <span>⚙</span>
              </span>
            ) : (
              <span className={labVizStyles.nodeSub}>{plugin ? 'не трогали' : 'switch правили'}</span>
            )}
          </div>

          <div
            ref={packetRef}
            className={[
              styles.paySlot,
              hit && styles.paySlotActive,
              apply && !plugin && styles.paySlotWarn,
              done && plugin && styles.paySlotActive,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span>{plugin ? 'PayMethod' : 'switch внутри'}</span>
            <span className={labVizStyles.nodeSub}>{plugin ? 'method.pay' : 'нал | карта'}</span>
          </div>

          <div
            className={[
              styles.payCard,
              plugin && apply && styles.payCardNew,
              plugin && done && styles.payCardNew,
              !plugin && styles.payCardGhost,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {plugin ? (
              <>
                <span>💳</span>
                <span>бонус</span>
              </>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>

        <p className={styles.vizCaption}>
          {done
            ? plugin
              ? 'Новая карта легла в слот — тело кассы не разбирали.'
              : 'Новый способ оплаты снова правит switch внутри кассы.'
            : 'Новый способ оплаты: открыть кассу или положить карту в слот?'}
        </p>
      </div>
    </LabVizPanel>
  )
}

function LspViz({ phase, caseId, packetRef }: VizProps & { caseId: LspCase }) {
  const ok = caseId === 'shape'
  const hit = phase !== 'idle'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'

  if (ok) {
    return (
      <LabVizPanel title="Весы, не сетка" meta="честный grams()">
        <div className={styles.vizStage}>
          <div ref={packetRef} className={styles.scaleRow}>
            <span className={styles.scaleTray}>🍞</span>
            <span className={[styles.scaleReadout, done && styles.trayTotalOk].filter(Boolean).join(' ')}>
              {done ? 'взвесили оба подноса' : 'batchWeight()'}
            </span>
          </div>
          <div className={styles.trayCompare}>
            <div className={[styles.trayCard, apply && styles.trayCardOk, done && styles.trayCardOk].filter(Boolean).join(' ')}>
              <span className={styles.trayHead}>прямоуг. 5×4</span>
              <TrayCells cols={5} rows={4} filled={20} mode="ok" active={apply || done} />
              <span className={[styles.trayTotal, done && styles.trayTotalOk].filter(Boolean).join(' ')}>
                {done ? 'grams()' : '—'}
              </span>
            </div>
            <div className={[styles.trayCard, apply && styles.trayCardOk, done && styles.trayCardOk].filter(Boolean).join(' ')}>
              <span className={styles.trayHead}>квадрат 4×4</span>
              <TrayCells cols={4} rows={4} filled={16} mode="ok" active={apply || done} />
              <span className={[styles.trayTotal, done && styles.trayTotalOk].filter(Boolean).join(' ')}>
                {done ? 'grams()' : '—'}
              </span>
            </div>
          </div>
          <p className={styles.vizCaption}>
            {done
              ? 'Считаем только вес — форма подноса не обманывает вызывающий код.'
              : 'Оба подноса отвечают grams(), а не «независимые стороны».'}
          </p>
        </div>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title="Сетка 5×4" meta="квадратный поднос подставили">
      <div className={styles.vizStage}>
        <div
          ref={packetRef}
          className={[styles.changeChip, hit && styles.changeChipActive].filter(Boolean).join(' ')}
        >
          ширина 5, длина 4
        </div>
        <div className={styles.trayCompare}>
          <div className={[styles.trayCard, apply && styles.trayCardActive].filter(Boolean).join(' ')}>
            <span className={styles.trayHead}>прямоугольный</span>
            <TrayCells cols={5} rows={4} filled={20} mode="idle" active={apply || done} />
            <span className={[styles.trayTotal, done && styles.trayTotalOk].filter(Boolean).join(' ')}>
              {done ? '20 кусков' : 'ожидание 20'}
            </span>
          </div>
          <div
            className={[styles.trayCard, apply && styles.trayCardActive, done && styles.trayCardErr]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.trayHead}>квадратный как прям.</span>
            <TrayCells cols={5} rows={4} filled={16} mode="warn" active={apply || done} />
            <span className={[styles.trayTotal, done && styles.trayTotalWarn].filter(Boolean).join(' ')}>
              {done ? '16 ≠ 20' : 'подмена'}
            </span>
          </div>
        </div>
        <p className={styles.vizCaption}>
          {done
            ? 'Код ждал 20 ячеек, квадратный поднос дал 16 — сюрприз при подстановке.'
            : 'piecesOnTray() считает ячейки — квадрат ломает ожидание.'}
        </p>
      </div>
    </LabVizPanel>
  )
}

function IspViz({ phase, caseId, packetRef }: VizProps & { caseId: IspCase }) {
  const thin = caseId === 'thin'
  const apply = phase === 'apply' || phase === 'done'
  const done = phase === 'done'

  const buttons: Array<{
    id: string
    label: string
    badge: string
    needed: boolean
    warn?: boolean
  }> = [
    { id: 'bake', label: 'прогреть', badge: 'bake', needed: true },
    { id: 'deliver', label: 'доставить', badge: thin ? '—' : 'deliver()', needed: false, warn: !thin },
    { id: 'invoice', label: 'счёт', badge: thin ? '—' : 'invoice()', needed: false, warn: !thin },
  ]

  return (
    <LabVizPanel title="Панель духовки" meta={thin ? 'одна кнопка' : 'три, две пустые'}>
      <div className={styles.vizStage}>
        <div className={styles.ovenPanel}>
          <div className={styles.ovenBody}>
            <div ref={packetRef} className={[styles.ovenWindow, (apply || done) && styles.ovenHot].filter(Boolean).join(' ')} />
            <span>печь</span>
            <span className={labVizStyles.nodeSub}>{done && thin ? '220°' : 'духовка'}</span>
          </div>
          <div className={styles.ovenControls}>
            {buttons.map((btn) => {
              const show = thin ? btn.needed : true
              if (!show) return null
              const lit = btn.needed && (apply || done)
              const warn = Boolean(btn.warn) && apply && !thin
              return (
                <div
                  key={btn.id}
                  className={[
                    styles.ovenBtn,
                    lit && styles.ovenBtnOn,
                    !btn.needed && thin && styles.ovenBtnOff,
                    warn && styles.ovenBtnWarn,
                    !btn.needed && !thin && done && styles.ovenBtnWarn,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span>{btn.label}</span>
                  <span
                    className={[
                      styles.ovenBtnBadge,
                      warn && done && styles.ovenBtnBadgeEmpty,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {btn.badge}
                  </span>
                </div>
              )
            })}
            {thin ? (
              <p className={styles.vizCaption} style={{ margin: 0, textAlign: 'left' }}>
                deliver и invoice на панели нет
              </p>
            ) : null}
          </div>
        </div>
        <p className={styles.vizCaption}>
          {done
            ? thin
              ? 'Будильник нажал только «прогреть» — лишних кнопок нет.'
              : 'Чтобы прогреть, пришлось «нажать» пустые deliver и invoice.'
            : 'Планировщик зовёт bake() — нужны ли ещё кнопки на панели?'}
        </p>
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
    <LabVizPanel title="Отчёт и рецепты" meta={invert ? 'книга посередине' : 'шланг в базу'}>
      <div className={styles.vizStage}>
        <div
          ref={packetRef}
          className={[
            styles.dipReport,
            hit && styles.dipReportActive,
            done && (invert ? styles.dipReportOk : styles.dipReportWarn),
          ]
            .filter(Boolean)
            .join(' ')}
        >
          📋 отчёт за день
        </div>

        {invert ? (
          <>
            <div className={[styles.dipBook, apply && styles.dipBookOk, done && styles.dipBookOk].filter(Boolean).join(' ')}>
              <span className={styles.dipBookGlyph}>📖</span>
              <span>RecipeBook</span>
              <span className={labVizStyles.nodeSub}>soldToday()</span>
            </div>
            <div className={styles.dipLane}>
              <div className={[styles.dipStore, apply && styles.dipStoreOk, done && styles.dipStoreOk].filter(Boolean).join(' ')}>
                <span>🗄️</span>
                <span>Postgres</span>
              </div>
              <span className={[styles.dipArrow, apply && styles.dipArrowOk].filter(Boolean).join(' ')}>↔</span>
              <div className={[styles.dipStore, apply && styles.dipStoreOk, done && styles.dipStoreOk].filter(Boolean).join(' ')}>
                <span>💾</span>
                <span>память</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className={styles.dipPipe}>{apply ? '━━━━ import postgresRecipes ━━━━' : 'шланг напрямую'}</p>
            <div className={styles.dipLane}>
              <div className={[styles.dipStore, styles.dipStoreSkip].join(' ')}>
                <span>📖</span>
                <span>книга</span>
                <span className={labVizStyles.nodeSub}>мимо</span>
              </div>
              <span className={styles.dipArrow}>→</span>
              <div className={[styles.dipStore, apply && styles.dipStoreWarn, done && styles.dipStoreWarn].filter(Boolean).join(' ')}>
                <span>🗄️</span>
                <span>Postgres</span>
                <span className={labVizStyles.nodeSub}>единственный</span>
              </div>
            </div>
          </>
        )}

        <p className={styles.vizCaption}>
          {done
            ? invert
              ? 'Отчёт читает книгу — Postgres или память подставляют снаружи.'
              : 'Отчёт смотрит прямо в Postgres — подменить базу без правки отчёта нельзя.'
            : 'Есть ли прослойка-договор между отчётом и базой рецептов?'}
        </p>
      </div>
    </LabVizPanel>
  )
}

const PAIN: Record<Principle, ReactNode> = {
  cohesion: (
    <>
      Связность — что лежит в одном файле. Цена булки, чек, SMS и ночная уборка — разные поводы; свалка
      открывается по любому из них.
    </>
  ),
  coupling: (
    <>
      Зацепление — сколько чужих внутренностей знает модуль. Касса лучше зовёт{' '}
      <code>loadCart</code>, а не пишет SQL склада и не трогает поля принтера.
    </>
  ),
  srp: (
    <>
      Если в одном файле и цена булки, и печать чека, смена цены трогает лишнее. Один файл — одна
      причина менять.
    </>
  ),
  ocp: (
    <>
      Новый способ оплаты лучше добавить новым объектом с <code>pay</code>, а не новой веткой в
      старом <code>switch</code> на кассе.
    </>
  ),
  lsp: (
    <>
      Если код раскладывает булки на поднос 5×4, «квадратный поднос» не должен дать сюрприз. Подмена
      должна быть честной.
    </>
  ),
  isp: (
    <>
      Будильник «прогреть духовку» не должен писать пустые <code>deliver</code> и{' '}
      <code>invoice</code> только потому, что они есть в большом <code>OvenTask</code>.
    </>
  ),
  dip: (
    <>
      Отчёт за день лучше зависит от договора <code>RecipeBook</code>, а не напрямую от{' '}
      <code>postgresRecipes</code>. Тогда базу можно подменить.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  junk: (
    <>
      Цена, чек, SMS и уборка лежат в одном <code>bakeryStuff.ts</code> — правка цены открывает весь
      файл.
    </>
  ),
  one: (
    <>
      В <code>breadPrice.ts</code> только деньги за хлеб; печать чека в другом файле и не трогается.
    </>
  ),
  tight: (
    <>
      Касса сама пишет SQL склада и ставит <code>marginLeft</code> принтера — смена склада правит
      этот же файл.
    </>
  ),
  loose: (
    <>
      Касса зовёт <code>loadCart</code> и <code>printTotal</code>; SQL и поля принтера остаются
      снаружи.
    </>
  ),
  god: <>Цена правит <code>godCounter</code>, где рядом лежит чек — два дела в одном файле.</>,
  split: (
    <>
      Цена попадает только в <code>breadPrice</code>; файл с чеком не трогают.
    </>
  ),
  sw: (
    <>
      Бонусную карту добавляют новой веткой в старый <code>switch</code> — снова правят уже
      работающую кассу.
    </>
  ),
  plugin: (
    <>
      Новый <code>bonusCardMethod</code> кладут рядом; файл <code>checkout</code> не меняют.
    </>
  ),
  square: (
    <>
      Код ставит ширину 5 и длину 4 и ждёт 20 кусков — «квадратный поднос» даёт 16.
    </>
  ),
  shape: (
    <>
      Оба подноса отвечают только <code>grams()</code> — без сюрпризов с шириной и длиной.
    </>
  ),
  fat: (
    <>
      Будильник вынужден писать пустые <code>deliver</code> и <code>invoice</code>, чтобы подойти под
      толстый <code>OvenTask</code>.
    </>
  ),
  thin: (
    <>
      В типе только <code>bake</code> — ровно то, что планировщик печи реально вызывает.
    </>
  ),
  concrete: (
    <>
      Отчёт сам импортирует Postgres — подставить память без правки отчёта нельзя.
    </>
  ),
  invert: (
    <>
      Postgres и память оба следуют договору <code>RecipeBook</code>; отчёт не знает, какая база
      внутри.
    </>
  ),
}

const HINT: Record<CaseId, ReactNode> = {
  junk: <>Итог: четыре дела в одном файле — цена задела SMS и уборку.</>,
  one: <>Итог: правка цены осталась в breadPrice; чек цел.</>,
  tight: <>Итог: SQL жил в кассе — смена склада открыла тот же файл.</>,
  loose: <>Итог: касса не знает SQL; склад спрятан за <code>loadCart</code>.</>,
  god: <>Итог: один файл на два дела — цена задела и чек.</>,
  split: <>Итог: правка цены осталась в breadPrice; чек цел.</>,
  sw: <>Итог: бонусная карта снова открыла старый <code>checkout</code>.</>,
  plugin: <>Итог: добавили новый способ оплаты, старую кассу не трогали.</>,
  square: <>Итог: подмена сломала ожидание 20 кусков; имя «квадратный» ни при чём.</>,
  shape: <>Итог: вызывают только <code>grams()</code> — форма подноса не важна.</>,
  fat: <>Итог: пустые методы показывают, что тип слишком большой для прогрева.</>,
  thin: <>Итог: в договоре только то, что реально зовут.</>,
  concrete: <>Итог: отчёт знает Postgres напрямую — подменить сложно.</>,
  invert: <>Итог: <code>dailyReport → RecipeBook ← Postgres | Memory</code>.</>,
}

export function SoftwareSolidLab() {
  const { lines, log, clear } = useLabLog()
  const [principle, setPrinciple] = useState<Principle>('cohesion')
  const [caseId, setCaseId] = useState<CaseId>('junk')
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
      junk: { kind: 'warn', text: 'цена → bakeryStuff.ts (чек + SMS + уборка)' },
      one: { kind: 'ok', text: 'цена → breadPrice.ts; receipt.ts не тронут' },
      tight: { kind: 'warn', text: 'склад → касса (SQL + marginLeft)' },
      loose: { kind: 'ok', text: 'SQL спрятан за loadCart; кассу не трогали' },
      god: { kind: 'warn', text: 'цена → godCounter (сумма + чек)' },
      split: { kind: 'ok', text: 'цена → breadPrice; receipt не тронут' },
      sw: { kind: 'warn', text: 'бонусная карта → правка switch на кассе' },
      plugin: { kind: 'ok', text: 'bonusCardMethod рядом; checkout цел' },
      square: { kind: 'err', text: 'piecesOnTray(квадрат) = 16, ждали 20' },
      shape: { kind: 'ok', text: 'grams(): прямоуг. и квадрат без сюрприза' },
      fat: { kind: 'warn', text: 'прогрев: deliver() и invoice() пустые' },
      thin: { kind: 'ok', text: 'планировщик → bake(); других методов нет' },
      concrete: { kind: 'warn', text: 'dailyReport import postgresRecipes' },
      invert: { kind: 'ok', text: 'dailyReport → RecipeBook ← Postgres | Memory' },
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
    setPrinciple('cohesion')
    setCaseId('junk')
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

      {principle === 'cohesion' ? (
        <CohesionViz phase={phase} caseId={caseId as CohesionCase} packetRef={packetRef} />
      ) : null}
      {principle === 'coupling' ? (
        <CouplingViz phase={phase} caseId={caseId as CouplingCase} packetRef={packetRef} />
      ) : null}
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
    <div className={shell.codePane}>
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
      title="SOLID, Cohesion и Coupling"
      lead="Простая пекарня: касса, цена булок, печь и отчёт за день. Сначала — что лежит в одном файле и кто знает чужие внутренности; буквы SOLID показывают, как это поправить."
      problem={problem}
      code={code}
    />
  )
}

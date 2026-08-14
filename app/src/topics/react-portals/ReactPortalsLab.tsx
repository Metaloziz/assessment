import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactPortalsLab.module.css'

const TOPIC_ID = '189-react-portals'
const STEP = 0.6

type CaseId = 'trapped' | 'portal' | 'bubble'
type Phase = 'idle' | 'open' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'trapped', label: 'Без портала' },
  { id: 'portal', label: 'createPortal' },
  { id: 'bubble', label: 'Всплытие событий' },
]

const CODE_INTRO: Record<CaseId, string> = {
  trapped: 'Модалка внутри `overflow: hidden` — оверлей обрезается карточкой.',
  portal: '`createPortal` монтирует UI в `#modal-root`, React-родитель тот же.',
  bubble: 'Клик в портале всплывает по React-дереву к `Card`, не по DOM `#modal-root`.',
}

const SNIPPET_TRAPPED: InteractiveSnippet = {
  id: 'modal-trapped-v2',
  label: 'src/ui/Modal.tsx',
  note: 'Без портала children остаются в DOM карточки.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { open: boolean; children: React.ReactNode };

export const Modal = ({ open, children }: Props) => {
  if (!open) return null;
  // ═══════════════════════════════════════════
  // TRAPPED ← тот же DOM-предок, что и триггер
  // ═══════════════════════════════════════════
  return <div className="overlay">{children}</div>; // ← внутри Card
};`,
}

const SNIPPET_CARD: InteractiveSnippet = {
  id: 'card-overflow-v2',
  label: 'src/ui/Card.tsx',
  note: '`overflow: hidden` режет потомков без портала.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState } from 'react';
import { Modal } from './Modal';

export const Card = () => {
  const [open, setOpen] = useState(false);
  return (
    <section className="card" style={{ overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(true)}>
        Открыть
      </button>
      <Modal open={open}>Диалог</Modal> {/* ← обрежется */}
    </section>
  );
};`,
}

const SNIPPET_PORTAL: InteractiveSnippet = {
  id: 'modal-portal-v2',
  label: 'src/ui/Modal.tsx',
  note: 'DOM-цель — `#modal-root`; в React Modal всё ещё ребёнок Card.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { createPortal } from 'react-dom';

type Props = { open: boolean; children: React.ReactNode };

export const Modal = ({ open, children }: Props) => {
  if (!open) return null;
  const host = document.getElementById('modal-root');
  if (!host) return null;

  // ═══════════════════════════════════════════
  // PORTAL ← UI в другом DOM-узле
  // ═══════════════════════════════════════════
  return createPortal(
    <div className="overlay" role="dialog">{children}</div>,
    host, // ← вне Card / overflow
  );
};`,
}

const SNIPPET_HOST: InteractiveSnippet = {
  id: 'index-host-v2',
  label: 'index.html',
  note: 'Отдельный host для оверлеев рядом с корнем приложения.',
  executable: false,
  languageLabel: 'html',
  code: `<body>
  <div id="root"></div>
  <!-- PORTAL HOST ← цель createPortal -->
  <div id="modal-root"></div>
</body>`,
}

const SNIPPET_BUBBLE: InteractiveSnippet = {
  id: 'portal-bubble-v2',
  label: 'src/ui/Card.tsx',
  note: 'Клик по кнопке в портале доходит до `onClick` на Card в React.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { createPortal } from 'react-dom';

export const Card = () => (
  <section
    className="card"
    onClick={() => console.log('card')} // ← поймает клик из портала
  >
    {createPortal(
      <button type="button">В портале</button>,
      document.getElementById('modal-root')!,
    )}
  </section>
);

// DOM: button ∈ #modal-root, не ∈ .card
// React: button — потомок Card → всплытие к Card`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  trapped: [SNIPPET_TRAPPED, SNIPPET_CARD],
  portal: [SNIPPET_PORTAL, SNIPPET_HOST],
  bubble: [SNIPPET_BUBBLE, SNIPPET_HOST],
}

const PAIN =
  'Модалки и дропдауны ломаются внутри `overflow` и чужих stacking context. Portal выносит DOM наружу, оставляя React-родителя прежним.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  trapped: (
    <>
      Оверлей рисуется внутри <code>Card</code> — <code>overflow: hidden</code> обрезает диалог.
    </>
  ),
  portal: (
    <>
      Тот же диалог уходит в <code>#modal-root</code> через <code>createPortal</code> — карточка его не режет.
    </>
  ),
  bubble: (
    <>
      Кнопка в портале: клик всплывает к React-<code>Card</code>, хотя в DOM общего предка нет.
    </>
  ),
}

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

type DialogProps = {
  variant: 'trapped' | 'free'
  bubbleHint?: boolean
  onConfirm: () => void
  onClose: () => void
  dialogRef: MutableRefObject<HTMLDivElement | null>
}

const OrderDialog = ({ variant, bubbleHint, onConfirm, onClose, dialogRef }: DialogProps) => (
  <div
    ref={dialogRef}
    className={[
      styles.dialog,
      variant === 'trapped' ? styles.dialogTrapped : styles.dialogFree,
    ].join(' ')}
    role="dialog"
    aria-modal={variant === 'free' ? true : undefined}
    aria-labelledby="portal-lab-dialog-title"
  >
    <p className={styles.dialogEyebrow}>Заказ #4821</p>
    <h2 id="portal-lab-dialog-title" className={styles.dialogTitle}>
      Списать бонусы?
    </h2>
    <p className={styles.dialogLead}>
      {variant === 'trapped'
        ? 'Диалог внутри карточки — нижняя часть и кнопки обрезаны overflow.'
        : 'Диалог в #modal-root: поверх сцены, вне overflow карточки.'}
    </p>
    {bubbleHint ? (
      <p className={styles.dialogHint}>
        Клик по кнопке всплывёт к <code>Card</code> в React
      </p>
    ) : null}
    <div className={styles.dialogActions}>
      <LabButton variant="primary" size="sm" onClick={onConfirm}>
        Подтвердить
      </LabButton>
      <LabButton variant="secondary" size="sm" onClick={onClose}>
        Отмена
      </LabButton>
    </div>
  </div>
)

type VizProps = {
  phase: Phase
  caseId: CaseId
  open: boolean
  cardFlash: boolean
  dialogRef: MutableRefObject<HTMLDivElement | null>
  onOpen: () => void
  onClose: () => void
  onConfirm: () => void
  onCardClick: () => void
}

const PortalLiveViz = ({
  phase,
  caseId,
  open,
  cardFlash,
  dialogRef,
  onOpen,
  onClose,
  onConfirm,
  onCardClick,
}: VizProps) => {
  const [hostEl, setHostEl] = useState<HTMLDivElement | null>(null)
  const usePortal = caseId === 'portal' || caseId === 'bubble'

  const meta =
    phase === 'idle'
      ? 'закрыто'
      : caseId === 'trapped'
        ? 'в Card · clip'
        : caseId === 'bubble'
          ? 'portal · bubble → Card'
          : 'portal · #modal-root'

  const dialog = open ? (
    <OrderDialog
      variant={usePortal ? 'free' : 'trapped'}
      bubbleHint={caseId === 'bubble'}
      onConfirm={onConfirm}
      onClose={onClose}
      dialogRef={dialogRef}
    />
  ) : null

  // createPortal вызывается из Card в React-дереве → bubble идёт к article
  const cardPortal =
    usePortal && open && hostEl
      ? createPortal(<div className={styles.hostMount}>{dialog}</div>, hostEl)
      : null

  return (
    <LabVizPanel title="Карточка заказа" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.appColumn}>
          <p className={styles.colLabel}>#root</p>
          <div className={styles.appShell}>
            <header className={styles.appHeader}>
              <span className={styles.brandMark} aria-hidden />
              <strong>Shop</strong>
              <span className={styles.appNav}>Заказы</span>
            </header>
            <div className={styles.appBody}>
              <article
                className={[styles.orderCard, cardFlash ? styles.orderCardFlash : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={onCardClick}
              >
                <div className={styles.orderHead}>
                  <p className={styles.orderTitle}>Заказ #4821</p>
                  <span className={styles.orderBadge}>в пути</span>
                </div>
                <p className={styles.orderMeta}>3 позиции · 4 290 ₽ · бонусы 320</p>
                <ul className={styles.orderList}>
                  <li>Наушники Pro</li>
                  <li>Чехол Soft</li>
                  <li>Кабель USB-C</li>
                </ul>
                <div className={styles.orderActions}>
                  <LabButton
                    variant="primary"
                    size="sm"
                    disabled={open}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen()
                    }}
                  >
                    Списать бонусы
                  </LabButton>
                </div>
                {!usePortal ? dialog : cardPortal}
              </article>
              <p className={styles.clipNote}>
                {usePortal
                  ? 'Card: overflow hidden · в DOM карточки диалога нет'
                  : 'Card: overflow hidden · диалог внутри → clip'}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.hostColumn}>
          <p className={styles.colLabel}>#modal-root</p>
          <div
            ref={setHostEl}
            className={[styles.modalHost, usePortal && open ? styles.modalHostLive : '']
              .filter(Boolean)
              .join(' ')}
          >
            {!usePortal || !open ? <p className={styles.hostEmpty}>host пуст</p> : null}
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export const ReactPortalsLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('trapped')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [open, setOpen] = useState(false)
  const [cardFlash, setCardFlash] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    }
  }, [])

  const flashCard = () => {
    setCardFlash(true)
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setCardFlash(false), 700)
  }

  const resetViz = () => {
    setPhase('idle')
    setOpen(false)
    setHint(null)
    setCardFlash(false)
    if (dialogRef.current) gsap.set(dialogRef.current, { clearProps: 'transform,opacity' })
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
    if (id === 'trapped') {
      log('warn', 'dialog ∈ Card → overflow обрезал слой')
      setHint('без портала модалка остаётся внутри карточки')
    } else if (id === 'portal') {
      log('ok', 'createPortal → #modal-root; Card не режет')
      setHint('DOM вынесен, React-родитель Card прежний')
    } else {
      log('ok', 'click в portal → всплытие к Card (React)')
      setHint('события идут по React-дереву, не по DOM host')
    }
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('open')
          setOpen(true)
        },
        () => {
          if (caseId === 'bubble') {
            flashCard()
            log('info', 'Card.onClick ← клик из портала')
          }
          finishCase(caseId)
        },
      ],
      (tl) => {
        tl.call(
          () => {
            const el = dialogRef.current
            if (!el) return
            gsap.fromTo(
              el,
              { opacity: 0.55, y: caseId === 'trapped' ? 4 : 10 },
              { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' },
            )
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
    setCaseId('trapped')
    resetViz()
  }

  const onCardClick = () => {
    if (caseId !== 'bubble' || !open) return
    flashCard()
    log('info', 'Card.onClick ← клик из портала')
  }

  const onConfirm = () => {
    // В кейсе bubble всплытие ловит onCardClick на Card (React-дерево).
    if (caseId !== 'bubble') {
      log('ok', 'действие в диалоге')
    }
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

      <PortalLiveViz
        phase={phase}
        caseId={caseId}
        open={open}
        cardFlash={cardFlash}
        dialogRef={dialogRef}
        onOpen={() => {
          setOpen(true)
          setPhase('open')
        }}
        onClose={() => {
          setOpen(false)
          if (phase !== 'idle') setPhase('done')
        }}
        onConfirm={onConfirm}
        onCardClick={onCardClick}
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
      title="Порталы"
      lead="Живой стенд: модалка в карточке с `overflow` vs тот же диалог через `createPortal` в `#modal-root`."
      problem={problem}
      code={code}
    />
  )
}

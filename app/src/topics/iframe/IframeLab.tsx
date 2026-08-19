import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './IframeLab.module.css'

const TOPIC_ID = '61-iframe'

type CaseId = 'direct' | 'sandboxed'
type AccessState = 'idle' | 'ok' | 'blocked'
type BridgeState = 'idle' | 'sent' | 'ok'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'direct', label: 'Обычный iframe' },
  { id: 'sandboxed', label: 'iframe с sandbox' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  direct: (
    <>
      Родитель может открыть DOM внутри <code>iframe</code> и поменять его напрямую.
    </>
  ),
  sandboxed: (
    <>
      <code>sandbox="allow-scripts"</code> закрывает прямой доступ к DOM, поэтому связь остаётся через{' '}
      <code>postMessage</code>.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  direct: 'React + TS: страница магазина держит `ref` на `iframe` и меняет DOM витрины напрямую.',
  sandboxed:
    'React + TS: `sandbox="allow-scripts"` режет direct DOM access; связь идёт через `postMessage`.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  direct: [
    {
      id: 'bakery-page-direct',
      label: 'src/bakery/BakeryPage.tsx',
      note: '`iframeRef.current.contentDocument` работает только когда origin общий.',
      executable: false,
      languageLabel: 'tsx',
      code: `import { useRef } from 'react';
import { bunShelfHtml } from './bunShelfHtml';

export const BakeryPage = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const openPromo = () => {
    const childDoc = iframeRef.current?.contentDocument; // ← same-origin only
    const badge = childDoc?.getElementById('status');
    if (badge) badge.textContent = 'Булочки дня со скидкой';
  };

  return (
    <>
      <button type="button" onClick={openPromo}>
        Показать акцию
      </button>
      <iframe ref={iframeRef} title="Витрина булочек" srcDoc={bunShelfHtml} />
    </>
  );
};`,
    },
    {
      id: 'bun-shelf-html',
      label: 'src/bakery/bunShelfHtml.ts',
      note: 'Витрина лежит в `srcDoc`, но для React-проекта это всё ещё обычная строка в TS.',
      executable: false,
      languageLabel: 'ts',
      code: `export const bunShelfHtml = \`
<!doctype html>
<html lang="ru">
  <body>
    <h1>Витрина булочек</h1>
    <p id="status">Ждём команду от магазина</p>
    <button id="buy">Добавить синнабон</button>
  </body>
</html>\`;`,
    },
  ],
  sandboxed: [
    {
      id: 'bakery-page-sandbox',
      label: 'src/bakery/BakeryPage.tsx',
      note: '`sandbox="allow-scripts"` оставляет скрипты, но parent уже не трогает child DOM напрямую.',
      executable: false,
      languageLabel: 'tsx',
      code: `import { useRef } from 'react';
import { bunShelfHtml } from './bunShelfHtml';
import { useBakeryBridge } from './useBakeryBridge';

export const BakeryPage = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { sendPromo } = useBakeryBridge(iframeRef);

  return (
    <iframe
      ref={iframeRef}
      title="Витрина булочек"
      srcDoc={bunShelfHtml}
      sandbox="allow-scripts" // ← DOM child закрыт
    />
  );
};`,
    },
    {
      id: 'use-bakery-bridge',
      label: 'src/bakery/useBakeryBridge.ts',
      note: 'Parent работает через `postMessage`: проверяет `source` и отправляет команду в iframe.',
      executable: false,
      languageLabel: 'ts',
      code: `import { useEffect } from 'react';

type ChildMessage = { type: 'bun-added'; name: string };
type ParentMessage = { type: 'promo'; text: string };

export const useBakeryBridge = (
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
) => {
  useEffect(() => {
    const onMessage = (event: MessageEvent<ChildMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return; // ← тот самый iframe
      if (event.data?.type !== 'bun-added') return;
      console.log('добавили булочку:', event.data.name);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [iframeRef]);

  const sendPromo = () => {
    const message: ParentMessage = {
      type: 'promo',
      text: 'Булочки дня со скидкой 20%',
    };

    iframeRef.current?.contentWindow?.postMessage(message, '*');
  };

  return { sendPromo };
};`,
    },
    {
      id: 'bun-shelf-html-bridge',
      label: 'src/bakery/bunShelfHtml.ts',
      note: 'Встроенная витрина сама обновляет свой DOM и шлёт событие обратно магазину.',
      executable: false,
      languageLabel: 'ts',
      code: `export const bunShelfHtml = \`
<!doctype html>
<html lang="ru">
  <body>
    <h1>Витрина булочек</h1>
    <p id="status">Ждём акцию от магазина</p>
    <button id="buy">Добавить синнабон</button>

    <script>
      const status = document.getElementById('status');
      const buy = document.getElementById('buy');

      window.addEventListener('message', (event) => {
        if (event.data?.type !== 'promo') return;
        status.textContent = event.data.text; // ← child меняет DOM сам
      });

      buy.addEventListener('click', () => {
        parent.postMessage({ type: 'bun-added', name: 'Синнабон' }, '*');
      });
    </script>
  </body>
</html>\`;`,
    },
  ],
}

type MessagePayload =
  | { type: 'child-ready'; childOrigin: string }
  | { type: 'child-ack'; childOrigin: string; status: string }

const getSandbox = (caseId: CaseId) => {
  if (caseId === 'sandboxed') return 'allow-scripts'
  return undefined
}

const getHint = (caseId: CaseId) => {
  if (caseId === 'direct') {
    return 'обычный iframe даёт прямой доступ к DOM, если origin общий'
  }
  return 'sandbox держит изоляцию: parent не лезет в DOM, а шлёт команды сообщением'
}

const buildFrameHtml = (label: string) => `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, system-ui, sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        box-sizing: border-box;
        padding: 14px;
        background: #10151e;
        color: #f4f7fb;
      }
      .card {
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        background: rgba(255,255,255,0.04);
        padding: 12px;
      }
      .eyebrow {
        margin: 0 0 8px;
        font: 600 11px ui-monospace, SFMono-Regular, monospace;
        color: #8bb9ff;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 15px;
      }
      p {
        margin: 0 0 8px;
        font-size: 13px;
        line-height: 1.4;
        color: #cbd4e1;
      }
      .badge {
        display: inline-block;
        margin-top: 8px;
        padding: 5px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.16);
        font: 600 11px ui-monospace, SFMono-Regular, monospace;
        color: #dbe8ff;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <p class="eyebrow">${label}</p>
      <h1 id="frame-title">Витрина булочек</h1>
      <p data-role="amount">Корзина: 3 булочки · 420 ₽</p>
      <p>Встроенная витрина показывает булочки дня и ждёт команду от страницы-магазина.</p>
      <span class="badge" id="status">ждёт запуск</span>
    </div>
    <script>
      const statusEl = document.getElementById('status');
      const send = (payload) => parent.postMessage(payload, '*');

      window.addEventListener('message', (event) => {
        if (event.data?.type !== 'paint-status') return;
        statusEl.textContent = event.data.status;
        send({
          type: 'child-ack',
          childOrigin: window.location.origin,
          status: statusEl.textContent
        });
      });

      window.addEventListener('DOMContentLoaded', () => {
        send({
          type: 'child-ready',
          childOrigin: window.location.origin
        });
      });
    </script>
  </body>
</html>`

type VizProps = {
  caseId: CaseId
  access: AccessState
  bridge: BridgeState
  sandboxValue: string
  childStatus: string
  frameVersion: number
  frameRef: React.RefObject<HTMLIFrameElement | null>
  onFrameLoad: () => void
}

const IframeViz = ({
  caseId,
  access,
  bridge,
  sandboxValue,
  childStatus,
  frameVersion,
  frameRef,
  onFrameLoad,
}: VizProps) => {
  const frameHtml = useMemo(() => buildFrameHtml(CASES.find((item) => item.id === caseId)?.label ?? 'iframe'), [caseId])

  const accessLabel =
    access === 'ok' ? 'parent читает DOM' : access === 'blocked' ? 'DOM закрыт same-origin' : 'доступ не проверен'
  const bridgeLabel =
    bridge === 'ok' ? 'child ответил message' : bridge === 'sent' ? 'message отправлен' : 'канал ждёт запуск'
  const meta = caseId === 'sandboxed' ? 'DOM закрыт · message-only' : 'same-origin'

  return (
    <LabVizPanel title="Parent ↔ iframe" meta={meta}>
      <div className={styles.stage}>
        <div className={styles.parentColumn}>
          <div className={styles.parentCard}>
            <p className={styles.blockLabel}>parent</p>
            <h3 className={styles.blockTitle}>Страница магазина</h3>
            <p className={styles.blockLead}>
              Слева магазин. Он либо открывает DOM витрины с булочками напрямую, либо шлёт встроенному
              приложению сообщение.
            </p>
            <div className={styles.statusList}>
              <div className={styles.statusRow}>
                <span className={styles.statusKey}>DOM</span>
                <span
                  className={[
                    styles.statusValue,
                    access === 'ok' ? styles.statusOk : access === 'blocked' ? styles.statusWarn : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {accessLabel}
                </span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusKey}>Message</span>
                <span
                  className={[
                    styles.statusValue,
                    bridge === 'ok' ? styles.statusOk : bridge === 'sent' ? styles.statusAccent : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {bridgeLabel}
                </span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusKey}>Child</span>
                <span className={styles.statusValue}>{childStatus}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.frameColumn}>
          <p className={styles.blockLabel}>iframe</p>
          <div className={styles.frameShell}>
            <div className={styles.frameTop}>
              <span className={styles.frameTitle}>title="Витрина булочек"</span>
              <span className={styles.frameSandbox}>{sandboxValue || 'sandbox нет'}</span>
            </div>
            <iframe
              key={`${caseId}-${frameVersion}`}
              ref={frameRef}
              className={styles.frame}
              title="Витрина булочек"
              srcDoc={frameHtml}
              sandbox={getSandbox(caseId)}
              onLoad={onFrameLoad}
            />
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export const IframeLab = () => {
  const { lines, log, clear } = useLabLog()
  const frameRef = useRef<HTMLIFrameElement | null>(null)

  const [caseId, setCaseId] = useState<CaseId>('direct')
  const [frameVersion, setFrameVersion] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [access, setAccess] = useState<AccessState>('idle')
  const [bridge, setBridge] = useState<BridgeState>('idle')
  const [childStatus, setChildStatus] = useState('ждёт запуск')

  const sandboxValue = getSandbox(caseId) ?? ''

  useEffect(() => {
    const onMessage = (event: MessageEvent<MessagePayload>) => {
      if (event.source !== frameRef.current?.contentWindow) return
      if (!event.data || typeof event.data !== 'object') return

      if (event.data.type === 'child-ready') {
        log('info', `iframe готов · child origin: ${event.data.childOrigin || '(пусто)'}`)
        return
      }

      if (event.data.type === 'child-ack') {
        setBridge('ok')
        setChildStatus(event.data.status)
        log('ok', `child ответил по postMessage · child origin: ${event.data.childOrigin || '(пусто)'}`)
        setHint(getHint(caseId))
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [caseId, log])

  const resetViz = (nextCase: CaseId) => {
      setCaseId(nextCase)
    setFrameVersion(0)
    setHint(null)
    setAccess('idle')
    setBridge('idle')
    setChildStatus('ждёт запуск')
    clear()
  }

  const run = () => {
    clear()
    setHint(null)
    setAccess('idle')
    setBridge('idle')
    setChildStatus('перезагрузка iframe')
    setFrameVersion((value) => value + 1)
  }

  const handleFrameLoad = () => {
    const frame = frameRef.current
    if (!frame?.contentWindow) return

    log('info', `iframe загружен · ${sandboxValue || 'без sandbox'}`)

    try {
      const childDoc = frame.contentWindow.document
      const badge = childDoc.getElementById('status')
      if (badge) {
        badge.textContent = 'parent изменил DOM напрямую'
        setChildStatus('parent изменил DOM')
      }
      setAccess('ok')
      log('ok', 'parent открыл DOM iframe через contentDocument')
    } catch (error) {
      setAccess('blocked')
      setChildStatus('DOM закрыт')
      const reason = error instanceof Error ? error.name : 'SecurityError'
      log('warn', `sandbox закрыл прямой доступ к DOM · ${reason}`)
    }

    const targetOrigin = caseId === 'sandboxed' ? '*' : window.location.origin
    frame.contentWindow.postMessage(
      {
        type: 'paint-status',
        status: caseId === 'sandboxed' ? 'статус пришёл через postMessage' : 'message от parent доставлен',
      },
      targetOrigin,
    )
    setBridge('sent')
    log('info', `parent отправил postMessage · targetOrigin: ${targetOrigin}`)
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            onClick={() => resetViz(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" onClick={() => resetViz('direct')}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        У <code>iframe</code> свой документ внутри страницы. Здесь это мини-приложение с витриной булочек:
        либо магазин меняет его DOM сам, либо общается с ним только через <code>postMessage</code>.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <IframeViz
        caseId={caseId}
        access={access}
        bridge={bridge}
        sandboxValue={sandboxValue}
        childStatus={childStatus}
        frameVersion={frameVersion}
        frameRef={frameRef}
        onFrameLoad={handleFrameLoad}
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
    <div className={shell.codePane}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            onClick={() => resetViz(item.id)}
          >
            {item.label}
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
      title="iframe"
      lead="Живой стенд: магазин булочек встраивает мини-приложение и показывает разницу между обычным `iframe` и `sandbox`."
      problem={problem}
      code={code}
    />
  )
}

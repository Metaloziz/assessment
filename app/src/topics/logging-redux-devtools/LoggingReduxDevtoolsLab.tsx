import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '144-logging-redux-devtools'

type Mode = 'trace' | 'travel' | 'sanitize'

const INIT = { cart: [] as string[], total: 0 }

export function LoggingReduxDevtoolsLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('trace')
  const [hint, setHint] = useState<string | null>(null)
  const [history, setHistory] = useState(() => [
    { action: '@@INIT', state: INIT },
    { action: 'cart/add', state: { cart: ['sku-1'], total: 10 } },
    { action: 'cart/add', state: { cart: ['sku-1', 'sku-2'], total: 25 } },
    { action: 'cart/clear', state: INIT },
  ])
  const [cursor, setCursor] = useState(3)

  const run = () => {
    clear()
    if (mode === 'trace') {
      log('info', 'dispatch cart/add { id: "sku-2" }')
      log('ok', 'DevTools: action + state before/after + diff')
      log('ok', 'см. «Код» → store.js (devTools: true в DEV)')
      setHint('журнал actions — панель Redux DevTools')
      return
    }
    if (mode === 'travel') {
      const prev = Math.max(0, cursor - 1)
      setCursor(prev)
      const snap = history[prev]!
      log('info', `jump to #${prev}: ${snap.action}`)
      log('ok', `state: ${JSON.stringify(snap.state)}`)
      log('info', 'UI перерисуется от снимка без reload')
      setHint(`time travel → #${prev} ${snap.action}`)
      return
    }
    log('warn', 'action auth/setToken payload содержит secret')
    log('ok', 'actionSanitizer → "<<hidden>>" в DevTools')
    log('err', 'без sanitizer токен виден в истории расширения')
    setHint('см. «Код» → sanitizers в configureStore')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Баг в Redux проще искать по журналу actions, чем по россыпи <code>console.log</code>. Здесь —
        сценарии панели; подключение store — во вкладке «Код».
      </p>
      <ol className={shell.steps}>
        <li>Выберите Trace, Time travel или Sanitize.</li>
        <li>
          Откройте «Код»: <code>store.js</code>, reducer — блоки DevTools помечены.
        </li>
        <li>Сверьте лог с опциями <code>devTools</code> / sanitizer.</li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'trace'}
          onClick={() => setMode('trace')}
        >
          Trace
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'travel'}
          onClick={() => setMode('travel')}
        >
          Time travel
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'sanitize'}
          onClick={() => setMode('sanitize')}
        >
          Sanitize
        </LabButton>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
            setCursor(history.length - 1)
            setHistory([
              { action: '@@INIT', state: INIT },
              { action: 'cart/add', state: { cart: ['sku-1'], total: 10 } },
              { action: 'cart/add', state: { cart: ['sku-1', 'sku-2'], total: 25 } },
              { action: 'cart/clear', state: INIT },
            ])
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.hint}>
        История (учебная):{' '}
        {history.map((h, i) => (
          <code key={i} style={{ opacity: i === cursor ? 1 : 0.45, marginRight: 6 }}>
            #{i} {h.action}
          </code>
        ))}
      </p>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите режим.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="RTK `configureStore` + sanitizers; reducer без мутаций."
      snippets={[
        {
          id: 'store',
          label: 'store.js',
          note: 'DevTools в development; в prod выключить. Sanitizer прячет секреты.',
          executable: false,
          code: `import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './cartSlice';

// ═══════════════════════════════════════════
// REDUX DEVTOOLS ← журнал actions + time travel
// Расширение читает store через enhancer RTK
// ═══════════════════════════════════════════
export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },

  // ═══════════════════════════════════════════
  // DEV ONLY ← на проде не светить state / overhead
  // ═══════════════════════════════════════════
  devTools:
    process.env.NODE_ENV !== 'production'
      ? {
          name: 'shop-app', // ← имя в панели расширения

          // ═══════════════════════════════════════════
          // SANITIZE ← не писать токены в историю DevTools
          // ═══════════════════════════════════════════
          actionSanitizer: (action) =>
            action.type === 'auth/setToken'
              ? { ...action, payload: '<<hidden>>' }
              : action,
          stateSanitizer: (state) => ({
            ...state,
            auth: state.auth
              ? { ...state.auth, token: '<<hidden>>' }
              : state.auth,
          }),
        }
      : false,
});`,
        },
        {
          id: 'slice',
          label: 'cartSlice.js',
          note: 'Иммутабельные обновления — иначе time-travel врёт.',
          executable: false,
          code: `import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], total: 0 },
  reducers: {
    // ═══════════════════════════════════════════
    // ACTIONS ← каждый dispatch попадает в DevTools
    // ═══════════════════════════════════════════
    addItem(state, action) {
      // RTK + Immer: «мутация» → новый state под капотом
      state.items.push(action.payload); // ← видно в diff
      state.total += action.payload.price;
    },
    clear(state) {
      state.items = [];
      state.total = 0;
    },
  },
});

export const { addItem, clear } = cartSlice.actions;
export default cartSlice.reducer;

// В компоненте:
// dispatch(addItem({ id: 'sku-2', price: 15 }));
// → Redux DevTools: cart/add · diff items/total`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Redux DevTools"
      lead="Сценарии журнала и time-travel; подключение store — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}

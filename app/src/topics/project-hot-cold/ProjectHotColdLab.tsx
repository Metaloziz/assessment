import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '03-build-hot-cold'

type Kind = 'hot' | 'cold'

export function ProjectHotColdLab() {
  const { lines, log, clear } = useLabLog()
  const [kind, setKind] = useState<Kind>('hot')
  const [cache, setCache] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()
    if (kind === 'hot') {
      log('info', 'save Button.tsx')
      log('ok', 'incremental: пересобран подграф (3 модуля)')
      log('ok', 'HMR patch → UI без full reload — см. «Код» → webpack.dev.js')
      log('info', 'не трогали: vendor, несвязанные роуты')
      setHint('hot: HMR + incremental — смотри webpack.dev.js')
      return
    }
    const base = 42
    const withCache = cache ? 11 : base
    log('info', 'cold production build')
    log(cache ? 'ok' : 'err', cache ? 'filesystem cache HIT' : 'cache MISS — полная работа')
    log('info', `учебное время: ${withCache}s (без кеша ~${base}s)`)
    log('ok', 'рычаги: cache + SWC — см. webpack.prod.js')
    setHint(cache ? 'повторный cold быстрее — cache HIT' : 'первый cold дорогой — cache MISS')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Hot и cold ускоряют разными рычагами. Здесь сравните save vs полную сборку; рычаги в
        конфигах — во вкладке «Код».
      </p>
      <ol className={shell.steps}>
        <li>
          Выберите <code>hot</code> или <code>cold</code> (для cold — filesystem cache).
        </li>
        <li>
          Откройте «Код»: <code>webpack.dev.js</code>, <code>webpack.prod.js</code>, Vite — блоки
          помечены комментариями.
        </li>
        <li>Сверьте лог с помеченными рычагами.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="ghost" size="sm" active={kind === 'hot'} onClick={() => setKind('hot')}>
          hot
        </LabButton>
        <LabButton variant="ghost" size="sm" active={kind === 'cold'} onClick={() => setKind('cold')}>
          cold
        </LabButton>
        {kind === 'cold' ? (
          <LabButton variant="ghost" size="sm" active={cache} onClick={() => setCache((v) => !v)}>
            cache {cache ? 'ON' : 'OFF'}
          </LabButton>
        ) : null}
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
            setCache(false)
          }}
        >
          Сброс
        </LabButton>
      </div>

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
      intro="Hot: HMR и lazy compilation; cold: filesystem cache и SWC/esbuild."
      snippets={[
        {
          id: 'webpack-dev',
          label: 'webpack.dev.js',
          note: 'Hot: HMR, watch, lazy compilation — узкая работа на save.',
          executable: false,
          code: `const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'development',

  // ═══════════════════════════════════════════
  // HOT ← быстрый feedback на save
  // ═══════════════════════════════════════════
  devtool: 'eval-cheap-module-source-map',

  devServer: {
    hot: true, // ← HMR: патч модуля, не full reload
    port: 3000,
  },

  watchOptions: {
    ignored: /node_modules/, // ← не смотреть лишнее
  },

  // ═══════════════════════════════════════════
  // INCREMENTAL ← не компилировать неоткрытые роуты
  // ═══════════════════════════════════════════
  experiments: {
    lazyCompilation: true, // ← compile on demand
  },
});`,
        },
        {
          id: 'webpack-prod',
          label: 'webpack.prod.js',
          note: 'Cold: filesystem cache + быстрый transpile (SWC). Повторный cold дешевле.',
          executable: false,
          code: `const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'production',

  // ═══════════════════════════════════════════
  // COLD CACHE ← повторная полная сборка быстрее первого раза
  // CI: кешировать .webpack-cache / node_modules
  // ═══════════════════════════════════════════
  cache: {
    type: 'filesystem', // ← persistent cache на диск
    buildDependencies: {
      config: [__filename],
    },
  },

  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        exclude: /node_modules/,
        // ═══════════════════════════════════════════
        // FAST TRANSPILE ← SWC/esbuild вместо тяжёлого Babel на всём
        // ═══════════════════════════════════════════
        use: 'swc-loader', // ← быстрый transpile
      },
    ],
  },

  // меньше source maps в prod → меньше работы на cold
  devtool: 'source-map',
});`,
        },
        {
          id: 'vite-config',
          label: 'vite.config.js',
          note: 'Vite hot: native ESM по запросу; deps заранее через esbuild.',
          executable: false,
          code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // ═══════════════════════════════════════════
  // HOT (Vite) ← модули по запросу, не бандлить всё в dev
  // ═══════════════════════════════════════════
  server: {
    hmr: true, // ← HMR из коробки
  },

  optimizeDeps: {
    // ← prebundle тяжёлых deps через esbuild (один раз)
    include: ['react', 'react-dom'],
  },

  // ═══════════════════════════════════════════
  // COLD (Vite build) ← esbuild minify по умолчанию
  // ═══════════════════════════════════════════
  build: {
    target: 'esnext',
    minify: 'esbuild', // ← быстрый minify на prod build
    sourcemap: true,
  },
});`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Hot vs cold сборка"
      lead="Сравнение hot save и cold cache; webpack.dev/prod и Vite — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}

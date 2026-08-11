import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '05-module-federation-babel-postcss'

type Mode = 'mf' | 'babel'

export function ProjectFederationLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('mf')
  const [src, setSrc] = useState('console.log(OLD + OLD)')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()
    if (mode === 'mf') {
      log('info', 'Host: remotes.shop = shop@/remoteEntry.js')
      log('info', 'Remote: exposes ./ProductCard')
      log('ok', 'shared: react singleton — одна копия')
      log('ok', 'см. «Код» → webpack.host.js / webpack.remote.js')
      setHint('host ↔ remote + shared — смотри MF-конфиги')
      return
    }
    const out = src.replace(/\bOLD\b/g, 'NEW')
    log('info', 'parse → visitor(Identifier) → generate')
    log('info', `in:  ${src}`)
    log('ok', `out: ${out}`)
    log('ok', 'реальный visitor — «Код» → babel-plugin-rename-old.js')
    setHint(out === src ? 'нечего менять' : 'OLD → NEW (учебный regex ≈ идея visitor)')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Module Federation делит UI в runtime; Babel/PostCSS правят AST. Здесь — схема MF и учебный
        visitor; конфиги и плагины — во вкладке «Код».
      </p>
      <ol className={shell.steps}>
        <li>Режим Federation — схема host/remote/shared в логе.</li>
        <li>
          Режим Babel — строка с <code>OLD</code>; сверьте с visitor в «Код».
        </li>
        <li>
          Откройте «Код»: MF-конфиги, <code>babel-plugin-…</code>, <code>postcss-plugin-…</code>.
        </li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="ghost" size="sm" active={mode === 'mf'} onClick={() => setMode('mf')}>
          Federation
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'babel'}
          onClick={() => setMode('babel')}
        >
          Babel visitor
        </LabButton>
      </div>

      <div className={shell.row}>
        {mode === 'babel' ? (
          <label className={shell.field}>
            <span>исходник</span>
            <input value={src} onChange={(e) => setSrc(e.target.value)} spellCheck={false} />
          </label>
        ) : null}
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
            setSrc('console.log(OLD + OLD)')
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
      intro="MF: host / remote / shared; Babel и PostCSS — visitor по AST."
      snippets={[
        {
          id: 'webpack-remote',
          label: 'webpack.remote.js',
          note: 'Remote: exposes + shared. Отдаёт remoteEntry.js.',
          executable: false,
          code: `const { ModuleFederationPlugin } = require('webpack').container;
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    publicPath: 'auto',
    uniqueName: 'shop',
  },
  plugins: [
    // ═══════════════════════════════════════════
    // MF REMOTE ← приложение-поставщик модулей
    // ═══════════════════════════════════════════
    new ModuleFederationPlugin({
      name: 'shop',
      filename: 'remoteEntry.js', // ← манифест для host

      // ═══════════════════════════════════════════
      // EXPOSES ← что можно import('shop/…') с host
      // ═══════════════════════════════════════════
      exposes: {
        './ProductCard': './src/ProductCard', // ← публичный модуль
      },

      // ═══════════════════════════════════════════
      // SHARED ← одна копия React на host и remote
      // ═══════════════════════════════════════════
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
    new HtmlWebpackPlugin({ template: './src/index.html' }),
  ],
};`,
        },
        {
          id: 'webpack-host',
          label: 'webpack.host.js',
          note: 'Host: remotes + тот же shared. Lazy-import с remote.',
          executable: false,
          code: `const { ModuleFederationPlugin } = require('webpack').container;
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/bootstrap.js',
  output: {
    publicPath: 'auto',
    uniqueName: 'shell',
  },
  plugins: [
    // ═══════════════════════════════════════════
    // MF HOST ← оболочка, тянет remote в runtime
    // ═══════════════════════════════════════════
    new ModuleFederationPlugin({
      name: 'shell',

      // ═══════════════════════════════════════════
      // REMOTES ← откуда грузить remoteEntry.js
      // ═══════════════════════════════════════════
      remotes: {
        shop: 'shop@http://localhost:3001/remoteEntry.js', // ← URL remote
      },

      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
    new HtmlWebpackPlugin({ template: './src/index.html' }),
  ],
};

// ── src/App.jsx (host) ───────────────────────
// const ProductCard = React.lazy(() => import('shop/ProductCard'));
// ← runtime: fetch remoteEntry → загрузить expose`,
        },
        {
          id: 'babel-plugin',
          label: 'babel-plugin-rename-old.js',
          note: 'Babel plugin = visitor по JS-AST. Не regex по всему файлу.',
          executable: false,
          code: `// ═══════════════════════════════════════════
// BABEL PLUGIN ← visitor по типам узлов JS-AST
// Пайплайн: parse → transform → generate
// ═══════════════════════════════════════════
module.exports = function renameOld({ types: t }) {
  return {
    name: 'rename-old',
    visitor: {
      // ← вызывается для каждого Identifier в дереве
      Identifier(path) {
        if (path.node.name === 'OLD') {
          path.node.name = 'NEW'; // ← правка узла, не строки файла
        }
      },

      // пример: можно ходить и по другим типам
      // CallExpression(path) { … }
    },
  };
};

// .babelrc: { "plugins": ["./babel-plugin-rename-old.js"] }
// Отладка AST: https://astexplorer.net/`,
        },
        {
          id: 'postcss-plugin',
          label: 'postcss-plugin-remove-comments.js',
          note: 'PostCSS plugin = хуки по CSS-AST (Once, Rule, Declaration).',
          executable: false,
          code: `// ═══════════════════════════════════════════
// POSTCSS PLUGIN ← хуки по CSS-AST
// Тот же принцип: дерево, не «поиск-замена» текста
// ═══════════════════════════════════════════
const plugin = () => ({
  postcssPlugin: 'remove-comments', // ← имя плагина

  // ← Once: один проход по корню после parse
  Once(root) {
    root.walkComments((comment) => {
      comment.remove();
    });
  },

  // другие хуки: Rule(rule) { … }, Declaration(decl) { … }
});

plugin.postcss = true; // ← маркер PostCSS 8
module.exports = plugin;

// postcss.config.js: module.exports = { plugins: [require('./postcss-plugin-remove-comments')] }`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Federation и AST-плагины"
      lead="Схема MF и учебный visitor; host/remote и плагины — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}

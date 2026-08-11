import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '140-project-prod-dev-plugins'

const CHUNKS = [
  { name: 'vendor', kb: 180, color: '#69b1ff' },
  { name: 'main', kb: 95, color: '#4db784' },
  { name: 'locale', kb: 40, color: '#e8b86d' },
]

type Env = 'dev' | 'prod'

export function ProjectProdDevPluginsLab() {
  const { lines, log, clear } = useLabLog()
  const [env, setEnv] = useState<Env>('dev')
  const [hint, setHint] = useState<string | null>(null)

  const total = CHUNKS.reduce((s, c) => s + c.kb, 0)

  const run = () => {
    clear()
    if (env === 'dev') {
      log('info', 'merge(common, webpack.dev.js)')
      log('ok', 'devtool: eval-cheap-module-source-map')
      log('ok', 'devServer.hot: true — см. «Код» → webpack.dev.js')
      log('err', 'Terser / contenthash / analyzer — не в dev')
      setHint('dev = DX; смотри webpack.dev.js')
      return
    }
    log('info', 'merge(common, webpack.prod.js)')
    log('ok', 'mode: production + contenthash')
    log('ok', 'HtmlWebpackPlugin уже в common — inject после emit')
    log('ok', 'TerserPlugin + BundleAnalyzerPlugin — см. webpack.prod.js')
    log('info', 'analyzer: ' + CHUNKS.map((c) => `${c.name}=${c.kb}kb`).join(', '))
    setHint(`prod ~${total}kb — сверь с полосками и «Код»`)
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Common + dev/prod через <code>webpack-merge</code>, HtmlWebpackPlugin, Terser и analyzer
        живут в разных файлах. Здесь — пресеты и доли чанков; конфиги — во вкладке «Код».
      </p>
      <ol className={shell.steps}>
        <li>
          Переключите <code>dev</code> / <code>prod</code> и нажмите «Собрать пресет».
        </li>
        <li>
          Откройте «Код»: <code>webpack.common.js</code>, <code>.dev.js</code>, <code>.prod.js</code> —
          блоки темы помечены комментариями.
        </li>
        <li>Сверьте лог с помеченными плагинами; полоски — учебная карта analyzer.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="ghost" size="sm" active={env === 'dev'} onClick={() => setEnv('dev')}>
          dev
        </LabButton>
        <LabButton variant="ghost" size="sm" active={env === 'prod'} onClick={() => setEnv('prod')}>
          prod
        </LabButton>
        <LabButton variant="primary" onClick={run}>
          Собрать пресет
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
          }}
        >
          Сброс
        </LabButton>
      </div>

      <div
        style={{
          display: 'flex',
          height: 28,
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {CHUNKS.map((c) => (
          <div
            key={c.name}
            title={`${c.name}: ${c.kb}kb`}
            style={{
              width: `${(c.kb / total) * 100}%`,
              background: c.color,
              opacity: env === 'prod' ? 1 : 0.45,
            }}
          />
        ))}
      </div>
      <p className={shell.hint}>{CHUNKS.map((c) => `${c.name} ${c.kb}kb`).join(' · ')}</p>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите окружение.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="`webpack-merge`: common / dev / prod; HtmlWebpackPlugin, Terser, analyzer."
      snippets={[
        {
          id: 'webpack-common',
          label: 'webpack.common.js',
          note: 'Общее: entry, rules, HtmlWebpackPlugin. Env-специфика — в dev/prod.',
          executable: false,
          code: `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\\.jsx?$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },

  // ═══════════════════════════════════════════
  // HTML ← HtmlWebpackPlugin (общий для dev и prod)
  // Подставит <script>/<link> после emit — не хардкодьте [hash] в шаблоне.
  // ═══════════════════════════════════════════
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html', // ← шаблон без ручных hashed имён
      inject: 'body',
    }),
  ],
};`,
        },
        {
          id: 'webpack-dev',
          label: 'webpack.dev.js',
          note: 'Только DX: source maps и HMR. Без Terser и analyzer.',
          executable: false,
          code: `const { merge } = require('webpack-merge');
const common = require('./webpack.common');

// ═══════════════════════════════════════════
// MERGE ← common + dev (npm run dev → этот файл)
// ═══════════════════════════════════════════
module.exports = merge(common, {
  mode: 'development',

  output: {
    filename: '[name].js', // ← без contenthash — быстрее rebuild
  },

  // ═══════════════════════════════════════════
  // DEV ← скорость и отладка
  // ═══════════════════════════════════════════
  devtool: 'eval-cheap-module-source-map',

  devServer: {
    hot: true, // ← HMR
    port: 3000,
    historyApiFallback: true,
  },

  // Terser / BundleAnalyzer — не сюда (ломают feedback loop)
});`,
        },
        {
          id: 'webpack-prod',
          label: 'webpack.prod.js',
          note: 'Prod: contenthash, Terser, analyzer. CSS minify — отдельный плагин.',
          executable: false,
          code: `const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const common = require('./webpack.common');

// ═══════════════════════════════════════════
// MERGE ← common + prod (npm run build → этот файл)
// ═══════════════════════════════════════════
module.exports = merge(common, {
  mode: 'production',

  output: {
    // ═══════════════════════════════════════════
    // CACHE ← contenthash для долгого кеша в браузере
    // ═══════════════════════════════════════════
    filename: '[name].[contenthash].js', // ← HtmlWebpackPlugin подставит имя в HTML
  },

  // ═══════════════════════════════════════════
  // TERSER ← minify JS (CSS — css-minimizer, не Terser)
  // ═══════════════════════════════════════════
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: { passes: 2 },
          mangle: true, // ← короткие имена
        },
      }),
    ],
  },

  plugins: [
    // ═══════════════════════════════════════════
    // ANALYZER ← карта чанков после build (static report)
    // Ищите дубликаты React, лишние locale, раздутый vendor.
    // ═══════════════════════════════════════════
    new BundleAnalyzerPlugin({
      analyzerMode: 'static', // ← отчёт в файл, не UI-сервер
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }),
  ],

  // HtmlWebpackPlugin уже в common — после emit вставит hashed <script>
});`,
        },
        {
          id: 'package-scripts',
          label: 'package.json (scripts)',
          note: 'Разные entry-конфиги на окружение — не один файл с гигантским if.',
          executable: false,
          languageLabel: 'json',
          code: `{
  "name": "shop-app",
  "private": true,

  // ═══════════════════════════════════════════
  // SCRIPTS ← какой конфиг на какое окружение
  // ═══════════════════════════════════════════
  "scripts": {
    "dev": "webpack serve --config webpack.dev.js",
    "build": "webpack --config webpack.prod.js",
    "analyze": "webpack --config webpack.prod.js"
  },

  "devDependencies": {
    "webpack": "^5.95.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^5.1.0",
    "webpack-merge": "^6.0.1",
    "html-webpack-plugin": "^5.6.0",
    "terser-webpack-plugin": "^5.3.10",
    "webpack-bundle-analyzer": "^4.10.2"
  }
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="prod/dev, analyzer, Html, Terser"
      lead="Пресеты окружений и карта чанков; конфиги common/dev/prod — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}

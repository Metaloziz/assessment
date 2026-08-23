import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ProjectProdDevPluginsLab.module.css'

const TOPIC_ID = '140-project-prod-dev-plugins'

type Env = 'dev' | 'prod'

const ENVS: Array<{ id: Env; label: string }> = [
  { id: 'dev', label: 'dev' },
  { id: 'prod', label: 'prod' },
]

const CHUNKS = [
  { name: 'vendor', kb: 180, color: '#69b1ff' },
  { name: 'main', kb: 95, color: '#4db784' },
  { name: 'locale', kb: 40, color: '#e8b86d' },
]

const TOTAL_KB = CHUNKS.reduce((s, c) => s + c.kb, 0)

const CASE_BRIEF: Record<Env, ReactNode> = {
  dev: (
    <>
      <code>merge(common, dev)</code> — source maps и HMR; без <code>contenthash</code>, Terser и
      analyzer, чтобы не тормозить цикл правок.
    </>
  ),
  prod: (
    <>
      <code>merge(common, prod)</code> — <code>contenthash</code>, Terser и analyzer после build;
      полоски ниже — учебная карта «кто съел килобайты».
    </>
  ),
}

const CODE_INTRO: Record<Env, string> = {
  dev: '`webpack.common.js` + `webpack.dev.js`: общее через merge, DX только в dev.',
  prod: '`webpack.common.js` + `webpack.prod.js`: HtmlWebpackPlugin в common, Terser и analyzer в prod.',
}

const COMMON_SNIPPET: InteractiveSnippet = {
  id: 'webpack-common',
  label: 'webpack.common.js',
  note: 'Entry, rules и `HtmlWebpackPlugin` — общие для dev и prod.',
  executable: false,
  code: `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      { test: /\\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' },
      { test: /\\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },

  // ═══════════════════════════════════════════
  // HTML ← HtmlWebpackPlugin (dev и prod)
  // Подставит <script>/<link> после emit — не хардкодьте [hash] в шаблоне.
  // ═══════════════════════════════════════════
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      inject: 'body',
    }),
  ],
};`,
}

const DEV_SNIPPET: InteractiveSnippet = {
  id: 'webpack-dev',
  label: 'webpack.dev.js',
  note: 'Только DX: maps и HMR. Terser и analyzer — не сюда.',
  executable: false,
  code: `const { merge } = require('webpack-merge');
const common = require('./webpack.common');

// npm run dev → webpack serve --config webpack.dev.js

// ═══════════════════════════════════════════
// MERGE ← common + dev
// ═══════════════════════════════════════════
module.exports = merge(common, {
  mode: 'development',
  output: { filename: '[name].js' }, // ← без contenthash — быстрее rebuild

  // ═══════════════════════════════════════════
  // DEV ← скорость и отладка
  // ═══════════════════════════════════════════
  devtool: 'eval-cheap-module-source-map',
  devServer: { hot: true, port: 3000, historyApiFallback: true },
});`,
}

const PROD_SNIPPET: InteractiveSnippet = {
  id: 'webpack-prod',
  label: 'webpack.prod.js',
  note: 'Prod: contenthash, Terser, analyzer. CSS minify — отдельный плагин.',
  executable: false,
  code: `const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const common = require('./webpack.common');

// npm run build → webpack --config webpack.prod.js

// ═══════════════════════════════════════════
// MERGE ← common + prod
// ═══════════════════════════════════════════
module.exports = merge(common, {
  mode: 'production',
  output: { filename: '[name].[contenthash].js' }, // ← HtmlWebpackPlugin подставит в HTML

  // ═══════════════════════════════════════════
  // TERSER ← minify JS (CSS — css-minimizer)
  // ═══════════════════════════════════════════
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: { compress: { passes: 2 }, mangle: true },
      }),
    ],
  },

  plugins: [
    // ═══════════════════════════════════════════
    // ANALYZER ← карта чанков после build
    // ═══════════════════════════════════════════
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }),
  ],
});`,
}

const SNIPPETS_BY_ENV: Record<Env, InteractiveSnippet[]> = {
  dev: [COMMON_SNIPPET, DEV_SNIPPET],
  prod: [COMMON_SNIPPET, PROD_SNIPPET],
}

function EnvSwitch({ value, onChange }: { value: Env; onChange: (env: Env) => void }) {
  return (
    <div className={shell.row}>
      {ENVS.map((e) => (
        <LabButton
          key={e.id}
          variant="ghost"
          size="sm"
          active={value === e.id}
          onClick={() => onChange(e.id)}
        >
          {e.label}
        </LabButton>
      ))}
    </div>
  )
}

function AnalyzerViz({ env, active }: { env: Env; active: boolean }) {
  const lit = active && env === 'prod'
  const meta = !active
    ? 'ожидание'
    : env === 'dev'
      ? 'analyzer выключен'
      : `~${TOTAL_KB} kb · vendor / main / locale`

  return (
    <LabVizPanel title="Состав бандла" meta={meta}>
      <div className={styles.analyzerBar}>
        {CHUNKS.map((c) => (
          <div
            key={c.name}
            title={`${c.name}: ${c.kb}kb`}
            className={styles.segment}
            style={{
              width: `${(c.kb / TOTAL_KB) * 100}%`,
              background: c.color,
              opacity: lit ? 1 : 0.35,
            }}
          />
        ))}
      </div>
      <p className={styles.legend}>{CHUNKS.map((c) => `${c.name} ${c.kb}kb`).join(' · ')}</p>
    </LabVizPanel>
  )
}

export function ProjectProdDevPluginsLab() {
  const { lines, log, clear } = useLabLog()
  const [env, setEnv] = useState<Env>('dev')
  const [ran, setRan] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const reset = () => {
    clear()
    setRan(false)
    setHint(null)
  }

  const pickEnv = (next: Env) => {
    setEnv(next)
    reset()
  }

  const run = () => {
    clear()
    setRan(true)
    if (env === 'dev') {
      log('info', 'merge(common, webpack.dev.js)')
      log('ok', 'devtool + devServer.hot')
      log('err', 'Terser / contenthash / analyzer — не в dev')
      setHint('dev — только DX; prod-плагины в webpack.prod.js')
      return
    }
    log('info', 'merge(common, webpack.prod.js)')
    log('ok', 'contenthash + Terser + analyzer')
    log('info', CHUNKS.map((c) => `${c.name}=${c.kb}kb`).join(', '))
    setHint(`prod ~${TOTAL_KB}kb — сверь с полосками и webpack.prod.js`)
  }

  const problem = (
    <div className={shell.panel}>
      <EnvSwitch value={env} onChange={pickEnv} />

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Один <code>webpack.config.js</code> с <code>if (isProd)</code> быстро превращается в кашу —
        общее выносят в <code>common</code>, отличия окружения склеивают через{' '}
        <code>webpack-merge</code>.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[env]}</p>

      <AnalyzerViz env={env} active={ran} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}

      {ran ? <LabLogView lines={lines} /> : null}
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <EnvSwitch value={env} onChange={pickEnv} />
      <InteractiveCodePanel
        key={env}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[env]}
        snippets={SNIPPETS_BY_ENV[env]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="prod/dev, analyzer, Html, Terser"
      lead="Common + dev/prod через merge; HtmlWebpackPlugin, Terser и analyzer — на вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}

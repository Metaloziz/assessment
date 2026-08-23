import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '139-project-scripts-hmr-treeshake'

type Mode = 'scripts' | 'hmr' | 'shake' | 'minify'

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'scripts', label: 'Скрипты' },
  { id: 'hmr', label: 'HMR' },
  { id: 'shake', label: 'Tree shake' },
  { id: 'minify', label: 'Minify' },
]

const CASE_BRIEF: Record<Mode, ReactNode> = {
  scripts: (
    <>
      <code>npm run dev</code> и <code>npm run build</code> — один контракт для команды и CI, без
      запоминания флагов webpack.
    </>
  ),
  hmr: (
    <>
      Сохранили файл — dev-server подменяет модуль; state формы может сохраниться без полной
      перезагрузки страницы.
    </>
  ),
  shake: (
    <>
      В prod из бандла может исчезнуть <code>dead</code>, если entry импортирует только{' '}
      <code>used</code> и нет побочных эффектов на import.
    </>
  ),
  minify: (
    <>
      Production сжимает имена и пробелы в JS; gzip на CDN — отдельный шаг поверх minify.
    </>
  ),
}

const CODE_INTRO: Record<Mode, string> = {
  scripts: 'Блок `scripts` в `package.json` — точка входа для dev, build и lint.',
  hmr: '`devServer.hot` включает HMR; `module.hot.accept` — модуль принимает патч.',
  shake: 'ESM-экспорты + `usedExports` + `sideEffects` — кандидаты на удаление в prod.',
  minify: '`mode: production` и `TerserPlugin` в `optimization.minimizer` сжимают JS.',
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'package-json',
    label: 'package.json',
    note: 'Блок `scripts` — контракт для людей и CI. `sideEffects` помогает tree shaking.',
    executable: false,
    languageLabel: 'json',
    code: `{
  "name": "shop-app",
  "version": "1.4.2",
  "private": true,

  // ═══════════════════════════════════════════
  // SCRIPTS ← стартовые скрипты (npm run / yarn)
  // ═══════════════════════════════════════════
  "scripts": {
    "dev": "webpack serve --config webpack.config.js --mode development",
    "build": "webpack --config webpack.config.js --mode production",
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "test": "vitest run"
  },

  // ═══════════════════════════════════════════
  // TREE SHAKING ← подсказка бандлеру (для пакетов-библиотек)
  // false = можно выкидывать неиспользуемые модули целиком
  // ═══════════════════════════════════════════
  "sideEffects": false,

  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "webpack": "^5.95.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^5.1.0",
    "terser-webpack-plugin": "^5.3.10"
  }
}`,
  },
  {
    id: 'webpack-config',
    label: 'webpack.config.js',
    note: 'HMR — `devServer.hot`; shaking — `usedExports`; minify — `TerserPlugin` в production.',
    executable: false,
    code: `const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    mode: argv.mode || 'development',
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? '[name].[contenthash].js' : '[name].js',
      clean: true,
    },

    // ═══════════════════════════════════════════
    // HMR ← hot module replacement (только dev-сервер)
    // Не путать с live reload (полная перезагрузка страницы).
    // ═══════════════════════════════════════════
    devServer: {
      hot: true, // ← HMR включён
      port: 3000,
      historyApiFallback: true,
    },

    // ═══════════════════════════════════════════
    // TREE SHAKING ← помечаем используемые exports (ESM)
    // Вместе с "sideEffects" в package.json режет мёртвый код в prod.
    // ═══════════════════════════════════════════
    optimization: {
      usedExports: true, // ← помечает неиспользуемые export'ы
      minimize: isProd,
      minimizer: isProd
        ? [
            // ═══════════════════════════════════════════
            // MINIFY ← Terser сжимает JS в production
            // ═══════════════════════════════════════════
            new TerserPlugin({
              parallel: true,
              terserOptions: {
                compress: { passes: 2 },
                mangle: true, // ← короткие имена
              },
            }),
          ]
        : [],
    },

    module: {
      rules: [
        {
          test: /\\.jsx?$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
      ],
    },

    devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',
  };
};`,
  },
  {
    id: 'src-modules',
    label: 'src/utils.js + index.js',
    note: 'Tree shaking: `dead` не импортируется из entry — кандидат на удаление в prod.',
    executable: false,
    code: `// ── src/utils.js ─────────────────────────────
// TREE SHAKING: оба export'а; entry берёт только used

export function used() {
  return 1;
}

export function dead() {
  // ← не импортируется → в prod ESM может исчезнуть из бандла
  return 2;
}

// ── src/index.js (entry) ─────────────────────
import { used } from './utils';
// dead не импортируем

console.log(used());

// HMR (опционально принять обновление модуля):
if (module.hot) {
  // ← HMR: модуль умеет горячо обновляться
  module.hot.accept('./utils', () => {
    console.log('utils updated via HMR');
  });
}`,
  },
]

function ModeSwitch({ value, onChange }: { value: Mode; onChange: (id: Mode) => void }) {
  return (
    <div className={shell.row}>
      {MODES.map((m) => (
        <LabButton
          key={m.id}
          variant="ghost"
          size="sm"
          active={value === m.id}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </LabButton>
      ))}
    </div>
  )
}

function ModeViz({ mode, active }: { mode: Mode; active: boolean }) {
  const dim = active ? 1 : 0.35

  if (mode === 'scripts') {
    return (
      <div style={{ display: 'grid', gap: 8, opacity: dim }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <code>npm run dev</code>
          <span>→</span>
          <code>webpack serve</code>
          <span>→</span>
          <span>HMR</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <code>npm run build</code>
          <span>→</span>
          <code>mode production</code>
          <span>→</span>
          <span>shake + minify</span>
        </div>
      </div>
    )
  }

  if (mode === 'hmr') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          opacity: dim,
        }}
      >
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: active ? 'rgba(255, 107, 107, 0.12)' : 'transparent',
          }}
        >
          <strong>Live reload</strong>
          <div style={{ marginTop: 4, fontSize: 13 }}>state формы: сброшен</div>
        </div>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: active ? 'rgba(77, 183, 132, 0.12)' : 'transparent',
          }}
        >
          <strong>HMR</strong>
          <div style={{ marginTop: 4, fontSize: 13 }}>state формы: сохранён</div>
        </div>
      </div>
    )
  }

  if (mode === 'shake') {
    const chips = active
      ? [{ name: 'used', on: true }]
      : [
          { name: 'used', on: true },
          { name: 'dead', on: true },
        ]
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', opacity: dim }}>
        {chips.map((c) => (
          <span
            key={c.name}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: c.on ? 'rgba(105, 177, 255, 0.18)' : 'transparent',
              textDecoration: c.on ? 'none' : 'line-through',
            }}
          >
            {c.name}
          </span>
        ))}
        {active ? (
          <span style={{ fontSize: 13, alignSelf: 'center' }}>в бандле prod</span>
        ) : (
          <span style={{ fontSize: 13, alignSelf: 'center' }}>до shaking</span>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 13, opacity: dim }}>
      <code style={{ opacity: active ? 0.45 : 1 }}>
        function calculateTotalPrice(items) {'{'} … {'}'}
      </code>
      {active ? (
        <code>function a(b){'{'}return b.reduce(…){'}'}</code>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>после minify — короче</span>
      )}
    </div>
  )
}

export function ProjectScriptsHmrTreeshakeLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('scripts')
  const [ran, setRan] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const reset = () => {
    clear()
    setRan(false)
    setHint(null)
  }

  const pickMode = (next: Mode) => {
    setMode(next)
    reset()
  }

  const run = () => {
    clear()
    setRan(true)
    if (mode === 'scripts') {
      log('ok', 'dev → webpack serve + HMR')
      log('ok', 'build → production + shake + minify')
      setHint('scripts — контракт команды; детали во вкладке «Код» → package.json')
      return
    }
    if (mode === 'hmr') {
      log('err', 'live reload: полная перезагрузка, state сброшен')
      log('ok', 'HMR: патч модуля, state сохранён')
      setHint('HMR ≠ live reload — см. devServer.hot в webpack.config.js')
      return
    }
    if (mode === 'shake') {
      log('info', 'utils.js: used + dead; index импортирует только used')
      log('ok', 'prod + usedExports: dead выпал из бандла')
      log('err', 'CJS или side effects на import — shaking ломается')
      setHint('см. src/utils.js и sideEffects в package.json')
      return
    }
    log('info', 'mode: production → minimize: true')
    log('ok', 'TerserPlugin в optimization.minimizer')
    log('info', 'minify ≠ gzip на CDN')
    setHint('см. блок MINIFY в webpack.config.js')
  }

  const problem = (
    <div className={shell.panel}>
      <ModeSwitch value={mode} onChange={pickMode} />

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        <code>package.json</code> scripts, HMR, tree shaking и minify настраиваются в разных местах
        конфига — здесь контраст режимов, детали во вкладке «Код».
      </p>
      <p className={shell.hint}>{CASE_BRIEF[mode]}</p>

      <ModeViz mode={mode} active={ran} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}

      {ran ? <LabLogView lines={lines} /> : null}
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <ModeSwitch value={mode} onChange={pickMode} />
      <InteractiveCodePanel
        key={mode}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[mode]}
        snippets={SNIPPETS}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Scripts, HMR, shaking, minify"
      lead="Скрипты, HMR, tree shaking и minify — смотрите конфиги на вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}

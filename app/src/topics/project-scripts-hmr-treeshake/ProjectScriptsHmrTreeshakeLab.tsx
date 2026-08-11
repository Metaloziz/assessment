import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '139-project-scripts-hmr-treeshake'

type Mode = 'hmr' | 'shake' | 'minify'

export function ProjectScriptsHmrTreeshakeLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('hmr')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()
    if (mode === 'hmr') {
      log('err', 'live reload: полная перезагрузка, state формы сброшен')
      log('ok', 'HMR: патч модуля, state сохранён (см. devServer.hot в webpack.config.js)')
      setHint('HMR ≠ full reload — смотри «Код» → webpack.config.js')
      return
    }
    if (mode === 'shake') {
      log('info', 'utils.js экспортирует used + dead; index.js импортирует только used')
      log('ok', 'prod + usedExports / sideEffects: dead может выпасть из бандла')
      log('err', 'CJS или side effects на import — shaking ломается')
      setHint('см. «Код» → src/utils.js и package.json sideEffects')
      return
    }
    log('info', 'mode: production включает minimize')
    log('ok', 'TerserPlugin в optimization.minimizer — см. webpack.config.js')
    log('info', 'minify ≠ gzip на CDN; source maps в prod — отдельно')
    setHint('см. «Код» → блок MINIFY / TerserPlugin')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Скрипты в <code>package.json</code>, HMR, tree shaking и minify живут в разных файлах.
        Здесь сравните режимы; детали конфигов — во вкладке «Код».
      </p>
      <ol className={shell.steps}>
        <li>Выберите HMR, Tree shake или Minify и нажмите «Запустить».</li>
        <li>
          Откройте «Код»: <code>package.json</code>, <code>webpack.config.js</code>, модули — участки
          темы помечены комментариями.
        </li>
        <li>Сверьте лог с помеченными блоками в конфиге.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="ghost" size="sm" active={mode === 'hmr'} onClick={() => setMode('hmr')}>
          HMR
        </LabButton>
        <LabButton variant="ghost" size="sm" active={mode === 'shake'} onClick={() => setMode('shake')}>
          Tree shake
        </LabButton>
        <LabButton variant="ghost" size="sm" active={mode === 'minify'} onClick={() => setMode('minify')}>
          Minify
        </LabButton>
        <LabButton variant="primary" onClick={run}>
          Запустить
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
      intro="`package.json` scripts, HMR в `devServer`, tree shaking и Terser в prod."
      snippets={[
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
      ]}
    />
  )

  return (
    <JsLabShell
      title="Scripts, HMR, shaking, minify"
      lead="Сравнение HMR, tree shaking и minify; конфиги — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}

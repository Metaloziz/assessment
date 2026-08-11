import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '138-project-loaders-plugins-semver'

const LOADERS = ['sass-loader', 'css-loader', 'style-loader'] as const

export function ProjectLoadersPluginsSemverLab() {
  const { lines, log, clear } = useLabLog()
  const [step, setStep] = useState(0)
  const [hint, setHint] = useState<string | null>(null)

  const runPipeline = () => {
    clear()
    setStep(0)
    log('info', 'файл: theme.scss')
    LOADERS.forEach((name, i) => {
      window.setTimeout(() => {
        setStep(i + 1)
        log('ok', `→ ${name}`)
        if (i === LOADERS.length - 1) {
          log('ok', 'результат: JS-модуль, инжектящий CSS')
          setHint('цепочка loaders справа налево в use: […]')
        }
      }, (i + 1) * 400)
    })
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Путают <code>loader</code> и <code>plugin</code>: один обрабатывает импорт файла, другой
        цепляется к компиляции. Прогоните цепочку лоадеров и сверьте с полным конфигом во вкладке
        «Код».
      </p>
      <ol className={shell.steps}>
        <li>
          Нажмите «Прогнать loaders» — шаг за шагом SCSS идёт через цепочку.
        </li>
        <li>
          Откройте «Код»: в <code>webpack.config.js</code> блоки <code>module.rules</code> и{' '}
          <code>plugins</code> помечены отдельно.
        </li>
        <li>
          Запомните: loaders — на файл; plugins — на всю сборку.
        </li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={runPipeline}>
          Прогнать loaders
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            setStep(0)
            clear()
            setHint(null)
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.hint}>
        Шаг: <code>{step === 0 ? 'исходник' : LOADERS[step - 1]}</code>
        {step > 0 ? ` (${step}/${LOADERS.length})` : ''}
      </p>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Цельный `webpack.config.js`: `module.rules` = **loaders**, `plugins` = **plugins**."
      snippets={[
        {
          id: 'webpack-config',
          label: 'webpack.config.js',
          note: 'Ищите комментарии `LOADERS` и `PLUGINS`. Loaders — на импорт файла; plugins — на всю компиляцию.',
          executable: false,
          code: `// webpack.config.js — учебный полный файл
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },

  // ═══════════════════════════════════════════
  // LOADERS — сюда (module.rules)
  // Цепочка use читается СПРАВА НАЛЕВО.
  // Срабатывают, когда файл попадает в граф через import.
  // ═══════════════════════════════════════════
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader', // ← loader: TS → JS
      },
      {
        test: /\\.scss$/,
        use: [
          MiniCssExtractPlugin.loader, // ← loader: CSS → файл
          'css-loader',                // ← loader: css → modules
          'sass-loader',               // ← loader: scss → css  (первый в цепочке)
        ],
      },
      {
        test: /\\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource', // встроенный asset-модуль (бывший file-loader)
      },
    ],
  },

  // ═══════════════════════════════════════════
  // PLUGINS — сюда (plugins: […])
  // Не на один import, а на жизненный цикл compilation:
  // emit HTML, очистка dist, извлечение CSS…
  // ═══════════════════════════════════════════
  plugins: [
    new CleanWebpackPlugin(), // ← plugin: почистить output перед сборкой
    new HtmlWebpackPlugin({   // ← plugin: сгенерировать index.html + script tags
      template: './src/index.html',
    }),
    new MiniCssExtractPlugin({ // ← plugin: вынести CSS в .css файл
      filename: '[name].[contenthash].css',
    }),
  ],

  devServer: {
    hot: true,
    port: 3000,
  },
};

/*
  Кратко:
  • LOADERS  = module.rules[].use / test  → «как прочитать этот файл»
  • PLUGINS  = plugins[]                 → «что сделать со всей сборкой»
*/`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Loaders и plugins"
      lead="Цепочка лоадеров на файле и полный webpack.config — где rules, а где plugins."
      problem={problem}
      code={code}
    />
  )
}

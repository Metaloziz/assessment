import { useEffect, useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel } from '../../components/lab/LabViz'
import styles from './ProjectLoadersPluginsSemverLab.module.css'

const TOPIC_ID = '138-project-loaders-plugins-semver'

type Pattern = 'loaders' | 'plugins' | 'semver'
type LoaderCase = 'scss' | 'ts'
type PluginCase = 'html' | 'clean'
type SemverCase = 'caret' | 'tilde'
type CaseId = LoaderCase | PluginCase | SemverCase

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'loaders', label: 'Loaders' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'semver', label: 'Semver' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  loaders: [
    { id: 'scss', label: 'SCSS цепочка' },
    { id: 'ts', label: 'TS файл' },
  ],
  plugins: [
    { id: 'html', label: 'HTML из сборки' },
    { id: 'clean', label: 'Очистка dist' },
  ],
  semver: [
    { id: 'caret', label: '^ caret' },
    { id: 'tilde', label: '~ tilde' },
  ],
}

const SCSS_CHAIN = ['sass-loader', 'css-loader', 'style-loader'] as const

const PAIN: Record<Pattern, ReactNode> = {
  loaders: (
    <>
      Loader отвечает на вопрос «как прочитать этот файл»: цепочка в <code>module.rules</code>{' '}
      срабатывает на <code>import</code>, порядок в <code>use</code> — справа налево.
    </>
  ),
  plugins: (
    <>
      Plugin цепляется к жизненному циклу сборки: HTML, очистка <code>dist</code>, вынос CSS — это
      не правила для одного import.
    </>
  ),
  semver: (
    <>
      Диапазон в <code>package.json</code> задаёт, какие версии npm может поставить;{' '}
      <code>^</code> и <code>~</code> ведут себя по-разному.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  scss: (
    <>
      <code>theme.scss</code> проходит sass → css → style: на выходе JS-модуль, который инжектит
      CSS.
    </>
  ),
  ts: (
    <>
      Один <code>ts-loader</code> на <code>.tsx</code> — без цепочки, но тот же принцип: файл →
      модуль.
    </>
  ),
  html: (
    <>
      <code>HtmlWebpackPlugin</code> после emit пишет <code>index.html</code> с актуальными{' '}
      <code>&lt;script&gt;</code> — файла в import не было.
    </>
  ),
  clean: (
    <>
      <code>CleanWebpackPlugin</code> чистит output до сборки — хук на compilation, не loader.
    </>
  ),
  caret: (
    <>
      <code>^1.2.3</code> тянет 1.x ≥1.2.3; <code>2.0.0</code> уже за пределами диапазона.
    </>
  ),
  tilde: (
    <>
      <code>~1.2.3</code> — только патчи 1.2.x; <code>1.3.0</code> (minor) не подходит.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  loaders: 'Loaders в `module.rules`: `test` + цепочка `use` (справа налево).',
  plugins: 'Plugins в `plugins[]`: хуки compilation — HTML, CSS extract, clean.',
  semver: 'Диапазоны в `dependencies` и фиксация через lockfile.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  loaders: [
    {
      id: 'webpack-rules',
      label: 'webpack.config.js',
      note: 'Блок `module.rules` — loaders на import. Цепочка SCSS читается справа налево.',
      executable: false,
      code: `module.exports = {
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader', // ← один loader: TS → JS
      },
      {
        test: /\\.scss$/,
        use: [
          'style-loader',  // ← последний в массиве = первый на файле
          'css-loader',
          'sass-loader',   // ← scss → css (старт цепочки)
        ],
      },
      {
        test: /\\.(png|svg)$/i,
        type: 'asset/resource', // ← встроенный asset-модуль
      },
    ],
  },
};`,
    },
  ],
  plugins: [
    {
      id: 'webpack-plugins',
      label: 'webpack.config.js',
      note: 'Массив `plugins` — не `module.rules`. MiniCssExtract: plugin + `.loader` в rules.',
      executable: false,
      code: `const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  output: { path: 'dist', filename: '[name].[contenthash].js' },

  // loaders — в rules (см. вкладку Loaders)

  plugins: [
    new CleanWebpackPlugin(),     // ← до emit: очистить dist
    new HtmlWebpackPlugin({       // ← HTML + script tags после emit
      template: './src/index.html',
    }),
    new MiniCssExtractPlugin({    // ← plugin: .css файл в output
      filename: '[name].[contenthash].css',
    }),
  ],
};`,
    },
  ],
  semver: [
    {
      id: 'package-json',
      label: 'package.json',
      note: 'Диапазоны в dependencies; lockfile фиксирует фактические версии в CI.',
      executable: false,
      languageLabel: 'json',
      code: `{
  "name": "shop-app",
  "version": "1.4.2",

  "dependencies": {
    "react": "^18.2.0",
    "lodash": "~4.17.21",
    "left-pad": "1.3.0"
  },

  // ^18.2.0  → >=18.2.0 <19.0.0
  // ~4.17.21 → >=4.17.21 <4.18.0
  // 1.3.0    → только 1.3.0

  "devDependencies": {
    "webpack": "^5.94.0"
  }
}`,
    },
    {
      id: 'lockfile-hint',
      label: 'CI install',
      note: 'В CI — установка строго по lockfile, не «подтянуть что ^ разрешит».',
      executable: false,
      code: `# локально после смены диапазона
npm install

# CI / reproducible build
npm ci

# yarn
yarn install --frozen-lockfile`,
    },
  ],
}

function nodeState(active: boolean, done: boolean): 'idle' | 'active' | 'ok' {
  if (active) return 'active'
  if (done) return 'ok'
  return 'idle'
}

function LoadersViz({ caseId, step }: { caseId: LoaderCase; step: number }) {
  if (caseId === 'ts') {
    return (
      <LabVizPanel title="Loader на import" meta="app.tsx → ts-loader → JS-модуль">
        <div className={styles.chain}>
          <span className={styles.chainFile}>app.tsx</span>
          <span className={styles.chainArrow}>↓</span>
          <LabNode label="ts-loader" sub="TS → JS" state={step >= 1 ? 'ok' : 'idle'} />
          <span className={styles.chainArrow}>↓</span>
          <LabNode label="JS-модуль" sub="в графе сборки" state={step >= 1 ? 'ok' : 'idle'} />
        </div>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title="Цепочка loaders" meta="use читается справа налево">
      <div className={styles.chain}>
        <span className={styles.chainFile}>theme.scss</span>
        <span className={styles.chainArrow}>↓</span>
        {SCSS_CHAIN.map((name, i) => (
          <div key={name} className={styles.chain}>
            <LabNode
              label={name}
              sub={i === 0 ? 'scss → css' : i === 1 ? 'css modules' : 'inject style'}
              state={nodeState(step === i + 1, step > i + 1)}
            />
            {i < SCSS_CHAIN.length - 1 ? <span className={styles.chainArrow}>↓</span> : null}
          </div>
        ))}
        <span className={styles.chainArrow}>↓</span>
        <LabNode
          label="JS-модуль"
          sub="инжект CSS"
          state={step > SCSS_CHAIN.length ? 'ok' : 'idle'}
        />
      </div>
    </LabVizPanel>
  )
}

function PluginsViz({ caseId, step }: { caseId: PluginCase; step: number }) {
  if (caseId === 'html') {
    return (
      <LabVizPanel title="Plugin на compilation" meta="файла в import не было">
        <div className={styles.pluginScene}>
          <div className={styles.pluginCol}>
            <LabNode label="граф модулей" sub="entry + imports" state={step >= 1 ? 'ok' : 'idle'} />
            <LabNode label="emit assets" sub=".js / .css" state={step >= 2 ? 'ok' : 'idle'} />
          </div>
          <span className={styles.pluginBridge}>→</span>
          <div className={styles.pluginCol}>
            <LabNode
              label="HtmlWebpackPlugin"
              sub="hook после emit"
              state={nodeState(step === 3, step > 3)}
            />
            <LabNode
              label="dist/index.html"
              sub="<script> с hash"
              state={step > 3 ? 'ok' : 'idle'}
            />
          </div>
        </div>
      </LabVizPanel>
    )
  }

  return (
    <LabVizPanel title="Plugin до сборки" meta="не loader на файл">
      <div className={styles.chain}>
        <LabNode label="dist/" sub="старые артефакты" state={step >= 1 ? 'active' : 'idle'} />
        <span className={styles.chainArrow}>↓</span>
        <LabNode
          label="CleanWebpackPlugin"
          sub="hook: before emit"
          state={nodeState(step === 2, step > 2)}
        />
        <span className={styles.chainArrow}>↓</span>
        <LabNode label="dist/" sub="пусто → новая сборка" state={step > 2 ? 'ok' : 'idle'} />
      </div>
    </LabVizPanel>
  )
}

function SemverViz({ caseId, step }: { caseId: SemverCase; step: number }) {
  const range = caseId === 'caret' ? '^1.2.3' : '~1.2.3'
  const okVer = caseId === 'caret' ? '1.4.2' : '1.2.9'
  const badVer = caseId === 'caret' ? '2.0.0' : '1.3.0'
  const badWhy = caseId === 'caret' ? 'major 2' : 'minor 1.3'

  return (
    <LabVizPanel title="npm install" meta={`диапазон ${range}`}>
      <div className={styles.semFork}>
        <LabNode label="package.json" sub={range} state={step >= 1 ? 'ok' : 'idle'} />
        <span className={styles.semJoin}>↓ install</span>
        <div className={styles.semBranches}>
          <div className={`${styles.semBranch} ${step >= 2 ? '' : styles.semBranchDim}`}>
            <span className={styles.semBranchLabel}>разрешено</span>
            <LabNode label={okVer} sub="в диапазоне" state={step >= 2 ? 'ok' : 'idle'} />
          </div>
          <div className={`${styles.semBranch} ${step >= 3 ? styles.semBranchDim : ''}`}>
            <span className={styles.semBranchLabel}>отклонено</span>
            <LabNode
              label={badVer}
              sub={badWhy}
              state={step >= 3 ? 'err' : 'idle'}
            />
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (id: Pattern) => void
}) {
  return (
    <div className={shell.row}>
      {PATTERNS.map((p) => (
        <LabButton
          key={p.id}
          variant="ghost"
          size="sm"
          active={value === p.id}
          disabled={disabled}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </LabButton>
      ))}
    </div>
  )
}

export function ProjectLoadersPluginsSemverLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('loaders')
  const [caseId, setCaseId] = useState<CaseId>('scss')
  const [step, setStep] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current)
    }
  }, [])

  const stopAnim = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setBusy(false)
  }

  const maxStep = (): number => {
    if (pattern === 'loaders') return caseId === 'scss' ? SCSS_CHAIN.length + 1 : 1
    if (pattern === 'plugins') return caseId === 'html' ? 4 : 3
    return 3
  }

  const playSteps = (total: number) => {
    stopAnim()
    setStep(0)
    setBusy(true)
    let i = 0
    timerRef.current = window.setInterval(() => {
      i += 1
      setStep(i)
      if (i >= total) stopAnim()
    }, 520)
  }

  const selectPattern = (next: Pattern) => {
    stopAnim()
    setPattern(next)
    setCaseId(CASES[next][0]!.id)
    setStep(0)
    setHint(null)
    clear()
  }

  const selectCase = (next: CaseId) => {
    stopAnim()
    setCaseId(next)
    setStep(0)
    setHint(null)
    clear()
  }

  const run = () => {
    clear()
    setHint(null)
    const total = maxStep()

    if (pattern === 'loaders' && caseId === 'scss') {
      log('info', 'файл theme.scss')
      SCSS_CHAIN.forEach((name) => log('ok', name))
      log('ok', 'JS-модуль + CSS')
      setHint('use: [style, css, sass] — sass первым на файле')
      playSteps(total)
      return
    }

    if (pattern === 'loaders' && caseId === 'ts') {
      log('info', 'import app.tsx')
      log('ok', 'ts-loader → JS')
      setHint('один loader без цепочки')
      playSteps(total)
      return
    }

    if (pattern === 'plugins' && caseId === 'html') {
      log('info', 'compilation')
      log('ok', 'emit .js')
      log('ok', 'HtmlWebpackPlugin')
      log('ok', 'dist/index.html')
      setHint('HTML не был в import')
      playSteps(total)
      return
    }

    if (pattern === 'plugins' && caseId === 'clean') {
      log('info', 'dist/ до сборки')
      log('ok', 'CleanWebpackPlugin')
      log('ok', 'dist/ пуст')
      setHint('plugin до emit')
      playSteps(total)
      return
    }

    if (caseId === 'caret') {
      log('info', 'диапазон ^1.2.3')
      log('ok', '1.4.2 — ok')
      log('err', '2.0.0 — major')
      setHint('^1.x, не 2.x')
      playSteps(total)
      return
    }

    log('info', 'диапазон ~1.2.3')
    log('ok', '1.2.9 — ok')
    log('err', '1.3.0 — minor')
    setHint('~ только 1.2.x')
    playSteps(total)
  }

  const reset = () => {
    stopAnim()
    setPattern('loaders')
    setCaseId('scss')
    setStep(0)
    setHint(null)
    clear()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />

      <div className={shell.row}>
        {CASES[pattern].map((c) => (
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

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {pattern === 'loaders' ? (
        <LoadersViz caseId={caseId as LoaderCase} step={step} />
      ) : null}
      {pattern === 'plugins' ? (
        <PluginsViz caseId={caseId as PluginCase} step={step} />
      ) : null}
      {pattern === 'semver' ? (
        <SemverViz caseId={caseId as SemverCase} step={step} />
      ) : null}

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
      <PatternSwitch value={pattern} onChange={selectPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Loaders, plugins и semver"
      lead="Три механизма Webpack-проекта: цепочка на файле, хук на сборке и диапазоны версий."
      problem={problem}
      code={code}
    />
  )
}

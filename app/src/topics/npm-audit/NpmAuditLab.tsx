import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '08-npm-audit'

type Scenario = 'report' | 'fix' | 'force' | 'prod' | 'ci'

export function NpmAuditLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('report')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()

    if (scenario === 'report') {
      log('info', '$ npm audit')
      log('warn', 'lodash  4.17.20  moderate  Prototype Pollution  (transitive via utils)')
      log('err', 'minimist  1.2.5  critical  (devDependency: test tooling)')
      log('ok', '3 vulnerabilities (1 moderate, 1 high, 1 critical)')
      log('info', 'advisory DB = известные CVE, не анализ вашего кода')
      setHint('сначала отчёт: severity + direct/transitive + prod/dev')
      return
    }

    if (scenario === 'fix') {
      log('info', '$ npm audit fix')
      log('ok', 'lodash → 4.17.21 (в пределах semver ^4.17.20)')
      log('warn', '1 critical осталась: нужен major / нет патча в range')
      log('info', 'package-lock.json обновлён без ломающих major')
      setHint('fix безопаснее: только совместимые обновления')
      return
    }

    if (scenario === 'force') {
      log('info', '$ npm audit fix --force')
      log('warn', 'react-scripts 4 → 5 (major)')
      log('err', 'локально: TypeError — сломанный peer / breaking API')
      log('ok', 'без --force: оставить issue + issue ticket / overrides точечно')
      setHint('--force может поднять major и сломать сборку')
      return
    }

    if (scenario === 'prod') {
      log('info', '$ npm audit --production')
      log('ok', 'critical в minimist (devDeps) не в отчёте')
      log('warn', 'moderate в lodash (prod tree) остаётся')
      log('info', 'для runtime-риска смотрите production-дерево')
      setHint('dev-уязвимость ≠ всегда блокер prod')
      return
    }

    log('info', '$ npm audit --audit-level=high')
    log('err', 'exit 1: есть high/critical → CI job failed')
    log('ok', 'low/moderate ниже порога — pipeline зелёный')
    log('info', 'в CI: audit как quality gate, не только локально')
    setHint('порог --audit-level=high типичен для gate')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        В lockfile сидят пакеты с известными CVE. <code>npm audit</code> показывает дерево и
        severity; <code>fix</code> чинит в рамках semver, <code>--force</code> может сломать
        проект.
      </p>
      <ol className={shell.steps}>
        <li>Выберите сценарий: отчёт, fix, force, production, CI.</li>
        <li>Прогоните и сравните лог с командами.</li>
        <li>
          В «Код»: <code>package.json</code> (<code>overrides</code>), CI workflow.
        </li>
      </ol>

      <div className={shell.row}>
        {(
          [
            ['report', 'audit'],
            ['fix', 'fix'],
            ['force', 'fix --force'],
            ['prod', '--production'],
            ['ci', 'CI gate'],
          ] as const
        ).map(([id, label]) => (
          <LabButton
            key={id}
            variant="ghost"
            size="sm"
            active={scenario === id}
            onClick={() => setScenario(id)}
          >
            {label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Прогнать
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
            setScenario('report')
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
        <p className={shell.hint}>Выберите сценарий.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="`npm audit` / `fix` / `overrides`; gate в CI через `--audit-level`."
      snippets={[
        {
          id: 'pkg',
          label: 'package.json',
          note: 'overrides — принудительная версия транзитивной зависимости.',
          executable: false,
          code: `{
  "name": "shop-web",
  "private": true,
  "scripts": {
    "audit:ci": "npm audit --audit-level=high",
    "audit:prod": "npm audit --production --audit-level=high"
  },
  "dependencies": {
    "lodash": "^4.17.20",
    "utils-kit": "^1.2.0"
  },
  "devDependencies": {
    "minimist": "^1.2.5",
    "vitest": "^2.0.0"
  },

  // ═══════════════════════════════════════════
  // OVERRIDES ← транзитивный CVE, upstream ещё не обновился
  // ═══════════════════════════════════════════
  "overrides": {
    "lodash": "4.17.21" // ← зафиксировать патч во всём дереве
  }
}`,
        },
        {
          id: 'ci',
          label: 'ci.yml',
          note: 'Fail job при high/critical; отдельно можно гейтить только production.',
          executable: false,
          code: `name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - run: npm ci

      # ═══════════════════════════════════════════
      # npm audit ← quality gate по advisory DB
      # exit ≠ 0 если severity ≥ high
      # ═══════════════════════════════════════════
      - name: npm audit
        run: npm audit --audit-level=high # ←

      # опционально: только runtime-дерево
      # - run: npm audit --production --audit-level=high`,
        },
        {
          id: 'shell',
          label: 'audit.sh',
          note: 'Локальный порядок: отчёт → осторожный fix → overrides при необходимости.',
          executable: false,
          code: `#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════
# WORKFLOW ← не начинать с --force
# ═══════════════════════════════════════════
npm audit                    # ← полный отчёт
npm audit --production       # ← что едет в prod

npm audit fix                # ← semver-совместимые патчи
# npm audit fix --force      # ← major: только осознанно + тесты

# если transitive застрял:
#   1) overrides в package.json
#   2) npm install
#   3) npm audit снова

npm audit --audit-level=high # ← как в CI`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="npm audit"
      lead="Отчёт CVE, безопасный fix, опасность --force и gate в CI."
      problem={problem}
      code={code}
    />
  )
}

import { useCallback, useMemo, useState } from 'react'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import styles from './JenkinsConfigLab.module.css'

type LogKind = 'ok' | 'err' | 'info'
type LogLine = { kind: LogKind; text: string }

type StageId = 'build' | 'unit' | 'sast' | 'deploy'

type PipelineConfig = {
  agentLabel: string
  appName: string
  deployOnlyMain: boolean
  useCredentials: boolean
  parallelChecks: boolean
  stages: Record<StageId, boolean>
  failStage: StageId | 'none'
  branch: 'feature/pay' | 'main'
}

const DEFAULT_CONFIG: PipelineConfig = {
  agentLabel: 'linux-docker',
  appName: 'bank-api',
  deployOnlyMain: true,
  useCredentials: true,
  parallelChecks: true,
  stages: { build: true, unit: true, sast: true, deploy: true },
  failStage: 'none',
  branch: 'feature/pay',
}

function buildJenkinsfile(cfg: PipelineConfig): string {
  const envBlock = cfg.useCredentials
    ? `  environment {
    APP_NAME = '${cfg.appName}'
    IMAGE_TAG = "\${env.GIT_COMMIT}"
    REGISTRY_CREDS = credentials('harbor-robot')
  }`
    : `  environment {
    APP_NAME = '${cfg.appName}'
    IMAGE_TAG = "\${env.GIT_COMMIT}"
    // плохо: секрет в открытом виде
    REGISTRY_PASS = 'plain-text-password'
  }`

  const checks = cfg.parallelChecks
    ? `    stage('Проверки') {
      parallel {
${cfg.stages.unit ? `        stage('Unit') {\n          steps { sh 'mvn -B test' }\n        }` : ''}
${cfg.stages.sast ? `        stage('SAST') {\n          steps { sh 'bank-sast-scan' }\n        }` : ''}
      }
    }`
    : [
        cfg.stages.unit
          ? `    stage('Unit') {\n      steps { sh 'mvn -B test' }\n    }`
          : '',
        cfg.stages.sast
          ? `    stage('SAST') {\n      steps { sh 'bank-sast-scan' }\n    }`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n')

  const deployWhen = cfg.deployOnlyMain
    ? `      when { branch 'main' }\n`
    : ''

  const deploy = cfg.stages.deploy
    ? `    stage('Deploy') {
${deployWhen}      steps {
        sh "helm upgrade --install \${APP_NAME} ./charts/\${APP_NAME} --set image.tag=\${IMAGE_TAG}"
      }
    }`
    : ''

  return `pipeline {
  agent { label '${cfg.agentLabel}' }

${envBlock}

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
${cfg.stages.build ? `    stage('Сборка') {\n      steps { sh 'mvn -B clean package -DskipTests' }\n    }\n` : ''}${checks ? `${checks}\n` : ''}${deploy ? `${deploy}\n` : ''}  }

  post {
    always {
      junit allowEmptyResults: true, testResults: '**/surefire-reports/*.xml'
    }
    failure {
      echo 'notify: pipeline failed'
    }
  }
}
`
}

export type LiveJenkinsLabApi = ReturnType<typeof useLiveJenkinsLab>

export function useLiveJenkinsLab() {
  const [cfg, setCfg] = useState<PipelineConfig>({ ...DEFAULT_CONFIG, stages: { ...DEFAULT_CONFIG.stages } })
  const [log, setLog] = useState<LogLine[]>([])
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<'idle' | 'success' | 'failed' | 'skipped-deploy'>('idle')

  const jenkinsfile = useMemo(() => buildJenkinsfile(cfg), [cfg])

  const pushLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev.slice(-30), line])
  }, [])

  const patch = useCallback((partial: Partial<PipelineConfig>) => {
    setCfg((prev) => ({ ...prev, ...partial }))
  }, [])

  const toggleStage = useCallback((id: StageId) => {
    setCfg((prev) => ({
      ...prev,
      stages: { ...prev.stages, [id]: !prev.stages[id] },
    }))
  }, [])

  const runPipeline = useCallback(() => {
    if (running) return
    setRunning(true)
    setLog([])
    setLastResult('idle')

    const lines: LogLine[] = []
    const add = (line: LogLine) => lines.push(line)

    add({ kind: 'info', text: `Started on agent «${cfg.agentLabel}» · branch=${cfg.branch}` })

    if (cfg.useCredentials) {
      add({ kind: 'ok', text: 'credentials loaded: harbor-robot (masked)' })
    } else {
      add({ kind: 'err', text: 'warning: secret in plain text environment' })
    }

    const fail = (stage: StageId) => cfg.failStage === stage

    const runStage = (id: StageId, title: string): boolean => {
      if (!cfg.stages[id]) {
        add({ kind: 'info', text: `skip ${title}` })
        return true
      }
      if (id === 'deploy' && cfg.deployOnlyMain && cfg.branch !== 'main') {
        add({ kind: 'info', text: `when: skip Deploy (branch is ${cfg.branch}, need main)` })
        return true
      }
      add({ kind: 'info', text: `▶ stage ${title}` })
      if (fail(id)) {
        add({ kind: 'err', text: `✖ ${title} failed` })
        return false
      }
      add({ kind: 'ok', text: `✔ ${title}` })
      return true
    }

    let ok = true
    if (ok) ok = runStage('build', 'Сборка')

    if (ok && cfg.parallelChecks && (cfg.stages.unit || cfg.stages.sast)) {
      add({ kind: 'info', text: '▶ parallel Проверки' })
      if (cfg.stages.unit) {
        if (fail('unit')) {
          add({ kind: 'err', text: '✖ Unit failed' })
          ok = false
        } else add({ kind: 'ok', text: '✔ Unit' })
      }
      if (ok && cfg.stages.sast) {
        if (fail('sast')) {
          add({ kind: 'err', text: '✖ SAST failed' })
          ok = false
        } else add({ kind: 'ok', text: '✔ SAST' })
      }
    } else if (ok) {
      if (ok) ok = runStage('unit', 'Unit')
      if (ok) ok = runStage('sast', 'SAST')
    }

    let deploySkipped = false
    if (ok) {
      if (cfg.stages.deploy && cfg.deployOnlyMain && cfg.branch !== 'main') {
        deploySkipped = true
        runStage('deploy', 'Deploy')
      } else {
        ok = runStage('deploy', 'Deploy')
      }
    }

    if (ok) {
      add({ kind: 'ok', text: 'post always: junit publish' })
      add({ kind: 'ok', text: 'Finished: SUCCESS' })
      setLastResult(deploySkipped ? 'skipped-deploy' : 'success')
    } else {
      add({ kind: 'ok', text: 'post always: junit publish' })
      add({ kind: 'err', text: 'post failure: notify team' })
      add({ kind: 'err', text: 'Finished: FAILURE' })
      setLastResult('failed')
    }

    setLog(lines)
    setRunning(false)
  }, [cfg, running])

  const reset = useCallback(() => {
    setCfg({ ...DEFAULT_CONFIG, stages: { ...DEFAULT_CONFIG.stages } })
    setLog([])
    setLastResult('idle')
    pushLog({ kind: 'info', text: 'config reset' })
  }, [pushLog])

  const demoSafeMain = useCallback(() => {
    setCfg({
      agentLabel: 'linux-docker',
      appName: 'bank-api',
      deployOnlyMain: true,
      useCredentials: true,
      parallelChecks: true,
      stages: { build: true, unit: true, sast: true, deploy: true },
      failStage: 'none',
      branch: 'main',
    })
    setLog([])
    setLastResult('idle')
    pushLog({ kind: 'info', text: 'пресет: безопасный pipeline на main' })
  }, [pushLog])

  const demoFeatureNoDeploy = useCallback(() => {
    setCfg({
      agentLabel: 'linux-docker',
      appName: 'bank-api',
      deployOnlyMain: true,
      useCredentials: true,
      parallelChecks: true,
      stages: { build: true, unit: true, sast: true, deploy: true },
      failStage: 'none',
      branch: 'feature/pay',
    })
    setLog([])
    setLastResult('idle')
    pushLog({ kind: 'info', text: 'пресет: feature-ветка — Deploy должен скипнуться' })
  }, [pushLog])

  return {
    cfg,
    jenkinsfile,
    log,
    running,
    lastResult,
    patch,
    toggleStage,
    runPipeline,
    reset,
    demoSafeMain,
    demoFeatureNoDeploy,
  }
}

function LabLog({ log }: { log: LogLine[] }) {
  return (
    <pre className={styles.log} aria-live="polite">
      {log.length === 0 ? 'лог пуст — нажми Run pipeline' : null}
      {log.map((line, i) => (
        <span key={`${i}-${line.text}`} className={styles[line.kind]}>
          {line.text}
          {'\n'}
        </span>
      ))}
    </pre>
  )
}

function StatusRow({ lab }: { lab: LiveJenkinsLabApi }) {
  const label =
    lab.lastResult === 'success'
      ? 'SUCCESS'
      : lab.lastResult === 'failed'
        ? 'FAILURE'
        : lab.lastResult === 'skipped-deploy'
          ? 'SUCCESS · deploy skipped'
          : 'idle'
  const ok = lab.lastResult === 'success' || lab.lastResult === 'skipped-deploy'
  return (
    <div className={styles.statusRow}>
      <span className={ok ? styles.badgeOn : lab.lastResult === 'failed' ? styles.badgeErr : styles.badgeOff}>
        {label}
      </span>
      <span className={styles.via}>branch {lab.cfg.branch}</span>
      <span className={styles.via}>agent {lab.cfg.agentLabel}</span>
    </div>
  )
}

function ConfigControls({ lab }: { lab: LiveJenkinsLabApi }) {
  const { cfg, patch, toggleStage } = lab
  return (
    <div className={styles.controls}>
      <label className={styles.field}>
        <span>agent</span>
        <select
          value={cfg.agentLabel}
          onChange={(e) => patch({ agentLabel: e.target.value })}
        >
          <option value="linux-docker">linux-docker</option>
          <option value="linux-jdk17">linux-jdk17</option>
          <option value="k8s-agent">k8s-agent</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>branch</span>
        <select
          value={cfg.branch}
          onChange={(e) => patch({ branch: e.target.value as PipelineConfig['branch'] })}
        >
          <option value="feature/pay">feature/pay</option>
          <option value="main">main</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>fail</span>
        <select
          value={cfg.failStage}
          onChange={(e) => patch({ failStage: e.target.value as PipelineConfig['failStage'] })}
        >
          <option value="none">none</option>
          <option value="build">Сборка</option>
          <option value="unit">Unit</option>
          <option value="sast">SAST</option>
          <option value="deploy">Deploy</option>
        </select>
      </label>

      <div className={styles.checks}>
        {(
          [
            ['build', 'Сборка'],
            ['unit', 'Unit'],
            ['sast', 'SAST'],
            ['deploy', 'Deploy'],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className={styles.check}>
            <input type="checkbox" checked={cfg.stages[id]} onChange={() => toggleStage(id)} />
            {label}
          </label>
        ))}
      </div>

      <div className={styles.checks}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={cfg.deployOnlyMain}
            onChange={(e) => patch({ deployOnlyMain: e.target.checked })}
          />
          when: Deploy только main
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={cfg.parallelChecks}
            onChange={(e) => patch({ parallelChecks: e.target.checked })}
          />
          parallel проверки
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={cfg.useCredentials}
            onChange={(e) => patch({ useCredentials: e.target.checked })}
          />
          credentials (не plain text)
        </label>
      </div>
    </div>
  )
}

function JenkinsfilePreview({ code }: { code: string }) {
  return (
    <pre className={styles.preview} aria-label="Сгенерированный Jenkinsfile">
      {code}
    </pre>
  )
}

export function JenkinsProblemPanel({ lab }: { lab: LiveJenkinsLabApi }) {
  return (
    <div className={styles.panelRoot}>
      <div className={styles.problem}>
        <div className={styles.problemLabel}>Проблема</div>
        <p>
          Сборку и выкладку делают руками: забывают тесты, деплоят из feature-ветки, пароль от
          registry лежит в скрипте.
        </p>
        <div className={styles.problemLabel}>Решение</div>
        <p>
          Jenkinsfile в репозитории: stages, Deploy только с main, секреты через credentials. Один
          Run — одинаковый конвейер каждый раз.
        </p>
      </div>

      <StatusRow lab={lab} />

      <div className={styles.actions}>
        <LabButton variant="secondary" onClick={lab.demoFeatureNoDeploy}>
          1. Feature + when
        </LabButton>
        <LabButton variant="primary" disabled={lab.running} onClick={lab.runPipeline}>
          2. Run pipeline
        </LabButton>
        <LabButton variant="secondary" onClick={lab.demoSafeMain}>
          3. Пресет main
        </LabButton>
        <LabButton variant="primary" disabled={lab.running} onClick={lab.runPipeline}>
          4. Run снова
        </LabButton>
      </div>

      <p className={styles.tip}>
        На feature Deploy скипнется из‑за <code>when {'{'} branch 'main' {'}'}</code>. На main —
        пройдёт до конца. Потом в песочнице сломай Unit и смотри <code>post failure</code>.
      </p>

      <LabLog log={lab.log} />
      <JenkinsfilePreview code={lab.jenkinsfile} />
    </div>
  )
}

export function JenkinsSandboxPanel({ lab }: { lab: LiveJenkinsLabApi }) {
  return (
    <div className={styles.panelRoot}>
      <p className={styles.tip}>
        Собери свой Declarative Pipeline: agent, stages, parallel, when, credentials. Run пишет лог;
        снизу — актуальный Jenkinsfile.
      </p>

      <StatusRow lab={lab} />
      <ConfigControls lab={lab} />

      <div className={styles.actions}>
        <LabButton variant="primary" disabled={lab.running} onClick={lab.runPipeline}>
          Run pipeline
        </LabButton>
        <LabButton variant="secondary" onClick={lab.reset}>
          Reset
        </LabButton>
      </div>

      <LabLog log={lab.log} />
      <JenkinsfilePreview code={lab.jenkinsfile} />
    </div>
  )
}

export function JenkinsCodePanel() {
  return (
    <LabCodePanel
      intro="Jenkinsfile — pipeline as code: тот же review, что и у приложения. Ниже — типовые куски Declarative Pipeline."
      snippets={[
        {
          label: 'Каркас pipeline',
          language: 'groovy',
          code: `pipeline {
  agent { label 'linux-docker' }
  environment {
    APP_NAME = 'bank-api'
    REGISTRY_CREDS = credentials('harbor-robot')
  }
  stages {
    stage('Сборка') {
      steps { sh 'mvn -B clean package -DskipTests' }
    }
  }
  post {
    always { junit '**/surefire-reports/*.xml' }
  }
}`,
        },
        {
          label: 'when + parallel',
          language: 'groovy',
          code: `stage('Проверки') {
  parallel {
    stage('Unit') { steps { sh 'mvn -B test' } }
    stage('SAST') { steps { sh 'bank-sast-scan' } }
  }
}

stage('Deploy') {
  when { branch 'main' }
  steps {
    sh "helm upgrade --install \${APP_NAME} ./charts/\${APP_NAME}"
  }
}`,
        },
        {
          label: 'Типичная ошибка',
          language: 'text',
          note: 'Секрет в environment без credentials — попадёт в логи и историю job.',
          code: `environment {
  REGISTRY_PASS = 'SuperSecret123'  // плохо
}

// лучше:
environment {
  REGISTRY_CREDS = credentials('harbor-robot')
}`,
        },
      ]}
    />
  )
}

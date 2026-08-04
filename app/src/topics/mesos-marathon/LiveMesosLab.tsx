import { useCallback, useMemo, useState } from 'react'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import styles from './MesosMarathonLab.module.css'

type LogKind = 'ok' | 'err' | 'info'

type LogLine = { kind: LogKind; text: string }

export type Agent = {
  id: string
  label: string
  cpus: number
  mem: number
  alive: boolean
}

export type Task = {
  id: string
  agentId: string
  status: 'running' | 'failed'
}

export type AppSpec = {
  instances: number
  cpus: number
  mem: number
}

const INITIAL_AGENTS: Agent[] = [
  { id: 'a1', label: 'agent-1', cpus: 2, mem: 2048, alive: true },
  { id: 'a2', label: 'agent-2', cpus: 2, mem: 2048, alive: true },
  { id: 'a3', label: 'agent-3', cpus: 1, mem: 1024, alive: true },
  { id: 'a4', label: 'agent-4', cpus: 4, mem: 4096, alive: true },
]

const DEFAULT_SPEC: AppSpec = { instances: 1, cpus: 0.5, mem: 512 }

let taskSeq = 0

function nextTaskId() {
  taskSeq += 1
  return `task-${taskSeq}`
}

function usedOnAgent(agentId: string, tasks: Task[], spec: AppSpec) {
  const running = tasks.filter((t) => t.agentId === agentId && t.status === 'running')
  return {
    cpus: running.length * spec.cpus,
    mem: running.length * spec.mem,
    count: running.length,
  }
}

function freeOnAgent(agent: Agent, tasks: Task[], spec: AppSpec) {
  if (!agent.alive) return { cpus: 0, mem: 0 }
  const used = usedOnAgent(agent.id, tasks, spec)
  return {
    cpus: Math.max(0, agent.cpus - used.cpus),
    mem: Math.max(0, agent.mem - used.mem),
  }
}

function placeTasks(
  agents: Agent[],
  tasks: Task[],
  spec: AppSpec,
  pushLog: (line: LogLine) => void,
): Task[] {
  let next = tasks.slice()
  const running = () => next.filter((t) => t.status === 'running').length

  while (running() < spec.instances) {
    const candidates = agents.filter((a) => a.alive)
    let placed = false

    for (const agent of candidates) {
      const free = freeOnAgent(agent, next, spec)
      pushLog({
        kind: 'info',
        text: `offer ${agent.label}: ${free.cpus.toFixed(1)} CPU, ${free.mem} MB`,
      })

      if (free.cpus + 1e-9 >= spec.cpus && free.mem >= spec.mem) {
        const id = nextTaskId()
        next = [...next, { id, agentId: agent.id, status: 'running' }]
        pushLog({ kind: 'ok', text: `accept → ${id} on ${agent.label}` })
        pushLog({ kind: 'ok', text: `task started ${id}` })
        placed = true
        break
      }
    }

    if (!placed) {
      pushLog({
        kind: 'err',
        text: `no offer: нужно ${spec.cpus} CPU / ${spec.mem} MB (running ${running()}/${spec.instances})`,
      })
      break
    }
  }

  return next
}

export type LiveMesosLabApi = ReturnType<typeof useLiveMesosLab>

export function useLiveMesosLab() {
  const [agents, setAgents] = useState<Agent[]>(() => INITIAL_AGENTS.map((a) => ({ ...a })))
  const [tasks, setTasks] = useState<Task[]>([])
  const [spec, setSpec] = useState<AppSpec>({ ...DEFAULT_SPEC })
  const [deployed, setDeployed] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])

  const pushLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev.slice(-24), line])
  }, [])

  const runningCount = useMemo(
    () => tasks.filter((t) => t.status === 'running').length,
    [tasks],
  )

  const deploy = useCallback(() => {
    setDeployed(true)
    pushLog({
      kind: 'info',
      text: `Marathon desired: bank-api ×${spec.instances} (${spec.cpus} CPU, ${spec.mem} MB)`,
    })
    setTasks((prev) => {
      const active = prev.filter((t) => t.status === 'running')
      // Scale down: kill extras from the end
      let kept = active
      if (kept.length > spec.instances) {
        const drop = kept.slice(spec.instances)
        kept = kept.slice(0, spec.instances)
        for (const t of drop) {
          pushLog({ kind: 'info', text: `scale-down stop ${t.id}` })
        }
      }
      return placeTasks(agents, kept, spec, pushLog)
    })
  }, [agents, pushLog, spec])

  const setInstances = useCallback((instances: number) => {
    setSpec((s) => ({ ...s, instances }))
  }, [])

  const setCpus = useCallback((cpus: number) => {
    setSpec((s) => ({ ...s, cpus }))
  }, [])

  const setMem = useCallback((mem: number) => {
    setSpec((s) => ({ ...s, mem }))
  }, [])

  const killTask = useCallback(
    (taskId: string) => {
      setTasks((prev) => {
        const target = prev.find((t) => t.id === taskId && t.status === 'running')
        if (!target) return prev
        pushLog({ kind: 'err', text: `health check failed ${taskId}` })
        pushLog({ kind: 'info', text: `reschedule after task loss` })
        const without = prev.map((t) =>
          t.id === taskId ? { ...t, status: 'failed' as const } : t,
        )
        const running = without.filter((t) => t.status === 'running')
        return placeTasks(agents, running, spec, pushLog)
      })
      setDeployed(true)
    },
    [agents, pushLog, spec],
  )

  const killAgent = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId)
      if (!agent?.alive) return

      const nextAgents = agents.map((a) =>
        a.id === agentId ? { ...a, alive: false } : a,
      )
      setAgents(nextAgents)
      pushLog({ kind: 'err', text: `agent lost ${agent.label}` })

      setTasks((prev) => {
        const lost = prev.filter((t) => t.agentId === agentId && t.status === 'running')
        for (const t of lost) {
          pushLog({ kind: 'err', text: `task failed ${t.id} (agent down)` })
        }
        pushLog({ kind: 'info', text: 'reschedule after agent loss' })
        const surviving = prev
          .map((t) =>
            t.agentId === agentId && t.status === 'running'
              ? { ...t, status: 'failed' as const }
              : t,
          )
          .filter((t) => t.status === 'running')
        return placeTasks(nextAgents, surviving, spec, pushLog)
      })
      setDeployed(true)
    },
    [agents, pushLog, spec],
  )

  const restoreAgent = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId)
      if (!agent || agent.alive) return
      const nextAgents = agents.map((a) =>
        a.id === agentId ? { ...a, alive: true } : a,
      )
      setAgents(nextAgents)
      pushLog({ kind: 'ok', text: `agent restored ${agent.label}` })
      if (deployed) {
        setTasks((prev) => {
          const running = prev.filter((t) => t.status === 'running')
          return placeTasks(nextAgents, running, spec, pushLog)
        })
      }
    },
    [agents, deployed, pushLog, spec],
  )

  const reset = useCallback(() => {
    taskSeq = 0
    setAgents(INITIAL_AGENTS.map((a) => ({ ...a })))
    setTasks([])
    setSpec({ ...DEFAULT_SPEC })
    setDeployed(false)
    setLog([])
    pushLog({ kind: 'info', text: 'cluster reset' })
  }, [pushLog])

  const clearLog = useCallback(() => setLog([]), [])

  return {
    agents,
    tasks,
    spec,
    deployed,
    log,
    runningCount,
    setInstances,
    setCpus,
    setMem,
    deploy,
    killTask,
    killAgent,
    restoreAgent,
    reset,
    clearLog,
  }
}

function LabLog({ log }: { log: LogLine[] }) {
  return (
    <pre className={styles.log} aria-live="polite">
      {log.length === 0 ? 'лог пуст' : null}
      {log.map((line, i) => (
        <span key={`${i}-${line.text}`} className={styles[line.kind]}>
          {line.text}
          {'\n'}
        </span>
      ))}
    </pre>
  )
}

function SpecControls({
  lab,
  compact,
}: {
  lab: LiveMesosLabApi
  compact?: boolean
}) {
  const { spec, setInstances, setCpus, setMem } = lab
  return (
    <div className={compact ? styles.controlsCompact : styles.controls}>
      <label className={styles.field}>
        <span>instances</span>
        <input
          type="range"
          min={1}
          max={6}
          step={1}
          value={spec.instances}
          onChange={(e) => setInstances(Number(e.target.value))}
        />
        <strong>{spec.instances}</strong>
      </label>
      <label className={styles.field}>
        <span>cpus</span>
        <input
          type="range"
          min={0.25}
          max={2}
          step={0.25}
          value={spec.cpus}
          onChange={(e) => setCpus(Number(e.target.value))}
        />
        <strong>{spec.cpus}</strong>
      </label>
      <label className={styles.field}>
        <span>mem MB</span>
        <input
          type="range"
          min={256}
          max={2048}
          step={256}
          value={spec.mem}
          onChange={(e) => setMem(Number(e.target.value))}
        />
        <strong>{spec.mem}</strong>
      </label>
    </div>
  )
}

function ClusterBoard({ lab }: { lab: LiveMesosLabApi }) {
  const { agents, tasks, spec, killAgent, restoreAgent, killTask } = lab

  return (
    <div className={styles.cluster}>
      {agents.map((agent) => {
        const used = usedOnAgent(agent.id, tasks, spec)
        const free = freeOnAgent(agent, tasks, spec)
        const agentTasks = tasks.filter(
          (t) => t.agentId === agent.id && t.status === 'running',
        )
        return (
          <article
            key={agent.id}
            className={`${styles.agent} ${agent.alive ? '' : styles.agentDead}`}
          >
            <header className={styles.agentHead}>
              <span className={styles.agentName}>{agent.label}</span>
              <span className={agent.alive ? styles.badgeOn : styles.badgeOff}>
                {agent.alive ? 'alive' : 'down'}
              </span>
            </header>
            <p className={styles.agentRes}>
              CPU {used.cpus.toFixed(2)}/{agent.cpus} · RAM {used.mem}/{agent.mem} MB
              {agent.alive ? (
                <span className={styles.free}>
                  {' '}
                  · free {free.cpus.toFixed(2)} / {free.mem}
                </span>
              ) : null}
            </p>
            <div className={styles.taskList}>
              {agentTasks.length === 0 ? (
                <span className={styles.emptyTasks}>нет задач</span>
              ) : (
                agentTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={styles.task}
                    title="Убить задачу (health fail)"
                    onClick={() => killTask(t.id)}
                  >
                    {t.id}
                  </button>
                ))
              )}
            </div>
            <div className={styles.agentActions}>
              {agent.alive ? (
                <button
                  type="button"
                  className="uiBtn uiBtnDanger"
                  onClick={() => killAgent(agent.id)}
                >
                  Kill agent
                </button>
              ) : (
                <button
                  type="button"
                  className="uiBtn uiBtnGhost"
                  onClick={() => restoreAgent(agent.id)}
                >
                  Restore
                </button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function StatusRow({ lab }: { lab: LiveMesosLabApi }) {
  const { runningCount, spec, deployed } = lab
  return (
    <div className={styles.statusRow}>
      <span className={deployed ? styles.badgeOn : styles.badgeOff}>
        {deployed ? 'deployed' : 'idle'}
      </span>
      <span className={styles.via}>
        bank-api {runningCount}/{spec.instances}
      </span>
    </div>
  )
}

export function MesosProblemPanel({ lab }: { lab: LiveMesosLabApi }) {
  return (
    <div className={styles.panelRoot}>
      <div className={styles.problem}>
        <div className={styles.problemLabel}>Проблема</div>
        <p>
          Платёжный API крутился на одном сервере. Сервер умер — сервис пропал, клиенты не могут
          платить.
        </p>
        <div className={styles.problemLabel}>Решение</div>
        <p>
          Marathon держит нужное число экземпляров. Mesos предлагает ресурсы живых машин; упавший
          узел — задачи сами поднимаются на других Agents.
        </p>
      </div>

      <StatusRow lab={lab} />
      <SpecControls lab={lab} compact />

      <div className={styles.actions}>
        <button type="button" className="uiBtn uiBtnPrimary" onClick={lab.deploy}>
          Развернуть / Apply
        </button>
        <button type="button" className="uiBtn uiBtnGhost" onClick={lab.reset}>
          Сброс
        </button>
      </div>

      <ClusterBoard lab={lab} />

      <p className={styles.tip}>
        1) Оставь <code>instances: 1</code> → Развернуть. 2) Kill agent с задачей. 3) Смотри лог:{' '}
        <code>agent lost</code> → <code>reschedule</code> → задача на другом узле. 4) Подними{' '}
        <code>instances</code> до 3 и снова Apply.
      </p>

      <LabLog log={lab.log} />
    </div>
  )
}

export function MesosSandboxPanel({ lab }: { lab: LiveMesosLabApi }) {
  return (
    <div className={styles.panelRoot}>
      <p className={styles.tip}>
        Свободный режим: меняй ресурсы приложения, убивай задачи и агентов, смотри offers и нехватку
        CPU/RAM. Клик по задаче = failed health check.
      </p>

      <StatusRow lab={lab} />
      <SpecControls lab={lab} />

      <div className={styles.actions}>
        <button type="button" className="uiBtn uiBtnPrimary" onClick={lab.deploy}>
          Deploy / Scale
        </button>
        <button type="button" className="uiBtn uiBtnGhost" onClick={lab.clearLog}>
          Очистить лог
        </button>
        <button type="button" className="uiBtn uiBtnGhost" onClick={lab.reset}>
          Reset cluster
        </button>
      </div>

      <ClusterBoard lab={lab} />
      <LabLog log={lab.log} />
    </div>
  )
}

export function MesosCodePanel() {
  return (
    <LabCodePanel
      intro="В лабе нет настоящего Mesos — это модель: Marathon задаёт desired state, Mesos раздаёт offers, framework принимает ресурсы и запускает задачи."
      snippets={[
        {
          label: 'Marathon app (JSON)',
          language: 'json',
          code: `{
  "id": "/bank-api",
  "instances": 3,
  "cpus": 0.5,
  "mem": 512,
  "container": {
    "type": "DOCKER",
    "docker": {
      "image": "registry.bank.example/bank-api:1.4.2",
      "network": "BRIDGE"
    }
  },
  "healthChecks": [{
    "protocol": "HTTP",
    "path": "/health",
    "intervalSeconds": 10
  }]
}`,
        },
        {
          label: 'Offer → accept → launch (псевдокод)',
          language: 'javascript',
          code: `// Mesos Master предлагает ресурсы агента
onOffer(agent) {
  if (running < desired
      && agent.freeCpu >= app.cpus
      && agent.freeMem >= app.mem) {
    accept(offer)
    launch(task, agent) // Docker на Agent
  } else {
    decline(offer)
  }
}

// Agent упал → Marathon снова ищет offers
onAgentLost(agent) {
  markTasksFailed(agent)
  reconcile() // пока running < desired
}`,
        },
        {
          label: 'Типичная ошибка',
          language: 'text',
          note: 'Нет свободных offers — instances не вырастут, пока не освободишь CPU/RAM или не поднимешь агент.',
          code: `no offer: нужно 2 CPU / 2048 MB
(running 1/3)`,
        },
      ]}
    />
  )
}

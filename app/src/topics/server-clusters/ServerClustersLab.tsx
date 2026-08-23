import { useCallback, useMemo, useState, type ReactNode } from 'react'
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
import styles from './ServerClustersLab.module.css'

const TOPIC_ID = '74-server-clusters'
const STEP = 0.65

type CaseId = 'single' | 'heal' | 'packed'
type Phase = 'idle' | 'ready' | 'traffic' | 'kill' | 'recover' | 'done'

type Node = { id: string; label: string; alive: boolean }
type Replica = { id: string; nodeId: string; healthy: boolean }

const THREE_NODES: Node[] = [
  { id: 'n1', label: 'node-1', alive: true },
  { id: 'n2', label: 'node-2', alive: true },
  { id: 'n3', label: 'node-3', alive: true },
]

let replicaSeq = 0
function nextReplicaId() {
  replicaSeq += 1
  return `rep-${replicaSeq}`
}

function healthyOn(nodes: Node[], replicas: Replica[]) {
  const alive = new Set(nodes.filter((n) => n.alive).map((n) => n.id))
  return replicas.filter((r) => r.healthy && alive.has(r.nodeId))
}

function pickNode(nodes: Node[], replicas: Replica[], spread: boolean): Node | null {
  const alive = nodes.filter((n) => n.alive)
  if (!alive.length) return null
  if (!spread) return alive[0]

  let best = alive[0]
  let bestCount = Infinity
  for (const node of alive) {
    const count = replicas.filter((r) => r.healthy && r.nodeId === node.id).length
    if (count < bestCount) {
      best = node
      bestCount = count
    }
  }
  return best
}

function placeReplicas(
  nodes: Node[],
  replicas: Replica[],
  desired: number,
  spread: boolean,
  managerOn: boolean,
): Replica[] {
  if (!managerOn) return replicas.filter((r) => r.healthy)

  const aliveIds = new Set(nodes.filter((n) => n.alive).map((n) => n.id))
  let next = replicas.filter((r) => r.healthy && aliveIds.has(r.nodeId))

  while (next.length > desired) next = next.slice(0, -1)

  while (next.length < desired) {
    const node = pickNode(nodes, next, spread)
    if (!node) break
    next = [...next, { id: nextReplicaId(), nodeId: node.id, healthy: true }]
  }

  return next
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'single', label: 'Один сервер' },
  { id: 'heal', label: 'Self-healing' },
  { id: 'packed', label: 'Все на одном узле' },
]

const PAIN = (
  <>
    Платёжный API на одной машине падает вместе с ней. Менеджер кластера держит нужное число{' '}
    <code>реплик</code> на живых узлах — но только если копии действительно разнесены.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  single: (
    <>
      Один узел и одна реплика без менеджера: после «убить узел» здоровых экземпляров нет и трафик
      не проходит.
    </>
  ),
  heal: (
    <>
      Три узла, менеджер и <code>spread</code>: после падения <code>node-1</code> менеджер ставит
      замену на живой машине — сервис снова принимает трафик.
    </>
  ),
  packed: (
    <>
      Три реплики, но режим <code>pack</code> — все на <code>node-1</code>. Падение этого узла
      обнуляет сервис, хотя «реплик» было три.
    </>
  ),
}

const CODE_INTRO =
  'Желаемое состояние в манифесте; менеджер сверяет факт и размещает pod на worker-узлах.'

const CODE_SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'k8s-deploy',
    label: 'payment-api.yaml · Deployment',
    note: 'Желаемое число реплик и anti-affinity, чтобы не садиться на один host.',
    executable: false,
    languageLabel: 'yaml',
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
spec:
  replicas: 3 # ← desired state
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                topologyKey: kubernetes.io/hostname # ← spread по узлам
      containers:
        - name: api
          image: registry.example/payment-api:1.4.2
          readinessProbe:
            httpGet: { path: /ready, port: 8080 } # ← трафик только когда готов
`,
  },
  {
    id: 'reconcile',
    label: 'cluster-manager · reconcile',
    note: 'Цикл менеджера: сверка desired с фактом и замена после потери узла.',
    executable: false,
    languageLabel: 'js',
    code: `function reconcile(desired, nodes, replicas, spread) {
  let healthy = replicasOnAliveNodes(nodes, replicas);
  while (healthy.length < desired) {
    const node = pickNode(nodes, healthy, spread); // ← spread | pack
    healthy.push(scheduleReplica(node));
  }
  return healthy;
}

onNodeLost(node) {
  markReplicasDown(node);
  return reconcile(desired, nodes, replicas, spread); // ← self-healing
}
`,
  },
  {
    id: 'packed-trap',
    label: 'anti-pattern.txt',
    note: 'Три реплики на одном узле не переживают его падение.',
    executable: false,
    languageLabel: 'text',
    code: `replicas: 3
placement: pack → все на node-1
→ Kill node-1
→ healthy 0/3, трафик недоступен
`,
  },
]

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function initialForCase(caseId: CaseId): {
  nodes: Node[]
  replicas: Replica[]
  managerOn: boolean
  spread: boolean
  desired: number
  killTarget: string
} {
  replicaSeq = 0
  if (caseId === 'single') {
    const nodes = [{ id: 'n1', label: 'node-1', alive: true }]
    const replicas = [{ id: nextReplicaId(), nodeId: 'n1', healthy: true }]
    return { nodes, replicas, managerOn: false, spread: true, desired: 1, killTarget: 'n1' }
  }
  if (caseId === 'packed') {
    const nodes = THREE_NODES.map((n) => ({ ...n }))
    const replicas = Array.from({ length: 3 }, () => ({
      id: nextReplicaId(),
      nodeId: 'n1',
      healthy: true,
    }))
    return { nodes, replicas, managerOn: true, spread: false, desired: 3, killTarget: 'n1' }
  }
  const nodes = THREE_NODES.map((n) => ({ ...n }))
  const replicas = placeReplicas(nodes, [], 3, true, true)
  return { nodes, replicas, managerOn: true, spread: true, desired: 3, killTarget: 'n1' }
}

function ClusterViz({
  nodes,
  replicas,
  phase,
  killTarget,
}: {
  nodes: Node[]
  replicas: Replica[]
  phase: Phase
  killTarget: string
}) {
  const highlightKill = phase === 'kill' || phase === 'recover' || phase === 'done'

  return (
    <LabVizPanel
      title="Кластер платёжного API"
      meta={
        phase === 'idle'
          ? 'нажмите «Запустить»'
          : phase === 'traffic'
            ? 'трафик на здоровые реплики'
            : phase === 'kill'
              ? `узел ${killTarget} недоступен`
              : phase === 'recover'
                ? 'менеджер сверяет desired state'
                : 'итог прогона'
      }
    >
      <div className={styles.cluster}>
        {nodes.map((node) => {
          const nodeReplicas = replicas.filter((r) => r.nodeId === node.id && r.healthy)
          const isKill = highlightKill && node.id === killTarget && !node.alive
          return (
            <article
              key={node.id}
              className={[
                styles.node,
                !node.alive ? styles.nodeDead : '',
                isKill ? styles.nodeKill : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <header className={styles.nodeHead}>
                <span className={styles.nodeName}>{node.label}</span>
                <span className={node.alive ? styles.badgeOn : styles.badgeOff}>
                  {node.alive ? 'жив' : 'упал'}
                </span>
              </header>
              <div className={styles.replicaList}>
                {nodeReplicas.length === 0 ? (
                  <span className={styles.empty}>нет реплик</span>
                ) : (
                  nodeReplicas.map((r) => (
                    <span key={r.id} className={styles.replica}>
                      {r.id}
                    </span>
                  ))
                )}
              </div>
            </article>
          )
        })}
      </div>
    </LabVizPanel>
  )
}

export function ServerClustersLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('single')
  const [phase, setPhase] = useState<Phase>('idle')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Node[]>(() => initialForCase('single').nodes)
  const [replicas, setReplicas] = useState<Replica[]>(() => initialForCase('single').replicas)

  const config = useMemo(() => initialForCase(caseId), [caseId])
  const healthyCount = useMemo(() => healthyOn(nodes, replicas).length, [nodes, replicas])

  const resetCase = useCallback(
    (id: CaseId) => {
      const init = initialForCase(id)
      setNodes(init.nodes)
      setReplicas(init.replicas)
      setPhase('idle')
      setHint(null)
      clear()
    },
    [clear],
  )

  const run = useCallback(async () => {
    clear()
    setHint(null)
    setBusy(true)

    const init = initialForCase(caseId)
    setNodes(init.nodes.map((n) => ({ ...n })))
    setReplicas(init.replicas.map((r) => ({ ...r })))
    setPhase('ready')

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        if (reducedMotion()) resolve()
        else window.setTimeout(resolve, ms)
      })

    const killTarget = init.killTarget
    const trafficOk = () => healthyOn(init.nodes, init.replicas).length > 0

    await wait(reducedMotion() ? 0 : STEP * 1000)
    setPhase('traffic')
    log(
      trafficOk() ? 'ok' : 'err',
      trafficOk()
        ? `трафик ok · здоровых ${healthyOn(init.nodes, init.replicas).length}/${init.desired}`
        : 'трафик fail · здоровых экземпляров нет',
    )

    await wait(reducedMotion() ? 0 : STEP * 1000)
    setPhase('kill')
    const nextNodes = init.nodes.map((n) =>
      n.id === killTarget ? { ...n, alive: false } : { ...n },
    )
    setNodes(nextNodes)
    log('err', `${nextNodes.find((n) => n.id === killTarget)?.label} недоступен`)

    const afterKill = init.replicas.map((r) =>
      r.nodeId === killTarget ? { ...r, healthy: false } : { ...r },
    )

    await wait(reducedMotion() ? 0 : STEP * 1000)
    setPhase('recover')

    let finalReplicas = afterKill
    if (init.managerOn) {
      finalReplicas = placeReplicas(
        nextNodes,
        afterKill,
        init.desired,
        init.spread,
        true,
      )
      log('info', 'менеджер сверяет desired state и ставит замену')
    } else {
      log('info', 'менеджера нет — замена не создаётся')
    }
    setReplicas(finalReplicas)

    await wait(reducedMotion() ? 0 : STEP * 1000)
    setPhase('done')
    const finalHealthy = healthyOn(nextNodes, finalReplicas).length
    log(
      finalHealthy > 0 ? 'ok' : 'err',
      finalHealthy > 0
        ? `трафик снова ok · здоровых ${finalHealthy}/${init.desired}`
        : `трафик fail · здоровых ${finalHealthy}/${init.desired}`,
    )

    if (caseId === 'single') {
      setHint('Без менеджера и резервных узлов один сбой = сервис недоступен.')
    } else if (caseId === 'heal') {
      setHint('Self-healing работает, когда реплики разнесены по живым узлам.')
    } else {
      setHint('Три реплики на одном узле не дают отказоустойчивости — падает весь узел целиком.')
    }

    setBusy(false)
  }, [caseId, clear, log])

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={busy}
            onClick={() => {
              setCaseId(c.id)
              resetCase(c.id)
            }}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={() => void run()}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={() => resetCase(caseId)}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ClusterViz
        nodes={nodes}
        replicas={replicas}
        phase={phase}
        killTarget={config.killTarget}
      />

      <div className={styles.statusRow}>
        <span className={styles.via}>
          здоровых {healthyCount}/{config.desired}
        </span>
        <span className={styles.via}>
          менеджер {config.managerOn ? 'вкл' : 'выкл'}
        </span>
        <span className={styles.via}>
          размещение {config.spread ? 'spread' : 'pack'}
        </span>
      </div>

      {hint && phase === 'done' ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <InteractiveCodePanel
        topicId={TOPIC_ID}
        intro={CODE_INTRO}
        snippets={CODE_SNIPPETS}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Кластер и менеджер"
      lead="Один сервер против кластера: что меняется после падения узла и зачем нужен менеджер."
      problem={problem}
      code={code}
    />
  )
}

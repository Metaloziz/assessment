import { useCallback, useMemo, useState } from 'react'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import styles from './ServerClustersLab.module.css'

type LogKind = 'ok' | 'err' | 'info'
type LogLine = { kind: LogKind; text: string }

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
  pushLog: (line: LogLine) => void,
): Replica[] {
  if (!managerOn) {
    pushLog({ kind: 'info', text: 'менеджер выключен — desired state не поддерживается' })
    return replicas.filter((r) => r.healthy)
  }

  const aliveIds = new Set(nodes.filter((n) => n.alive).map((n) => n.id))
  let next = replicas.filter((r) => r.healthy && aliveIds.has(r.nodeId))

  while (next.length > desired) {
    const drop = next.pop()
    if (drop) pushLog({ kind: 'info', text: `scale-down stop ${drop.id}` })
  }

  while (next.length < desired) {
    const node = pickNode(nodes, next, spread)
    if (!node) {
      pushLog({
        kind: 'err',
        text: `некуда ставить: alive nodes=0 (running ${next.length}/${desired})`,
      })
      break
    }
    const id = nextReplicaId()
    next = [...next, { id, nodeId: node.id, healthy: true }]
    pushLog({
      kind: 'ok',
      text: `schedule ${id} → ${node.label}${spread ? ' (spread)' : ' (packed)'}`,
    })
  }

  return next
}

export type LiveServerClustersApi = ReturnType<typeof useLiveServerClustersLab>

export function useLiveServerClustersLab() {
  const [nodes, setNodes] = useState<Node[]>(() => THREE_NODES.map((n) => ({ ...n })))
  const [replicas, setReplicas] = useState<Replica[]>([])
  const [desired, setDesired] = useState(1)
  const [managerOn, setManagerOn] = useState(false)
  const [spread, setSpread] = useState(true)
  const [load, setLoad] = useState(20)
  const [stats, setStats] = useState({ ok: 0, fail: 0 })
  const [log, setLog] = useState<LogLine[]>([])

  const pushLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev.slice(-24), line])
  }, [])

  const healthy = useMemo(() => healthyOn(nodes, replicas), [nodes, replicas])

  const applyDesired = useCallback(() => {
    pushLog({
      kind: 'info',
      text: `desired=${desired}, manager=${managerOn ? 'on' : 'off'}, placement=${spread ? 'spread' : 'pack'}`,
    })
    setReplicas((prev) => placeReplicas(nodes, prev, desired, spread, managerOn, pushLog))
  }, [desired, managerOn, nodes, pushLog, spread])

  const enableManager = useCallback(() => {
    setManagerOn(true)
    pushLog({ kind: 'ok', text: 'менеджер кластера включён' })
    setReplicas((prev) => placeReplicas(nodes, prev, desired, spread, true, pushLog))
  }, [desired, nodes, pushLog, spread])

  const disableManager = useCallback(() => {
    setManagerOn(false)
    pushLog({ kind: 'err', text: 'менеджер выключен — без self-healing' })
  }, [pushLog])

  const killNode = useCallback(
    (nodeId: string) => {
      setNodes((prevNodes) => {
        const node = prevNodes.find((n) => n.id === nodeId)
        if (!node?.alive) return prevNodes
        const nextNodes = prevNodes.map((n) =>
          n.id === nodeId ? { ...n, alive: false } : n,
        )
        pushLog({ kind: 'err', text: `node lost ${node.label}` })

        setReplicas((prev) => {
          const lost = prev.filter((r) => r.nodeId === nodeId && r.healthy)
          for (const r of lost) pushLog({ kind: 'err', text: `replica down ${r.id}` })
          const surviving = prev.map((r) =>
            r.nodeId === nodeId ? { ...r, healthy: false } : r,
          )
          if (managerOn) {
            pushLog({ kind: 'info', text: 'self-healing: reconcile desired state' })
            return placeReplicas(nextNodes, surviving, desired, spread, true, pushLog)
          }
          pushLog({ kind: 'info', text: 'без менеджера замена не создаётся' })
          return surviving.filter((r) => r.healthy)
        })

        return nextNodes
      })
    },
    [desired, managerOn, pushLog, spread],
  )

  const restoreNode = useCallback(
    (nodeId: string) => {
      setNodes((prevNodes) => {
        const node = prevNodes.find((n) => n.id === nodeId)
        if (!node || node.alive) return prevNodes
        const nextNodes = prevNodes.map((n) =>
          n.id === nodeId ? { ...n, alive: true } : n,
        )
        pushLog({ kind: 'ok', text: `node restored ${node.label}` })
        if (managerOn) {
          setReplicas((prev) => placeReplicas(nextNodes, prev, desired, spread, true, pushLog))
        }
        return nextNodes
      })
    },
    [desired, managerOn, pushLog, spread],
  )

  const sendTraffic = useCallback(() => {
    setNodes((currentNodes) => {
      setReplicas((currentReplicas) => {
        const targets = healthyOn(currentNodes, currentReplicas)
        let ok = 0
        let fail = 0
        for (let i = 0; i < load; i += 1) {
          if (targets.length === 0) fail += 1
          else ok += 1
        }
        setStats({ ok, fail })
        if (fail === load) {
          pushLog({ kind: 'err', text: `трафик ${load}: 0 ok / ${fail} fail — сервис недоступен` })
        } else {
          pushLog({
            kind: 'ok',
            text: `трафик ${load}: ${ok} ok / ${fail} fail · healthy=${targets.length}`,
          })
        }
        return currentReplicas
      })
      return currentNodes
    })
  }, [load, pushLog])

  const reset = useCallback(() => {
    replicaSeq = 0
    setNodes(THREE_NODES.map((n) => ({ ...n })))
    setReplicas([])
    setDesired(1)
    setManagerOn(false)
    setSpread(true)
    setLoad(20)
    setStats({ ok: 0, fail: 0 })
    setLog([])
    pushLog({ kind: 'info', text: 'cluster reset' })
  }, [pushLog])

  const clearLog = useCallback(() => setLog([]), [])

  const demoSingleServer = useCallback(() => {
    replicaSeq = 0
    const single = [{ id: 'n1', label: 'node-1', alive: true }]
    setNodes(single)
    setManagerOn(false)
    setSpread(true)
    setDesired(1)
    setStats({ ok: 0, fail: 0 })
    const only: Replica[] = [{ id: nextReplicaId(), nodeId: 'n1', healthy: true }]
    setReplicas(only)
    setLog([])
    pushLog({ kind: 'info', text: 'сценарий: один сервер, менеджер выключен' })
    pushLog({ kind: 'ok', text: `schedule ${only[0].id} → node-1` })
  }, [pushLog])

  const demoManagedCluster = useCallback(() => {
    replicaSeq = 0
    const nextNodes = THREE_NODES.map((n) => ({ ...n }))
    setNodes(nextNodes)
    setManagerOn(true)
    setSpread(true)
    setDesired(3)
    setStats({ ok: 0, fail: 0 })
    setLog([])
    pushLog({ kind: 'info', text: 'сценарий: 3 узла + менеджер, desired=3, spread' })
    const placed = placeReplicas(nextNodes, [], 3, true, true, pushLog)
    setReplicas(placed)
  }, [pushLog])

  return {
    nodes,
    replicas,
    desired,
    managerOn,
    spread,
    load,
    stats,
    log,
    healthyCount: healthy.length,
    availability: healthy.length > 0 ? 100 : 0,
    setDesired,
    setSpread,
    setLoad,
    applyDesired,
    enableManager,
    disableManager,
    killNode,
    restoreNode,
    sendTraffic,
    reset,
    clearLog,
    demoSingleServer,
    demoManagedCluster,
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

function StatusRow({ lab }: { lab: LiveServerClustersApi }) {
  return (
    <div className={styles.statusRow}>
      <span className={lab.managerOn ? styles.badgeOn : styles.badgeOff}>
        manager {lab.managerOn ? 'on' : 'off'}
      </span>
      <span className={styles.via}>
        healthy {lab.healthyCount}/{lab.desired}
      </span>
      <span className={lab.availability === 100 ? styles.badgeOn : styles.badgeOff}>
        avail {lab.availability}%
      </span>
      <span className={styles.via}>
        last {lab.stats.ok} ok / {lab.stats.fail} fail
      </span>
    </div>
  )
}

function ClusterBoard({ lab }: { lab: LiveServerClustersApi }) {
  return (
    <div className={styles.cluster}>
      {lab.nodes.map((node) => {
        const nodeReplicas = lab.replicas.filter((r) => r.nodeId === node.id && r.healthy)
        return (
          <article
            key={node.id}
            className={`${styles.node} ${node.alive ? '' : styles.nodeDead}`}
          >
            <header className={styles.nodeHead}>
              <span className={styles.nodeName}>{node.label}</span>
              <span className={node.alive ? styles.badgeOn : styles.badgeOff}>
                {node.alive ? 'alive' : 'down'}
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
            <div className={styles.nodeActions}>
              {node.alive ? (
                <LabButton variant="danger" onClick={() => lab.killNode(node.id)}>
                  Kill node
                </LabButton>
              ) : (
                <LabButton variant="secondary" onClick={() => lab.restoreNode(node.id)}>
                  Restore
                </LabButton>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function ClustersProblemPanel({ lab }: { lab: LiveServerClustersApi }) {
  return (
    <div className={styles.panelRoot}>
      <div className={styles.problem}>
        <div className={styles.problemLabel}>Проблема</div>
        <p>
          Платёжный API стоял на одном сервере. Сервер умер в пик нагрузки — оплаты остановились у
          всех.
        </p>
        <div className={styles.problemLabel}>Решение</div>
        <p>
          Несколько машин + менеджер кластера: держит нужное число копий на разных узлах и сам
          поднимает замену после падения.
        </p>
      </div>

      <StatusRow lab={lab} />

      <div className={styles.actions}>
        <LabButton variant="secondary" onClick={lab.demoSingleServer}>
          1. Один сервер
        </LabButton>
        <LabButton variant="danger" onClick={() => lab.killNode('n1')}>
          2. Убить сервер
        </LabButton>
        <LabButton variant="primary" onClick={lab.sendTraffic}>
          Проверить трафик
        </LabButton>
      </div>

      <div className={styles.actions}>
        <LabButton variant="primary" onClick={lab.demoManagedCluster}>
          3. Кластер + менеджер ×3
        </LabButton>
        <LabButton variant="danger" onClick={() => lab.killNode('n1')}>
          4. Убить node-1
        </LabButton>
        <LabButton variant="primary" onClick={lab.sendTraffic}>
          5. Снова трафик
        </LabButton>
        <LabButton variant="secondary" onClick={lab.reset}>
          Сброс
        </LabButton>
      </div>

      <ClusterBoard lab={lab} />

      <p className={styles.tip}>
        Шаги 1→2→трафик: сервис мёртв. Шаги 3→4→трафик: менеджер разносит реплики и поднимает замену
        на живом узле.
      </p>

      <LabLog log={lab.log} />
    </div>
  )
}

export function ClustersSandboxPanel({ lab }: { lab: LiveServerClustersApi }) {
  return (
    <div className={styles.panelRoot}>
      <p className={styles.tip}>
        Крути desired, pack vs spread, менеджер on/off, убивай узлы и гоняй трафик. Pack на одном
        node + kill = «три реплики» не спасают.
      </p>

      <StatusRow lab={lab} />

      <div className={styles.controls}>
        <label className={styles.field}>
          <span>desired</span>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={lab.desired}
            onChange={(e) => lab.setDesired(Number(e.target.value))}
          />
          <strong>{lab.desired}</strong>
        </label>
        <label className={styles.field}>
          <span>load</span>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={lab.load}
            onChange={(e) => lab.setLoad(Number(e.target.value))}
          />
          <strong>{lab.load}</strong>
        </label>
      </div>

      <div className={styles.actions}>
        {lab.managerOn ? (
          <LabButton variant="secondary" onClick={lab.disableManager}>
            Manager OFF
          </LabButton>
        ) : (
          <LabButton variant="primary" onClick={lab.enableManager}>
            Manager ON
          </LabButton>
        )}
        <LabButton
          variant={lab.spread ? 'primary' : 'secondary'}
          onClick={() => lab.setSpread(true)}
        >
          Spread
        </LabButton>
        <LabButton
          variant={!lab.spread ? 'danger' : 'secondary'}
          onClick={() => lab.setSpread(false)}
        >
          Pack (антипаттерн)
        </LabButton>
        <LabButton variant="primary" onClick={lab.applyDesired}>
          Apply desired
        </LabButton>
        <LabButton variant="primary" onClick={lab.sendTraffic}>
          Send traffic
        </LabButton>
        <LabButton variant="secondary" onClick={lab.clearLog}>
          Очистить лог
        </LabButton>
        <LabButton variant="secondary" onClick={lab.reset}>
          Reset
        </LabButton>
      </div>

      <ClusterBoard lab={lab} />
      <LabLog log={lab.log} />
    </div>
  )
}

export function ClustersCodePanel() {
  return (
    <LabCodePanel
      intro="Кластер сам по себе — просто набор машин. Менеджер сравнивает desired state с фактом и чинит расхождения."
      snippets={[
        {
          label: 'Kubernetes Deployment (desired replicas)',
          language: 'yaml',
          code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: payment-api
                topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: registry.bank.example/payment-api:1.4.2
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080`,
        },
        {
          label: 'Цикл менеджера (псевдокод)',
          language: 'javascript',
          code: `reconcile(desired) {
  const healthy = replicasOnAliveNodes()
  while (healthy.length < desired) {
    const node = pickNode(spread ? 'leastLoaded' : 'first')
    schedule(replica, node)
  }
}

onNodeLost(node) {
  markReplicasDown(node)
  if (managerEnabled) reconcile(desired)
}`,
        },
        {
          label: 'Типичная ошибка',
          language: 'text',
          note: 'Три реплики на одном узле не дают отказоустойчивости.',
          code: `replicas: 3
все на node-1
→ Kill node-1
→ healthy 0/3, трафик fail`,
        },
      ]}
    />
  )
}

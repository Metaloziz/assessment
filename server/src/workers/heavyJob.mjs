import { parentPort, workerData } from 'node:worker_threads'

const durationMs = Number(workerData?.durationMs ?? 350)

function burn(ms) {
  const end = performance.now() + ms
  let x = 0
  while (performance.now() < end) {
    x = (x + 1) % 1_000_000_007
  }
  return x
}

const started = performance.now()
const checksum = burn(durationMs)
const elapsedMs = Math.round(performance.now() - started)

parentPort.postMessage({ ok: true, checksum, durationMs, elapsedMs })

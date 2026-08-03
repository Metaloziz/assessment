/// <reference lib="webworker" />

import type { HeavyRequest, HeavyResponse } from './heavy.types'

function sumPrimesUpTo(limit: number): number {
  if (limit < 2) return 0
  const sieve = new Uint8Array(limit + 1)
  sieve.fill(1)
  sieve[0] = 0
  sieve[1] = 0
  for (let i = 2; i * i <= limit; i += 1) {
    if (!sieve[i]) continue
    for (let j = i * i; j <= limit; j += i) sieve[j] = 0
  }
  let sum = 0
  for (let i = 2; i <= limit; i += 1) {
    if (sieve[i]) sum += i
  }
  return sum
}

self.onmessage = (event: MessageEvent<HeavyRequest>) => {
  const msg = event.data
  if (!msg || msg.type !== 'sumPrimes') return
  const t0 = performance.now()
  const result = sumPrimesUpTo(msg.limit)
  const ms = Math.round(performance.now() - t0)
  const response: HeavyResponse = {
    type: 'sumPrimes',
    limit: msg.limit,
    result,
    ms,
  }
  self.postMessage(response)
}

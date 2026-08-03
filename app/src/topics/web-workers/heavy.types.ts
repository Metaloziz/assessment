export type HeavyRequest = {
  type: 'sumPrimes'
  limit: number
}

export type HeavyResponse = {
  type: 'sumPrimes'
  limit: number
  result: number
  ms: number
}

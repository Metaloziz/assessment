/** In-process seed store when DATABASE_URL is unset (labs still work without Postgres). */

export type LabUser = { id: number; email: string }
export type LabItem = { id: number; title: string }

const users = new Map<number, LabUser>([[1, { id: 1, email: 'ada@example.com' }]])

const docs = new Map<string, Record<string, unknown>>([
  ['1', { _id: '1', email: 'ada@example.com', role: 'admin' }],
])

const items = new Map<number, LabItem>([[1, { id: 1, title: 'widget' }]])

export const labMemory = {
  getUser(id: number): LabUser | null {
    return users.get(id) ?? null
  },

  getDoc(id: string): Record<string, unknown> | null {
    return docs.get(id) ?? null
  },

  getItem(id: number): LabItem | null {
    return items.get(id) ?? null
  },

  upsertItem(id: number, title: string): LabItem {
    const item = { id, title }
    items.set(id, item)
    return item
  },
}

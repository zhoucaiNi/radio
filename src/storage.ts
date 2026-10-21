import { LINEUP } from './somafm'

export type Stored = { channelId: string; volume: number }

const KEY = 'radio:v1'
const DEFAULTS: Stored = { channelId: 'groovesalad', volume: 0.7 }

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function loadStored(storage: Storage | undefined = browserStorage()): Stored {
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? 'null') as Partial<Stored> | null
    const channelId = LINEUP.some((c) => c.id === raw?.channelId) ? raw!.channelId! : DEFAULTS.channelId
    const v = raw?.volume
    const volume = typeof v === 'number' && v >= 0 && v <= 1 ? v : DEFAULTS.volume
    return { channelId, volume }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveStored(s: Stored, storage: Storage | undefined = browserStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s))
  } catch {
    // Private mode or blocked storage: the radio still works, it just won't remember.
  }
}

import { describe, expect, it } from 'vitest'
import { loadStored, saveStored } from './storage'

const DEFAULTS = { channelId: 'groovesalad', volume: 0.7 }

function memory(initial?: string): Storage {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set('radio:v1', initial)
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size
    },
  }
}

const throwing = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
} as unknown as Storage

describe('loadStored', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadStored(memory())).toEqual(DEFAULTS)
  })

  it('returns what was saved', () => {
    const s = memory()
    saveStored({ channelId: 'bossa', volume: 0.3 }, s)
    expect(loadStored(s)).toEqual({ channelId: 'bossa', volume: 0.3 })
  })

  it('returns defaults for corrupt JSON', () => {
    expect(loadStored(memory('{nope'))).toEqual(DEFAULTS)
  })

  it('resets a channel outside the lineup but keeps the volume', () => {
    expect(loadStored(memory(JSON.stringify({ channelId: 'christmas', volume: 0.2 })))).toEqual({
      channelId: 'groovesalad',
      volume: 0.2,
    })
  })

  it('resets a volume outside 0..1', () => {
    expect(loadStored(memory(JSON.stringify({ channelId: 'lush', volume: 4 })))).toEqual({
      channelId: 'lush',
      volume: 0.7,
    })
  })

  it('returns defaults when storage throws', () => {
    expect(loadStored(throwing)).toEqual(DEFAULTS)
  })
})

describe('saveStored', () => {
  it('does not throw when storage throws', () => {
    expect(() => saveStored(DEFAULTS, throwing)).not.toThrow()
  })
})

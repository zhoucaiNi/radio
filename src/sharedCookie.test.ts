import { afterEach, describe, expect, it } from 'vitest'
import { COOKIE_NAME, cookieString, readShared, worldPlaying, writeShared } from './sharedCookie'

const state = { channelId: 'bossa', volume: 0.4, on: true }

describe('cookieString', () => {
  it('stores the state as encoded JSON under the radio name', () => {
    const value = cookieString(state, 'radio.zhoucai.me', true).split('; ')[0]
    expect(value.startsWith(`${COOKIE_NAME}=`)).toBe(true)
    expect(JSON.parse(decodeURIComponent(value.slice(COOKIE_NAME.length + 1)))).toEqual(state)
  })

  it('shares with every zhoucai.me subdomain over https', () => {
    const attrs = cookieString(state, 'radio.zhoucai.me', true).split('; ')
    expect(attrs).toEqual(expect.arrayContaining(['Domain=.zhoucai.me', 'Path=/', 'SameSite=Lax', 'Secure']))
  })

  it('stays host-only off zhoucai.me and over plain http', () => {
    const attrs = cookieString(state, 'localhost', false).split('; ')
    expect(attrs.some((a) => a.startsWith('Domain='))).toBe(false)
    expect(attrs).not.toContain('Secure')
  })

  it('does not treat lookalike hosts as zhoucai.me', () => {
    expect(cookieString(state, 'evilzhoucai.me', true)).not.toContain('Domain=')
  })
})

const enc = (o: unknown) => `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(o))}`
const clear = () => {
  document.cookie = 'radio=; Path=/; Max-Age=0'
  document.cookie = 'radio-world=; Path=/; Max-Age=0'
}

describe('readShared', () => {
  it('reads a valid cookie', () => {
    expect(readShared(enc(state))).toEqual(state)
  })

  it('checks each field on its own and drops only the bad ones', () => {
    expect(readShared(enc({ channelId: 'nope', volume: 0.4, on: true }))).toEqual({ volume: 0.4, on: true })
    expect(readShared(enc({ channelId: 'bossa', volume: 2, on: true }))).toEqual({ channelId: 'bossa', on: true })
    expect(readShared(enc({ channelId: 'bossa', volume: '0.4', on: 'true' }))).toEqual({ channelId: 'bossa' })
    expect(readShared(enc({ channelId: 'bossa', volume: -0.1, on: false }))).toEqual({ channelId: 'bossa' })
  })

  it('returns nothing for a missing or broken cookie', () => {
    expect(readShared('other=1')).toEqual({})
    expect(readShared('radio=%7Bnot-json')).toEqual({})
    expect(readShared(`${COOKIE_NAME}=null`)).toEqual({})
  })

  it('finds the radio cookie among others', () => {
    expect(readShared(`a=1; ${enc(state)}; radio-world=x`)).toEqual(state)
  })
})

describe('worldPlaying', () => {
  it('is true only while the radio-world heartbeat is present', () => {
    expect(worldPlaying('radio=abc')).toBe(false)
    expect(worldPlaying('radio=abc; radio-world=tab1')).toBe(true)
  })
})

describe('writeShared', () => {
  afterEach(clear)

  it('keeps the fields it does not own', () => {
    writeShared({ channelId: 'bossa', volume: 0.4 })
    document.cookie = `${enc({ ...readShared(), on: true })}; Path=/`
    writeShared({ volume: 0.2 })
    expect(readShared()).toEqual({ channelId: 'bossa', volume: 0.2, on: true })
    writeShared({ on: false })
    expect(readShared()).toEqual({ channelId: 'bossa', volume: 0.2 })
  })
})

import { describe, expect, it } from 'vitest'
import { COOKIE_NAME, cookieString } from './sharedCookie'

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

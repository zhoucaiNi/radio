// The world at world.zhoucai.me plays whatever the radio is playing. localStorage is per origin, so the
// station is also written to a cookie on the parent domain, which every *.zhoucai.me site can read.
import { LINEUP } from './somafm'

export type Shared = { channelId: string; volume: number; on: boolean }

export const COOKIE_NAME = 'radio'
// Set by a world tab while it is audibly playing the music (it expires on its own within seconds).
export const WORLD_COOKIE = 'radio-world'
const MAX_AGE = 60 * 60 * 24 * 365 // seconds; Safari caps cookies written from script at about 7 days

export function cookieString(s: Partial<Shared>, host: string, secure: boolean): string {
  const shared = host === 'zhoucai.me' || host.endsWith('.zhoucai.me')
  return [
    `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(s))}`,
    'Path=/',
    `Max-Age=${MAX_AGE}`,
    'SameSite=Lax',
    // On localhost or a preview host there is no parent domain to share with, so it stays host-only.
    ...(shared ? ['Domain=.zhoucai.me'] : []),
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

function getCookie(cookie: string, name: string): string | undefined {
  for (const part of cookie.split('; ')) {
    const eq = part.indexOf('=')
    if (part.slice(0, eq) === name) return part.slice(eq + 1)
  }
  return undefined
}

// Each field is checked on its own, so one bad field doesn't throw away the others.
export function readShared(cookie: string = document.cookie): Partial<Shared> {
  try {
    const raw = getCookie(cookie, COOKIE_NAME)
    if (raw === undefined) return {}
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<Record<keyof Shared, unknown>> | null
    const out: Partial<Shared> = {}
    if (typeof parsed?.channelId === 'string' && LINEUP.some((c) => c.id === parsed.channelId)) out.channelId = parsed.channelId
    const v = parsed?.volume
    if (typeof v === 'number' && v >= 0 && v <= 1) out.volume = v
    if (parsed?.on === true) out.on = true
    return out
  } catch {
    return {}
  }
}

export function worldPlaying(cookie: string = document.cookie): boolean {
  return getCookie(cookie, WORLD_COOKIE) !== undefined
}

// Read-modify-write: the world writes `on` too, so only the fields in `patch` change.
export function writeShared(patch: Partial<Shared>): void {
  try {
    document.cookie = cookieString({ ...readShared(), ...patch }, location.hostname, location.protocol === 'https:')
  } catch {
    // Cookies blocked: the radio still works, the world just won't follow it.
  }
}

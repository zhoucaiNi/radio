// The world at world.zhoucai.me plays whatever the radio is playing. localStorage is per origin, so the
// station is also written to a cookie on the parent domain, which every *.zhoucai.me site can read.
export type Shared = { channelId: string; volume: number; on: boolean }

export const COOKIE_NAME = 'radio'
const MAX_AGE = 60 * 60 * 24 * 365 // seconds; Safari caps cookies written from script at about 7 days

export function cookieString(s: Shared, host: string, secure: boolean): string {
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

export function writeShared(s: Shared): void {
  try {
    document.cookie = cookieString(s, location.hostname, location.protocol === 'https:')
  } catch {
    // Cookies blocked: the radio still works, the world just won't follow it.
  }
}

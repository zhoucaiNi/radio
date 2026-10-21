export type Channel = {
  id: string
  short: string
  title: string
  description: string
  listeners: number
  genre: string
}

export type Track = { artist: string; title: string }

export const LINEUP: ReadonlyArray<{ id: string; short: string }> = [
  { id: 'groovesalad', short: 'Groove' },
  { id: 'lush', short: 'Lush' },
  { id: 'bossa', short: 'Bossa' },
  { id: 'dronezone', short: 'Drone' },
  { id: 'fluid', short: 'Fluid' },
  { id: 'deepspaceone', short: 'Space' },
  { id: 'folkfwd', short: 'Folk' },
  { id: 'secretagent', short: 'Agent' },
]

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null
const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function parsePls(text: string): string[] {
  const entries: [number, string][] = []
  for (const line of text.split(/\r?\n/)) {
    const m = /^File(\d+)=(.+)$/.exec(line.trim())
    if (m) entries.push([Number(m[1]), m[2].trim()])
  }
  return entries.sort((a, b) => a[0] - b[0]).map(([, url]) => url)
}

export function toChannels(json: unknown): Channel[] {
  if (!isObj(json) || !Array.isArray(json.channels)) return []
  const byId = new Map<string, Obj>()
  for (const c of json.channels) if (isObj(c) && typeof c.id === 'string') byId.set(c.id, c)
  return LINEUP.flatMap(({ id, short }) => {
    const c = byId.get(id)
    if (!c) return []
    return [
      {
        id,
        short,
        title: str(c.title),
        description: str(c.description).trim(),
        genre: str(c.genre),
        listeners: Number(c.listeners) || 0,
      },
    ]
  })
}

export function parseSongs(json: unknown): Track[] {
  if (!isObj(json) || !Array.isArray(json.songs)) return []
  return json.songs.filter(isObj).map((s) => ({ artist: str(s.artist), title: str(s.title) }))
}

async function get(url: string, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${url} responded ${res.status}`)
  return res
}

export async function fetchChannels(): Promise<Channel[]> {
  return toChannels(await (await get('https://somafm.com/channels.json')).json())
}

export async function fetchStreams(id: string): Promise<string[]> {
  return parsePls(await (await get(`https://api.somafm.com/${id}.pls`)).text())
}

export async function fetchSongs(id: string, signal?: AbortSignal): Promise<Track[]> {
  return parseSongs(await (await get(`https://somafm.com/songs/${id}.json`, signal)).json())
}

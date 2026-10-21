import { useEffect, useRef, useState } from 'react'
import { fetchSongs as defaultFetchSongs, type Track } from '../somafm'

type Props = {
  channelId: string
  active: boolean
  fetchSongs?: (id: string, signal?: AbortSignal) => Promise<Track[]>
  onCurrent?: (t: Track | null) => void
}

const POLL_MS = 30_000

export default function RecentlyPlayed({ channelId, active, fetchSongs = defaultFetchSongs, onCurrent }: Props) {
  const [songs, setSongs] = useState<{ channelId: string; list: Track[] } | null>(null)
  const onCurrentRef = useRef(onCurrent)
  onCurrentRef.current = onCurrent

  useEffect(() => {
    let alive = true
    const ctrl = new AbortController()
    const load = () =>
      fetchSongs(channelId, ctrl.signal).then(
        (list) => {
          if (!alive) return
          setSongs({ channelId, list })
          onCurrentRef.current?.(list[0] ?? null)
        },
        () => {
          if (!alive) return
          setSongs(null)
          onCurrentRef.current?.(null)
        },
      )
    load()
    const timer = active ? setInterval(load, POLL_MS) : undefined
    return () => {
      alive = false
      ctrl.abort()
      clearInterval(timer)
    }
  }, [channelId, active, fetchSongs])

  const recent = songs?.channelId === channelId ? songs.list.slice(1, 4) : []
  if (recent.length === 0) return null
  return (
    <section className="recent" aria-label="Recently played">
      <h2>Recently played</h2>
      <ul>
        {recent.map((t, i) => (
          <li key={i}>
            <strong>{t.artist}</strong> — {t.title}
          </li>
        ))}
      </ul>
    </section>
  )
}

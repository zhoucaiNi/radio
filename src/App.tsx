import { useCallback, useEffect, useState } from 'react'
import Controls from './components/Controls'
import Dial from './components/Dial'
import RadioWindow from './components/RadioWindow'
import RecentlyPlayed from './components/RecentlyPlayed'
import Scene from './components/Scene'
import { fetchChannels, type Channel, type Track } from './somafm'
import { loadStored, saveStored } from './storage'
import { usePlayer } from './usePlayer'
import './styles.css'

const KNOB_SWEEP = 240

// Keys typed into a control belong to that control: a focused button or link
// already handles Space natively, and inputs handle arrows.
function ownsKey(target: EventTarget | null, key: string) {
  const owners = key === ' ' ? 'input, button, a, textarea, select' : 'input, textarea, select'
  return target instanceof HTMLElement && target.closest(owners) !== null
}

export default function App() {
  const [stored] = useState(loadStored)
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [selectedId, setSelectedId] = useState(stored.channelId)
  const [volume, setVolumeState] = useState(stored.volume)
  const [track, setTrack] = useState<Track | null>(null)
  const player = usePlayer()
  const playing = player.status === 'playing' || player.status === 'loading'

  const load = useCallback(() => {
    setLoadFailed(false)
    fetchChannels().then(
      (list) => (list.length ? setChannels(list) : setLoadFailed(true)),
      () => setLoadFailed(true),
    )
  }, [])

  useEffect(load, [load])

  const { prime, setVolume } = player

  useEffect(() => {
    setVolume(stored.volume)
  }, [setVolume, stored.volume])

  useEffect(() => {
    channels?.forEach((c) => prime(c.id))
  }, [channels, prime])

  const list = channels ?? []
  const index = Math.max(0, list.findIndex((c) => c.id === selectedId))
  const current = list[index]
  const currentId = current?.id ?? selectedId

  const select = useCallback(
    (id: string) => {
      setSelectedId(id)
      setTrack(null)
      saveStored({ channelId: id, volume })
      if (playing) player.play(id)
    },
    [playing, player, volume],
  )

  const step = useCallback(
    (delta: number) => {
      if (!list.length) return
      select(list[(index + delta + list.length) % list.length].id)
    },
    [list, index, select],
  )

  const toggle = useCallback(() => {
    if (playing) player.pause()
    else player.play(currentId)
  }, [playing, player, currentId])

  const changeVolume = (v: number) => {
    setVolumeState(v)
    player.setVolume(v)
    saveStored({ channelId: currentId, volume: v })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ownsKey(e.target, e.key) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowRight') {
        step(1)
      } else if (e.key === 'ArrowLeft') {
        step(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, step])

  const angle = list.length > 1 ? -KNOB_SWEEP / 2 + (index * KNOB_SWEEP) / (list.length - 1) : 0

  return (
    <div className="page">
      <Scene />
      <header className="site-header">
        <span className="wordmark">radio</span>
        <a className="home-link" href="https://zhoucai.me">
          zhoucai.me
        </a>
      </header>
      <main className="site-main">
        <RadioWindow title={current ? `radio — ${current.title}` : 'radio'}>
          {loadFailed ? (
            <p className="message" role="alert">
              Can't reach the radio right now
              <button type="button" onClick={load}>
                try again
              </button>
            </p>
          ) : channels ? (
            <div className="radio">
              <div className="grille" aria-hidden="true" />
              <div className="radio-main">
                <Dial channels={list} selectedId={currentId} track={track} onSelect={select} />
                {player.status === 'error' && (
                  <p className="message" role="status">
                    This station's quiet — try another
                  </p>
                )}
                <Controls
                  playing={playing}
                  volume={volume}
                  angle={angle}
                  onPrev={() => step(-1)}
                  onNext={() => step(1)}
                  onToggle={toggle}
                  onVolume={changeVolume}
                />
                <RecentlyPlayed channelId={currentId} active={playing} onCurrent={setTrack} />
              </div>
            </div>
          ) : (
            <p className="message">tuning in…</p>
          )}
        </RadioWindow>
      </main>
      <footer className="site-footer">
        <span className="footer-note">
          Music by SomaFM, listener-supported · <a href="https://somafm.com/support/">donate</a>
        </span>
      </footer>
    </div>
  )
}

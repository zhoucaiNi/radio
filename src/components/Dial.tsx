import type { CSSProperties } from 'react'
import type { Channel, Track } from '../somafm'

type Props = {
  channels: Channel[]
  selectedId: string
  track: Track | null
  onSelect: (id: string) => void
}

export default function Dial({ channels, selectedId, track, onSelect }: Props) {
  const index = Math.max(0, channels.findIndex((c) => c.id === selectedId))
  const current = channels[index]
  return (
    <section className="dial" aria-label="Tuner">
      <div className="dial-head">
        <h1 className="dial-title">{current?.title}</h1>
        {current && <span className="dial-listeners">{current.listeners.toLocaleString('en-US')} listening</span>}
      </div>
      <p className="dial-desc">{current?.description}</p>
      {track && (
        <p className="dial-now">
          <span className="dial-now-label">now playing</span> <span>{`${track.artist} — ${track.title}`}</span>
        </p>
      )}
      <div className="dial-scroll">
        <div className="dial-scale" style={{ '--i': index, '--n': channels.length } as CSSProperties}>
          <div className="dial-needle" aria-hidden="true" />
          <div className="dial-stops" role="group" aria-label="Stations">
            {channels.map((c) => (
              <button
                key={c.id}
                type="button"
                className="dial-stop"
                aria-pressed={c.id === selectedId}
                onClick={() => onSelect(c.id)}
              >
                {c.short}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

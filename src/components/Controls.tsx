type Props = {
  playing: boolean
  volume: number
  angle: number
  onPrev: () => void
  onNext: () => void
  onToggle: () => void
  onVolume: (v: number) => void
}

export default function Controls({ playing, volume, angle, onPrev, onNext, onToggle, onVolume }: Props) {
  return (
    <div className="controls">
      <div className="tuning">
        <button type="button" className="icon-btn" aria-label="Previous station" onClick={onPrev}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <svg className="knob" aria-hidden="true" viewBox="0 0 104 104">
          <circle cx="52" cy="52" r="50" fill="#14212b" />
          <circle cx="52" cy="52" r="40" fill="#2a3a52" />
          <line className="knob-pointer" x1="52" y1="20" x2="52" y2="36" style={{ transform: `rotate(${angle}deg)` }} />
        </svg>
        <button type="button" className="icon-btn" aria-label="Next station" onClick={onNext}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <button type="button" className="play-btn" onClick={onToggle}>
        {playing ? (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="7 4 20 12 7 20 7 4" />
          </svg>
        )}
        {playing ? 'pause' : 'play'}
      </button>
      <div className="volume">
        <label htmlFor="volume">volume</label>
        <input
          id="volume"
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => onVolume(Number(e.target.value) / 100)}
        />
      </div>
    </div>
  )
}

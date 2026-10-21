import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchStreams } from './somafm'

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error'

type Options = {
  createAudio?: () => HTMLAudioElement
  getStreams?: (id: string) => Promise<string[]>
}

// One attempt to play a station: its mirror list and which mirror is loaded.
type Attempt = { streams: string[]; index: number }

export function usePlayer({ createAudio = () => new Audio(), getStreams = fetchStreams }: Options = {}) {
  const [status, setStatus] = useState<PlayerStatus>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // The attempt that may still change the status; null after pause or a newer play().
  const attemptRef = useRef<Attempt | null>(null)
  const optsRef = useRef({ createAudio, getStreams })

  const audio = useCallback(() => {
    if (!audioRef.current) audioRef.current = optsRef.current.createAudio()
    return audioRef.current
  }, [])

  const load = useCallback(
    (attempt: Attempt, index: number) => {
      if (attemptRef.current !== attempt || attempt.index !== index - 1) return
      attempt.index = index
      if (index >= attempt.streams.length) {
        attemptRef.current = null
        setStatus('error')
        return
      }
      const el = audio()
      el.src = attempt.streams[index]
      el.play().catch(() => load(attempt, index + 1))
    },
    [audio],
  )

  useEffect(() => {
    const el = audio()
    const onPlaying = () => {
      if (attemptRef.current) setStatus('playing')
    }
    const onError = () => {
      const attempt = attemptRef.current
      if (attempt) load(attempt, attempt.index + 1)
    }
    el.addEventListener('playing', onPlaying)
    el.addEventListener('error', onError)
    return () => {
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('error', onError)
    }
  }, [audio, load])

  const play = useCallback(
    async (channelId: string) => {
      const attempt: Attempt = { streams: [], index: -1 }
      attemptRef.current = attempt
      setStatus('loading')
      try {
        attempt.streams = await optsRef.current.getStreams(channelId)
      } catch {
        if (attemptRef.current === attempt) {
          attemptRef.current = null
          setStatus('error')
        }
        return
      }
      load(attempt, 0)
    },
    [load],
  )

  const pause = useCallback(() => {
    attemptRef.current = null
    const el = audio()
    el.pause()
    // Dropping the source stops the live stream from downloading in the background.
    el.src = ''
    setStatus('idle')
  }, [audio])

  const setVolume = useCallback((v: number) => {
    audio().volume = v
  }, [audio])

  return { status, play, pause, setVolume }
}

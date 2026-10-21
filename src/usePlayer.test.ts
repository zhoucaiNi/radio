import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePlayer } from './usePlayer'

class FakeAudio extends EventTarget {
  src = ''
  volume = 1
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  fire(type: string) {
    this.dispatchEvent(new Event(type))
  }
}

const mirrors = (id: string) => [1, 2, 3].map((n) => `https://ice${n}.somafm.com/${id}-128-mp3`)

function setup(getStreams = (id: string) => Promise.resolve(mirrors(id))) {
  const audio = new FakeAudio()
  const hook = renderHook(() =>
    usePlayer({ createAudio: () => audio as unknown as HTMLAudioElement, getStreams }),
  )
  return { audio, hook }
}

describe('usePlayer', () => {
  it('plays the first mirror and reports playing on the playing event', async () => {
    const { audio, hook } = setup()
    act(() => void hook.result.current.play('lush'))
    expect(hook.result.current.status).toBe('loading')
    await waitFor(() => expect(audio.src).toBe(mirrors('lush')[0]))
    act(() => audio.fire('playing'))
    expect(hook.result.current.status).toBe('playing')
  })

  it('moves through the mirrors on error and ends in error after the last', async () => {
    const { audio, hook } = setup()
    await act(() => hook.result.current.play('lush'))
    act(() => audio.fire('error'))
    expect(audio.src).toBe(mirrors('lush')[1])
    act(() => audio.fire('error'))
    expect(audio.src).toBe(mirrors('lush')[2])
    expect(hook.result.current.status).toBe('loading')
    act(() => audio.fire('error'))
    expect(hook.result.current.status).toBe('error')
  })

  it('ends in error when play() rejects on every mirror', async () => {
    const { audio, hook } = setup()
    audio.play.mockImplementation(() => Promise.reject(new DOMException('nope', 'NotAllowedError')))
    await act(() => hook.result.current.play('lush'))
    await waitFor(() => expect(hook.result.current.status).toBe('error'))
    expect(audio.play).toHaveBeenCalledTimes(3)
  })

  it('advances once when play() rejects and an error event fires for the same mirror', async () => {
    // Browsers fire the error event first, then reject the pending play() promise.
    const { audio, hook } = setup()
    let reject!: (e: Error) => void
    audio.play.mockImplementationOnce(() => new Promise((_, r) => (reject = r)))
    await act(() => hook.result.current.play('lush'))
    await act(async () => {
      audio.fire('error')
      reject(new Error('source failed'))
    })
    expect(audio.src).toBe(mirrors('lush')[1])
    expect(audio.play).toHaveBeenCalledTimes(2)
    expect(hook.result.current.status).toBe('loading')
  })

  it('ignores a slow stream lookup for a station that was replaced', async () => {
    let releaseA!: () => void
    const getStreams = (id: string) =>
      id === 'a' ? new Promise<string[]>((r) => (releaseA = () => r(['https://a']))) : Promise.resolve(['https://b'])
    const { audio, hook } = setup(getStreams)
    act(() => void hook.result.current.play('a'))
    await act(() => hook.result.current.play('b'))
    expect(audio.src).toBe('https://b')
    await act(async () => releaseA())
    expect(audio.src).toBe('https://b')
  })

  it('ends in error when the stream lookup fails', async () => {
    const { hook } = setup(() => Promise.reject(new Error('offline')))
    await act(() => hook.result.current.play('lush'))
    expect(hook.result.current.status).toBe('error')
  })

  it('pause stops the audio, returns to idle and ignores later events', async () => {
    const { audio, hook } = setup()
    await act(() => hook.result.current.play('lush'))
    act(() => hook.result.current.pause())
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.src).toBe('')
    expect(hook.result.current.status).toBe('idle')
    act(() => audio.fire('error'))
    expect(hook.result.current.status).toBe('idle')
  })

  it('setVolume sets the audio volume', () => {
    const { audio, hook } = setup()
    act(() => hook.result.current.setVolume(0.3))
    expect(audio.volume).toBe(0.3)
  })
})

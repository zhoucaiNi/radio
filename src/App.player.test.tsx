// App wired to the real usePlayer (only Audio and the network are faked).
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LINEUP, type Channel } from './somafm'

const channels: Channel[] = LINEUP.map(({ id, short }) => ({
  id,
  short,
  title: `Title ${id}`,
  description: `About ${id}`,
  genre: 'ambient',
  listeners: 10,
}))

const somafm = vi.hoisted(() => ({
  fetchChannels: vi.fn(),
  fetchStreams: vi.fn(),
  fetchSongs: vi.fn(),
}))
vi.mock('./somafm', async (importOriginal) => ({ ...(await importOriginal<object>()), ...somafm }))

class FakeAudio extends EventTarget {
  static last: FakeAudio
  src = ''
  volume = 1
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  constructor() {
    super()
    FakeAudio.last = this
  }
}

const { default: App } = await import('./App')

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('Audio', FakeAudio)
  somafm.fetchChannels.mockReset().mockResolvedValue(channels)
  somafm.fetchStreams.mockReset().mockImplementation((id: string) => Promise.resolve([`https://ice2.somafm.com/${id}-128-mp3`]))
  somafm.fetchSongs.mockReset().mockResolvedValue([])
})
afterEach(() => vi.unstubAllGlobals())

it('the volume slider sets the audio volume and it stays set across re-renders', async () => {
  localStorage.setItem('radio:v1', JSON.stringify({ channelId: 'lush', volume: 0.5 }))
  render(<App />)
  await screen.findByRole('heading', { name: 'Title lush' })
  fireEvent.change(screen.getByLabelText('volume'), { target: { value: '20' } })
  fireEvent.click(screen.getByRole('button', { name: 'Bossa' }))
  expect(FakeAudio.last.volume).toBe(0.2)
  expect(JSON.parse(localStorage.getItem('radio:v1')!).volume).toBe(0.2)
})

it('starts the stream inside the click once stations are loaded (Safari needs the gesture)', async () => {
  render(<App />)
  await screen.findByRole('heading', { name: 'Title groovesalad' })
  await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: 'play' }))
  // No awaiting: play() must already have been called synchronously in the click.
  expect(FakeAudio.last.src).toBe('https://ice2.somafm.com/groovesalad-128-mp3')
  expect(FakeAudio.last.play).toHaveBeenCalledTimes(1)
})

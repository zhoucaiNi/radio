import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LINEUP, type Channel } from './somafm'
import type { PlayerStatus } from './usePlayer'

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
  fetchSongs: vi.fn(),
}))
vi.mock('./somafm', async (importOriginal) => ({ ...(await importOriginal<object>()), ...somafm }))

const player = vi.hoisted(() => ({
  status: 'idle' as PlayerStatus,
  prime: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  setVolume: vi.fn(),
}))
vi.mock('./usePlayer', () => ({ usePlayer: () => player }))

const { default: App } = await import('./App')

const pressed = () => screen.getByRole('button', { pressed: true }).textContent

beforeEach(() => {
  localStorage.clear()
  player.status = 'idle'
  player.play.mockReset()
  player.pause.mockReset()
  somafm.fetchChannels.mockReset().mockResolvedValue(channels)
  somafm.fetchSongs.mockReset().mockResolvedValue([])
})

describe('App', () => {
  it('starts on the stored station', async () => {
    localStorage.setItem('radio:v1', JSON.stringify({ channelId: 'bossa', volume: 0.5 }))
    render(<App />)
    await screen.findByRole('heading', { name: 'Title bossa' })
    expect(pressed()).toBe('Bossa')
    expect(screen.getByText('radio — Title bossa')).toBeInTheDocument()
  })

  it('ArrowRight selects the next station, wraps around, and is remembered', async () => {
    localStorage.setItem('radio:v1', JSON.stringify({ channelId: 'secretagent', volume: 0.5 }))
    render(<App />)
    await screen.findByRole('heading', { name: 'Title secretagent' })
    await userEvent.keyboard('{ArrowRight}')
    expect(pressed()).toBe('Groove')
    expect(JSON.parse(localStorage.getItem('radio:v1')!).channelId).toBe('groovesalad')
    await userEvent.keyboard('{ArrowLeft}')
    expect(pressed()).toBe('Agent')
  })

  it('Space on the page toggles playback once', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Title groovesalad' })
    await userEvent.keyboard(' ')
    expect(player.play).toHaveBeenCalledTimes(1)
    expect(player.play).toHaveBeenCalledWith('groovesalad')
  })

  it('Space on the focused play button toggles playback once', async () => {
    render(<App />)
    const btn = await screen.findByRole('button', { name: 'play' })
    btn.focus()
    await userEvent.keyboard(' ')
    expect(player.play).toHaveBeenCalledTimes(1)
  })

  it('Space on a focused station button selects it instead of toggling playback', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Title groovesalad' })
    screen.getByRole('button', { name: 'Bossa' }).focus()
    await userEvent.keyboard(' ')
    expect(pressed()).toBe('Bossa')
    expect(player.play).not.toHaveBeenCalled()
  })

  it('arrow keys still change station after a button was clicked', async () => {
    render(<App />)
    const btn = await screen.findByRole('button', { name: 'play' })
    btn.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(pressed()).toBe('Lush')
  })

  it('ignores station keys while the volume slider is focused', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Title groovesalad' })
    screen.getByLabelText('volume').focus()
    await userEvent.keyboard('{ArrowRight} ')
    expect(pressed()).toBe('Groove')
    expect(player.play).not.toHaveBeenCalled()
  })

  it('switching station while playing plays the new one; while paused it only selects', async () => {
    const { rerender } = render(<App />)
    await screen.findByRole('heading', { name: 'Title groovesalad' })
    await userEvent.click(screen.getByRole('button', { name: 'Lush' }))
    expect(player.play).not.toHaveBeenCalled()
    player.status = 'playing'
    rerender(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Bossa' }))
    expect(player.play).toHaveBeenCalledWith('bossa')
  })

  it('pauses when playing and the button is pressed', async () => {
    player.status = 'playing'
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'pause' }))
    expect(player.pause).toHaveBeenCalledTimes(1)
  })

  it('shows a retry when the channel list fails to load', async () => {
    somafm.fetchChannels.mockRejectedValueOnce(new Error('offline'))
    render(<App />)
    expect(await screen.findByText("Can't reach the radio right now")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'try again' }))
    await screen.findByRole('heading', { name: 'Title groovesalad' })
    expect(somafm.fetchChannels).toHaveBeenCalledTimes(2)
  })

  it('tells the listener when a station is quiet', async () => {
    player.status = 'error'
    render(<App />)
    expect(await screen.findByText("This station's quiet — try another")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'play' })).toBeInTheDocument()
  })

  it('credits SomaFM in the footer', async () => {
    render(<App />)
    expect(await screen.findByRole('link', { name: 'donate' })).toHaveAttribute('href', 'https://somafm.com/support/')
  })
})

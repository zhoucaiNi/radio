import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const setCookie = (on: boolean, extra: object = {}) => {
  document.cookie = `radio=${encodeURIComponent(JSON.stringify({ on, ...extra }))}; Path=/`
}
const clearCookies = () => {
  document.cookie = 'radio=; Path=/; Max-Age=0'
  document.cookie = 'radio-world=; Path=/; Max-Age=0'
}

beforeEach(() => {
  localStorage.clear()
  clearCookies()
  player.status = 'idle'
  player.play.mockReset().mockImplementation(() => void (player.status = 'loading'))
  player.pause.mockReset().mockImplementation(() => void (player.status = 'idle'))
  somafm.fetchChannels.mockReset().mockResolvedValue(channels)
  somafm.fetchSongs.mockReset().mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  clearCookies()
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

  it('pauses when playing and the button is pressed, and tells the world', async () => {
    setCookie(true)
    player.status = 'playing'
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'pause' }))
    expect(player.pause).toHaveBeenCalledTimes(1)
    expect(document.cookie).not.toContain(encodeURIComponent('"on":true'))
  })

  it('the cookie beats localStorage for station and volume', async () => {
    localStorage.setItem('radio:v1', JSON.stringify({ channelId: 'bossa', volume: 0.5 }))
    setCookie(false, { channelId: 'lush', volume: 0.2 })
    render(<App />)
    await screen.findByRole('heading', { name: 'Title lush' })
    expect(player.setVolume).toHaveBeenCalledWith(0.2)
  })

  it('the first write keeps on:true and fills in the station and volume', async () => {
    setCookie(true)
    player.status = 'playing'
    render(<App />)
    await screen.findByRole('heading', { name: 'Title groovesalad' })
    const written = decodeURIComponent(document.cookie.split('; ').find((c) => c.startsWith('radio='))!.slice(6))
    expect(JSON.parse(written)).toEqual({ channelId: 'groovesalad', volume: 0.7, on: true })
  })

  it('stays quiet and says so while a world tab is playing; pause still writes on=false', async () => {
    setCookie(true)
    document.cookie = 'radio-world=tab1; Path=/'
    render(<App />)
    expect(await screen.findByText('playing in the world')).toBeInTheDocument()
    expect(player.play).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'pause' }))
    expect(decodeURIComponent(document.cookie)).not.toContain('"on":true')
  })

  it('takes over when the world heartbeat goes away, and steps aside when it returns', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setCookie(true)
    document.cookie = 'radio-world=tab1; Path=/'
    render(<App />)
    await screen.findByText('playing in the world')
    document.cookie = 'radio-world=; Path=/; Max-Age=0'
    await act(() => vi.advanceTimersByTimeAsync(1100))
    expect(player.play).toHaveBeenCalledWith('groovesalad')
    expect(screen.queryByText('playing in the world')).toBeNull()
    document.cookie = 'radio-world=tab2; Path=/'
    await act(() => vi.advanceTimersByTimeAsync(1100))
    expect(player.pause).toHaveBeenCalled()
  })

  it('pauses when the cookie is polled to on=false', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setCookie(true)
    player.status = 'playing'
    render(<App />)
    await screen.findByRole('button', { name: 'pause' })
    setCookie(false)
    await act(() => vi.advanceTimersByTimeAsync(1100))
    expect(player.pause).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'play' })).toBeInTheDocument()
  })

  it('shows a tap-to-play hint when autoplay is blocked, with the play button showing', async () => {
    setCookie(true)
    player.status = 'blocked'
    render(<App />)
    expect(await screen.findByText('tap play to listen here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'play' })).toBeInTheDocument()
    expect(player.pause).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'play' }))
    expect(player.play).toHaveBeenCalledWith('groovesalad')
  })

  it('saves volume to localStorage and the cookie', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Title groovesalad' })
    fireEvent.change(screen.getByLabelText('volume'), { target: { value: '20' } })
    expect(JSON.parse(localStorage.getItem('radio:v1')!).volume).toBe(0.2)
    expect(decodeURIComponent(document.cookie)).toContain('"volume":0.2')
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
    setCookie(true)
    player.status = 'error'
    render(<App />)
    expect(await screen.findByText("This station's quiet — try another")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'pause' })).toBeInTheDocument()
  })

  it('credits SomaFM in the footer', async () => {
    render(<App />)
    expect(await screen.findByRole('link', { name: 'donate' })).toHaveAttribute('href', 'https://somafm.com/support/')
  })
})

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LINEUP, type Channel, type Track } from '../somafm'
import Controls from './Controls'
import Dial from './Dial'
import RecentlyPlayed from './RecentlyPlayed'

const channels: Channel[] = LINEUP.map(({ id, short }) => ({
  id,
  short,
  title: `Title ${id}`,
  description: `About ${id}`,
  genre: 'ambient',
  listeners: 100,
}))

describe('Dial', () => {
  it('renders a button per station, marks the selected one, and reports clicks', async () => {
    const onSelect = vi.fn()
    render(<Dial channels={channels} selectedId="lush" track={null} onSelect={onSelect} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Groove', 'Lush', 'Bossa', 'Drone', 'Fluid', 'Space', 'Folk', 'Agent'])
    expect(screen.getByRole('button', { name: 'Lush' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Groove' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Bossa' }))
    expect(onSelect).toHaveBeenCalledWith('bossa')
  })

  it('shows the selected station title and the current track', () => {
    render(
      <Dial channels={channels} selectedId="lush" track={{ artist: 'Dido', title: 'Here With Me' }} onSelect={() => {}} />,
    )
    expect(screen.getByRole('heading', { name: 'Title lush' })).toBeInTheDocument()
    expect(screen.getByText('Dido — Here With Me')).toBeInTheDocument()
  })
})

describe('Controls', () => {
  const noop = () => {}
  const props = { volume: 0.7, angle: 0, onPrev: noop, onNext: noop, onToggle: noop, onVolume: noop }

  it('shows play when paused and pause when playing', () => {
    const { rerender } = render(<Controls {...props} playing={false} />)
    expect(screen.getByRole('button', { name: 'play' })).toBeInTheDocument()
    rerender(<Controls {...props} playing />)
    expect(screen.getByRole('button', { name: 'pause' })).toBeInTheDocument()
  })

  it('labels the volume slider and the station buttons', () => {
    render(<Controls {...props} playing={false} />)
    expect(screen.getByLabelText('volume')).toHaveValue('70')
    expect(screen.getByRole('button', { name: 'Previous station' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next station' })).toBeInTheDocument()
  })

  it('reports volume as 0..1', () => {
    const onVolume = vi.fn()
    render(<Controls {...props} playing={false} onVolume={onVolume} />)
    const slider = screen.getByLabelText('volume')
    act(() => {
      slider.focus()
    })
    // fireEvent-style change: range inputs can't be typed into
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(slider, '30')
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onVolume).toHaveBeenLastCalledWith(0.3)
  })
})

describe('RecentlyPlayed', () => {
  afterEach(() => vi.useRealTimers())

  const songs = (id: string): Track[] => [0, 1, 2, 3].map((n) => ({ artist: `${id} artist ${n}`, title: `song ${n}` }))

  it('fetches on mount and every 30s while active, showing songs 1..3', async () => {
    vi.useFakeTimers()
    const fetchSongs = vi.fn((id: string) => Promise.resolve(songs(id)))
    const onCurrent = vi.fn()
    render(<RecentlyPlayed channelId="lush" active fetchSongs={fetchSongs} onCurrent={onCurrent} />)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(fetchSongs).toHaveBeenCalledTimes(1)
    expect(fetchSongs.mock.calls[0][0]).toBe('lush')
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'lush artist 1 — song 1',
      'lush artist 2 — song 2',
      'lush artist 3 — song 3',
    ])
    expect(onCurrent).toHaveBeenLastCalledWith({ artist: 'lush artist 0', title: 'song 0' })
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(fetchSongs).toHaveBeenCalledTimes(2)
  })

  it('does not poll while inactive', async () => {
    vi.useFakeTimers()
    const fetchSongs = vi.fn((id: string) => Promise.resolve(songs(id)))
    render(<RecentlyPlayed channelId="lush" active={false} fetchSongs={fetchSongs} />)
    await act(() => vi.advanceTimersByTimeAsync(90_000))
    expect(fetchSongs).toHaveBeenCalledTimes(1)
  })

  it('never shows a late response for a previous station', async () => {
    let releaseLush!: () => void
    const fetchSongs = vi.fn((id: string) =>
      id === 'lush'
        ? new Promise<Track[]>((r) => (releaseLush = () => r(songs('lush'))))
        : Promise.resolve(songs('bossa')),
    )
    const onCurrent = vi.fn()
    const { rerender } = render(<RecentlyPlayed channelId="lush" active fetchSongs={fetchSongs} onCurrent={onCurrent} />)
    rerender(<RecentlyPlayed channelId="bossa" active fetchSongs={fetchSongs} onCurrent={onCurrent} />)
    await waitFor(() => expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('bossa artist 1 — song 1'))
    await act(async () => releaseLush())
    expect(screen.queryByText(/lush artist/)).toBeNull()
    expect(onCurrent).not.toHaveBeenCalledWith({ artist: 'lush artist 0', title: 'song 0' })
  })

  it('renders nothing when the fetch fails', async () => {
    const fetchSongs = vi.fn(() => Promise.reject(new Error('offline')))
    const { container } = render(<RecentlyPlayed channelId="lush" active fetchSongs={fetchSongs} />)
    await act(async () => {})
    expect(container).toBeEmptyDOMElement()
  })
})

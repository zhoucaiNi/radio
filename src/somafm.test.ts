import { describe, expect, it } from 'vitest'
import { LINEUP, parsePls, parseSongs, toChannels } from './somafm'

const GROOVE_PLS = `[playlist]
numberofentries=3
File1=https://ice2.somafm.com/groovesalad-128-mp3
Title1=SomaFM: Groove Salad (#1): A nicely chilled plate of ambient/downtempo beats and grooves.
Length1=-1
File2=https://ice6.somafm.com/groovesalad-128-mp3
Title2=SomaFM: Groove Salad (#2): A nicely chilled plate of ambient/downtempo beats and grooves.
Length2=-1
File3=https://ice5.somafm.com/groovesalad-128-mp3
Title3=SomaFM: Groove Salad (#3): A nicely chilled plate of ambient/downtempo beats and grooves.
Length3=-1
Version=2
`

describe('parsePls', () => {
  it('returns the File URLs in order', () => {
    expect(parsePls(GROOVE_PLS)).toEqual([
      'https://ice2.somafm.com/groovesalad-128-mp3',
      'https://ice6.somafm.com/groovesalad-128-mp3',
      'https://ice5.somafm.com/groovesalad-128-mp3',
    ])
  })

  it('sorts entries by their number', () => {
    expect(parsePls('File2=https://b\r\nFile1=https://a\r\n')).toEqual(['https://a', 'https://b'])
  })

  it('returns [] when there are no File lines', () => {
    expect(parsePls('[playlist]\nVersion=2')).toEqual([])
  })
})

function raw(id: string, listeners = '10') {
  return { id, title: `T-${id}`, description: `D-${id}`, genre: 'ambient', listeners }
}

describe('toChannels', () => {
  it('keeps lineup order and drops ids outside the lineup', () => {
    const ids = LINEUP.map((c) => c.id)
    const shuffled = [...ids].reverse().map((id) => raw(id))
    const channels = toChannels({ channels: [raw('christmas'), ...shuffled] })
    expect(channels.map((c) => c.id)).toEqual(ids)
  })

  it('skips lineup ids missing from the feed', () => {
    const channels = toChannels({ channels: [raw('lush'), raw('groovesalad')] })
    expect(channels.map((c) => c.id)).toEqual(['groovesalad', 'lush'])
  })

  it('maps fields, numeric listeners and the short label', () => {
    const [c] = toChannels({ channels: [raw('deepspaceone', '421')] })
    expect(c).toEqual({
      id: 'deepspaceone',
      short: 'Space',
      title: 'T-deepspaceone',
      description: 'D-deepspaceone',
      genre: 'ambient',
      listeners: 421,
    })
  })

  it('returns [] for malformed input', () => {
    expect(toChannels(null)).toEqual([])
    expect(toChannels({ channels: 'x' })).toEqual([])
  })
})

describe('parseSongs', () => {
  it('maps songs to tracks', () => {
    expect(parseSongs({ songs: [{ artist: 'The Album Leaf', title: 'New Soul', album: 'x' }] })).toEqual([
      { artist: 'The Album Leaf', title: 'New Soul' },
    ])
  })

  it('returns [] for empty or malformed input', () => {
    expect(parseSongs({})).toEqual([])
    expect(parseSongs(null)).toEqual([])
    expect(parseSongs({ songs: 'x' })).toEqual([])
  })
})

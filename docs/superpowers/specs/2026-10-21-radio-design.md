# radio.zhoucai.me: design

## Goal

A small, cozy web radio at `radio.zhoucai.me`, separate from the static landing site
(zhoucai.me), where zhoucai can build interactive React work. The first (and only) page
streams a hand-picked set of calm SomaFM channels.

Success: open the URL on desktop or phone, pick a channel, hear music within a few
seconds, see what's playing, and come back later to the same channel and volume.

## Hosting

- Repo: `zhoucaiNi/radio` (public), local at `~/Vault/3-Projects/Web/radio`.
- Vite + React + TypeScript, built and deployed by a GitHub Actions workflow
  (`actions/deploy-pages`) on every push to `main`. No backend.
- `public/CNAME` contains `radio.zhoucai.me`; Vite `base` stays `/`.
- DNS (manual, Namecheap → zhoucai.me → Advanced DNS): `CNAME  radio  zhoucaini.github.io.`
  Then enable "Enforce HTTPS" in the repo's Pages settings once the cert is issued.
- Landing site: one "Radio" link in the nav, on its own branch off `landing`, separate PR.

## Data source: SomaFM

Free, no key, CORS `*` on all endpoints used (verified 2026-10-21):

| Need | Endpoint |
|---|---|
| Channel info (title, description, art, listeners) | `https://somafm.com/channels.json` |
| Stream mirrors | `https://api.somafm.com/<id>.pls` (mp3 128k; `File1..3=` lines, all `https://iceN.somafm.com/<id>-128-mp3`) |
| Now playing | `https://somafm.com/songs/<id>.json` (`songs[0]` = current: title, artist, album) |

The channel lineup is a fixed list in code (order matters for the tuner):
`groovesalad, lush, bossa, dronezone, fluid, deepspaceone, folkfwd, secretagent`.
`channels.json` fills in the title, description and image; a lineup id missing from it is
dropped. If `channels.json` fails entirely, show the error state (below).

Attribution: footer "Music by SomaFM — listener-supported" linking to `https://somafm.com/support/`.

## Page

One screen, centered, works from 320px wide up.

- Header: "radio" in Jockey One, small link back to zhoucai.me.
- Tuner: the 8 channels as a horizontal row of cards (art + title); the selected one is
  highlighted. Scrolls horizontally on narrow screens. Prev/next buttons beside it.
- Player: big play/pause button, volume slider, the selected channel's description.
- Now playing: "Artist — Title" for the current track, refreshed every 30s while playing.
  Hidden if the request fails or returns nothing.
- Footer: SomaFM attribution + donate link.

Look: zhoucai.me tokens (sky/sun/peach/dusk palette, Figtree body, Jockey One display),
night palette under `prefers-color-scheme: dark`, motion off under
`prefers-reduced-motion`. One accent color.

Keyboard: Space toggles play, ←/→ change channel (ignored while focus is in an input).

Persistence: `localStorage` key `radio:v1` = `{ channelId, volume }`, read/write wrapped in
try/catch; defaults are `groovesalad` and `0.7`. Playback never autostarts (browsers block it).

## Units

| File | Job |
|---|---|
| `src/somafm.ts` | `LINEUP`, `fetchChannels()`, `fetchStreams(id)` (parse .pls → URL list), `fetchNowPlaying(id)`. Pure parsing helpers exported for tests. |
| `src/usePlayer.ts` | Owns one `HTMLAudioElement`: `play(streams)`, `pause()`, `setVolume()`, status `idle / loading / playing / error`. On `error` event, moves to the next mirror; after the last one, status `error`. |
| `src/useStoredState.ts` | Read/write `radio:v1` safely. |
| `src/components/Tuner.tsx` | Channel row + prev/next. Props: channels, selectedId, onSelect. |
| `src/components/Player.tsx` | Play/pause, volume, description. |
| `src/components/NowPlaying.tsx` | Polls now-playing for the selected channel while playing. |
| `src/App.tsx` | Loads channels, wires state, keyboard shortcuts, layout. |
| `src/styles.css` | Tokens + layout. |

Changing channel while playing: stop, fetch new streams, play. While paused: just select.

## Errors

- `channels.json` fails: message "Can't reach the radio right now" + retry button.
- All mirrors fail: "This station's quiet — try another", player returns to paused.
- Now-playing fails: line hidden, polling continues.

## Testing

- Vitest unit tests: `.pls` parsing, channels JSON → lineup mapping (order, missing ids),
  now-playing parsing (empty/malformed), mirror fallback order in `usePlayer`
  (fake audio element), stored-state defaults and corrupted JSON.
- `npm run build` and `npm test` pass in CI before deploy.
- Manual: run `npm run dev`, play each channel, check now-playing, keyboard, phone width,
  dark mode; after deploy, same on `radio.zhoucai.me`.

## Out of scope

Radio Browser / search, favorites, visualizer, sleep timer, multiple pages or routing.

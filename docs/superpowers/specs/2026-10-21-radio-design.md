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

Design: direction **D, "Radio in a window"**, chosen from the mockups at
https://claude.ai/artifact/TJ1C3MicVzK2HJeWm3GVMG (artboards "D · Radio in a window" and its
phone version). One screen, works from 320px wide up.

- Backdrop: the zhoucai.me day scene, a white sky with the sun top-right and three layered hills
  (`hill-light`, `moss`, `hill-deep`) along the bottom, drawn as inline SVG.
- Header: "radio" in Jockey One, link back to zhoucai.me.
- A Mac window (white title bar, three pastel dots, centered title "radio — <station>",
  `radius-lg`, `shadow-card-lift`), up to 960px wide, cream body `#fff3e6`. Inside it, a radio:
  - Speaker grille: decorative peach panel with dots (left column on desktop, a short band
    on top on phones).
  - Dial: dark panel `#0f1a2b` with the station name (Jockey One, `sun`), listener count,
    the station description, and a tick scale with the 8 stations as short labels
    (Groove, Lush, Bossa, Drone, Fluid, Space, Folk, Agent). A glowing peach needle slides to
    the selected station. Each label is a button. On phones the scale scrolls sideways and shows
    the track instead of the description.
  - Controls: prev / next buttons either side of a decorative tuning knob whose pointer rotates
    with the station (-120° to +120°), a `sun` "play"/"pause" button, a volume slider.
  - Recently played: the last 3 tracks (2 on phones) from the songs endpoint (`songs[1..3]`),
    under the controls; the current track is `songs[0]`, shown in the dial on phones and as
    the first row on desktop. Hidden if the request fails.
- Footer: "Music by SomaFM, listener-supported · donate".

Look: zhoucai.me tokens (Figtree body, Jockey One display, `sun` buttons, `peach-ink` slider).
Night (`prefers-color-scheme: dark`; not mocked): page `#0f1a2b` with stars, hills under the
site's night filter (brightness 0.5, saturate 1.3), window body `#1c1c1e`, grille and dial
unchanged. The needle and knob animate (200ms) and are instant under `prefers-reduced-motion`.

Keyboard: Space toggles play, ←/→ change channel (ignored while focus is in an input).

Persistence: `localStorage` key `radio:v1` = `{ channelId, volume }`, read/write wrapped in
try/catch; defaults are `groovesalad` and `0.7`. Playback never autostarts (browsers block it).

## Units

| File | Job |
|---|---|
| `src/somafm.ts` | `LINEUP`, `fetchChannels()`, `fetchStreams(id)` (parse .pls → URL list), `fetchNowPlaying(id)`. Pure parsing helpers exported for tests. |
| `src/usePlayer.ts` | Owns one `HTMLAudioElement`: `play(streams)`, `pause()`, `setVolume()`, status `idle / loading / playing / error`. On `error` event, moves to the next mirror; after the last one, status `error`. |
| `src/useStoredState.ts` | Read/write `radio:v1` safely. |
| `src/components/Scene.tsx` | Backdrop SVG (sun, hills; stars at night). Decorative. |
| `src/components/RadioWindow.tsx` | Window chrome: title bar + dots + title. Children = the radio. |
| `src/components/Dial.tsx` | Station name, listeners, text line, tick scale, needle, station buttons. Props: channels, selectedId, onSelect. |
| `src/components/Controls.tsx` | Prev/next, knob, play/pause, volume. |
| `src/components/RecentlyPlayed.tsx` | Polls `songs/<id>.json` every 30s while playing; shows recent tracks. |
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

# Architecture

Deep technical notes for the CustomSnake template. For usage, see the top-level
[README](../README.md).

## The single-file build

`build.mjs` (Node's `fs` only, zero deps) turns the split sources under `src/`
into one `index.html`:

1. **Markup** - `src/index.template.html` is the page shell. `<!--INCLUDE:html/x.html-->`
   markers are replaced with the matching `src/html/*.html` partial.
2. **Styles** - every file in the `CSS_FILES` array is concatenated (cascade order
   is explicit, not filename-sorted) into one `<style>` at the `/*BUILD:STYLES*/`
   marker.
3. **Scripts** - every file in `JS_FILES` is concatenated (dependency order) into
   one `<script>` at `/*BUILD:SCRIPT*/`. `_open.js` opens a single IIFE first and
   `_boot.js` closes it last, so all modules share one closure - no globals leak.
4. **Assets** - every image in `assets/` is base64-encoded and inlined as a
   `data:` URI, rewriting the runtime references: `./assets/x.png` in JS and
   `url("assets/x.png")` in CSS. The absolute `og:image` URL is deliberately left
   alone (social crawlers need a real URL).

The output loads **nothing** at runtime, so it works from `file://`, offline, or
any static host as a lone file. Re-run the build after changing any image.

## Runtime module map (load order)

| File | Responsibility |
|---|---|
| `_open.js` | Opens the shared IIFE, `"use strict"`. |
| `constants.js` | Grid/speed/color constants; cached DOM element handles. |
| `strings.js` | `STRINGS` i18n table + `I18n` class + `S()` accessor. |
| `assets.js` | `AssetStore` - preloads sprites with a colored-circle fallback per key. |
| `chasers.js` | `ChaserField` - the Pac-Man-style monster field + cadence. |
| `layout.js` | Responsive board sizing (`resizeCanvas`, `measureReservePx`). |
| `core.js` | Game state machine, level flow, win/endless mode, input queue, `step()`. |
| `overlays.js` | Menu / dead / won / game-won / paused / level-banner screens. |
| `animations/*.js` | Ghost idle motion, opening intro scene, get-ready countdown. |
| `render.js` | Canvas drawing + the fixed-timestep `requestAnimationFrame` loop. |
| `_boot.js` | Keyboard/touch/UI handlers, boot sequence, closes the IIFE. |

## Game state machine

`loading -> opening -> menu -> levelbanner -> countdown -> playing -> paused / dead / won / gamewon`

- `render.js`'s `frame(ts)` only calls `step()` while `state === "playing"`.
- Movement is a **fixed-timestep accumulator**: real elapsed time is banked and
  consumed in whole `stepMs` chunks, so speed is frame-rate independent. No
  `setInterval`, no `Date.now()` for animation (the rAF timestamp is the only clock).
- Eating advances `popcornCount`; every `POPCORN_PER_LEVEL` triggers a level up,
  and clearing the last level shows the win screen with a Keep-Playing endless mode.

## Assets & fallback

`assets.js` `ASSET_LIST` maps a key (`head1`, `ghost2`, ...) to `./assets/<file>.png`
plus a fallback color. Each image gets a hard load deadline; on error/absence/stall
it draws a solid colored circle instead, so a missing sprite never blanks or hangs
the game. After inlining, `src` values are `data:` URIs, but the code path is
identical (an `<img>` loads a `data:` URI exactly like a file).

## Internationalization

All visible text goes through `S()` (the active `STRINGS[lang]`). `applyLanguage()`
re-renders whatever overlay is on screen - no reload. **The template ships
English-only with the toggle hidden** (`#langToggle { display: none }` in
`src/css/lang-toggle.css`); the Hebrew block is an example. Add a locale by copying
the `en` block in `STRINGS`, translating it, and deleting the hide rule.

## Content-Security-Policy

```
default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none';
```

No external origins are allowed. `img-src data:` is what makes the inlined-asset
single file work. Keep new features inside this policy (no CDNs, no remote fonts).

## Responsiveness & accessibility

- The board is sized from the viewport via `resizeCanvas()` (a bounded
  measure/relayout loop), coalesced through `requestAnimationFrame` and re-run on
  `resize` / `orientationchange` / `visualViewport` changes and DPR changes.
- Touch uses swipe recognized mid-drag (on `touchmove`, not lift) for low latency;
  desktop uses arrow keys. A one-time on-screen how-to-play demo is shown.
- Every looping animation is gated behind `prefers-reduced-motion: reduce` with a
  static equivalent.

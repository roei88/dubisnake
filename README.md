# dubisnake

A Nokia-style Snake game where the head is a profile photo instead of a plain
block, the food is a piece of popcorn, and the head photo swaps to the next
one every time you level up (looping 1 -> 2 -> 3 -> 1 ...). Cartoon
monster chasers pursue the snake's head at half its speed - one from level
1, a second from level 2, a third from level 3 on - and running into one
ends the run, as do walls and self collisions. Each level opens with a
retro "LEVEL n" banner showing the monsters now in play, and waits for OK
before the snake starts moving. Speed ramps up each level, and your
best score is remembered on the device you play on.

**Play it live:** https://roei88.github.io/dubisnake/

## Controls

- **Desktop:** Arrow keys to steer, Space to pause or dismiss a level
  banner, Enter to start/restart. The menu shows an animated arrow-key
  cluster; touch devices get a swipe demo instead (chosen by pointer
  type, so it follows a mouse being docked or undocked).
- **Mobile:** swipe on the board (recognised mid-drag, no need to lift);
  tap to start/restart.

## Assets

The `assets/` folder holds the five sprites the game draws from: the three
cycling profile heads (`head-1.png`, `head-2.png`, `head-3.png`), the popcorn
food (`food.png`), and the splash graphic used on the game-over/win screen
(`splash.png`). It also holds `banner.png` (1200x630), the cartoon
Open Graph card shown when the game link is shared in DMs and social
platforms - generated from the game's own head/popcorn art. Leveling up shows a short, non-blocking "level details" pop
of its own (the enlarged head photo for the level being entered, plus a
one-line blurb) instead of the splash graphic. If an image fails to load, the
game falls back to a plain colored circle so it keeps working.

All in-game UI text is localized to Hebrew/RTL, and the play grid is 9x9 cells
(down from 19x19, then 13x13) for bigger, more readable cells; gameplay
control semantics (arrow keys, swipe) are unchanged. A small circular
avatar showing the current head photo sits in the top-left corner of the HUD
at all times (menu, playing, paused, game over) alongside the score/level/
high-score readout.

## Project structure

The game ships as a single self-contained `index.html` (vanilla JS + canvas,
no external libraries), so the built file still works by opening it directly
from disk. That file is **generated** - do not edit it by hand. The source
lives split by concern under `src/`:

```
src/
  index.template.html   page shell: <!--INCLUDE:html/...--> partials plus
                        /*BUILD:STYLES*/ and /*BUILD:SCRIPT*/ markers
  html/                 markup partials spliced in at their INCLUDE marker
    hud.html              score header
    board.html            board, canvas, level banner, overlay
    mobile-help.html      first-visit swipe popup
  css/                  CSS, concatenated in cascade order (see build.mjs):
    base / frame / hud / board / overlay / tutorial / buttons /
    level-banner / footer / lang-toggle / mobile-help .css
  js/                   the game, concatenated in load order (see build.mjs):
    _open.js              IIFE open
    constants.js          grid/speed/colour constants, DOM refs
    strings.js            i18n strings (he/en)
    assets.js             AssetStore class, head cycle / level tint
    layout.js             responsive board sizing
    core.js               game state, level flow, chasers, input, step()
    overlays.js           menu/dead/won/paused/banner/countdown + opening intro
    animations/           one file per animation:
      ghost-idle.js         ghost float/rotate/pulse/glow
      opener.js             opening intro scene + PRESS ANY KEY
      countdown.js          get-ready countdown number
    render.js             canvas rendering + fixed-timestep loop
    _boot.js              keyboard/touch/UI handlers, boot, IIFE close
build.mjs                zero-dependency build (Node, no npm packages)
```

### Building

```
node build.mjs
```

This inlines `src/styles.css` and concatenates the `src/js/*.js` files (in the
order declared in `build.mjs`) into `index.html`. There are no dependencies to
install and no CDNs; the output keeps the same locked-down Content-Security-
Policy and runs offline from `file://`. Edit files under `src/`, run the build,
then commit both the sources and the regenerated `index.html`.

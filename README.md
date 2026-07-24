<div align="center">

# 🐍 dubisnake 🍿

### *A customized retro snake game*

&nbsp;

## 👇 &nbsp;&nbsp; 👇 &nbsp;&nbsp; 👇

# [ ▶️ &nbsp; P L A Y &nbsp; H E R E &nbsp; ◀️ ](https://roei88.github.io/dubisnake/)

### `roei88.github.io/dubisnake`

## 👆 &nbsp;&nbsp; 👆 &nbsp;&nbsp; 👆

&nbsp;

<p align="center">
  <img src="docs/screenshots/opener.png" width="46%" alt="dubisnake title screen: the hero's face and popcorn scattered across the board, with PRESS ANY KEY glowing at the bottom">
  &nbsp;&nbsp;
  <img src="docs/screenshots/level2-midgame.png" width="46%" alt="Level 2 in progress: the snake winding across the board with popcorn to eat and two monsters closing in">
</p>

</div>

---

## 📖 The Legend

Long ago, in the flickering green glow of an old brick phone, a hero was
swallowed whole by the screen. He woke up long, scaly, and very, very hungry.

That hero is **dubisnake** - named after **Oren Dubinsky**, the real person
whose face you see on the snake's head. (It is genuinely his photo, and it
changes with every level, because a legend deserves a wardrobe.)

There is only one way out: eat every last piece of **popcorn** on the board and
survive all three levels. Standing in the way are three creatures who would very
much like the snake to stop moving - permanently.

## 👹 The Cast

| # | Monster | Shows up | Their whole deal |
|---|---|---|---|
| 1 | **TheLabbovichi** | Level 1 onward | The original stalker. Always on the board, always right behind you. |
| 2 | **GrosZBaker** | Level 2 onward | A baker who set out to "bake a cake," fumbled the recipe *and* the spelling, and has been cross about it ever since. |
| 3 | **Enshula** | Level 3 only | The final terror. You only meet Enshula once you have earned it - and you will wish you hadn't. |

The monsters chase Pac-Man style: they close in, they cut you off, but they
never quite land on your head - you lose only by walking straight into one (or a
wall, or your own tail). More of them join the hunt at every level.

## 🎮 How to Play

The goal is simple: **eat the popcorn, dodge everything else.** Every 5 pieces
you clear the level. Clear all three and you win the crown 👑.

<table>
<tr>
<th>📱 On mobile</th>
<th>💻 On desktop</th>
</tr>
<tr>
<td valign="top">

- **Swipe** in any direction to steer
- Turn mid-move - keep your finger down and swipe again
- **Tap the board** to start or restart
- A one-time hint pops up the first time you play

</td>
<td valign="top">

- **Arrow keys** to steer
- **Enter** to start or restart
- **Space** to pause and resume
- The board stays centered and crisp at any window size

</td>
</tr>
</table>

## ✨ What Makes It Fun

- **Three handmade levels**, then a cartoony **GAME WON** celebration - complete
  with a crown, confetti, and a choice: reset to level 1, or **Keep Playing** in
  endless mode (crown in the header, an easier pace, and a snake that just keeps
  growing).
- **The hero's face changes every level** - a fresh look for each stage.
- **Popcorn, not apples.** This is a snack-forward snake.
- **Two languages:** full English and Hebrew (right-to-left), switchable any time
  with one button - mid-game included.
- **Your best score is saved** locally on your device.
- **Runs anywhere.** No installs, no accounts, no tracking, works offline.

<div align="center">

&nbsp;

### 👇 &nbsp; Ready? &nbsp; 👇

# [ ▶️ &nbsp; P L A Y &nbsp; H E R E &nbsp; ◀️ ](https://roei88.github.io/dubisnake/)

&nbsp;

*Made with popcorn. 🍿*

</div>

---

## 🛠️ For Developers

dubisnake ships as **one self-contained `index.html`** - vanilla JavaScript and
an HTML5 canvas, **zero dependencies**, no CDNs. A locked Content-Security-Policy
means the same file runs on GitHub Pages or straight from `file://`, offline.

The single file is **generated** - do not edit `index.html` by hand. The source
lives split by concern under `src/`, assembled by a tiny zero-dependency Node
script:

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
    strings.js            i18n strings (he/en) + I18n class
    assets.js             AssetStore class, head cycle / level tint
    chasers.js            ChaserField class (Pac-Man-style monster field)
    layout.js             responsive board sizing
    core.js               game state, level flow, win/endless mode, input, step()
    overlays.js           menu / dead / won / GAME WON / paused / banner
    animations/           one file per animation:
      ghost-idle.js         ghost float/rotate/pulse/glow
      opener.js             opening intro scene + PRESS ANY KEY
      countdown.js          get-ready countdown number
    render.js             canvas rendering + fixed-timestep loop
    _boot.js              keyboard/touch/UI handlers, boot, IIFE close
build.mjs                zero-dependency build (Node, no npm packages)
assets/                  the sprites the game draws from (heads, popcorn, splash)
```

### Building

```
node build.mjs
```

This inlines every `src/css/*.css` and `src/js/*.js` file (in the order declared
in `build.mjs`) into `index.html`. There is nothing to install. Edit files under
`src/`, run the build, then commit both the sources and the regenerated
`index.html`.

# CustomSnake

A customizable **retro snake game template**: a profile-photo snake head, food
to chase, and Pac-Man-style monster chasers across three levels - shipped as
**one self-contained `index.html`** with **zero dependencies**. Bring your own
images, run one build, and host the single file anywhere.

The images that ship with the template are neutral **single-color placeholders**
so you can see exactly which slots to fill.

## Quick start

```
# 1. get the template (via GitHub Packages)
echo "@roei88:registry=https://npm.pkg.github.com" >> .npmrc
npm install @roei88/customsnake

# ...or just copy this folder.

# 2. drop your own images into assets/ (see below)

# 3. build the single-file game
npm run build      # or: node build.mjs

# 4. open or host index.html - it runs from file:// or any static host
```

## Customize the images

Replace these files in `assets/` with your own **square PNGs** (512x512 works
well). Nothing else needs to change - `node build.mjs` re-inlines everything.

| File | What it is |
|---|---|
| `head-1.png`, `head-2.png`, `head-3.png` | The snake's head, one per level (it cycles). Drawn clipped to a circle. |
| `ghost-1.png`, `ghost-2.png`, `ghost-3.png` | The three monster chasers (added one per level). |
| `food.png` | The food the snake eats (popcorn by default). |
| `splash.png` | The graphic on the game-over / win screen. |
| `banner.png` | The 1200x630 social link-preview card. |

To rebrand the wordmark and card text, edit `src/js/strings.js` (the `brandTitle`
and localized strings) and `src/index.template.html` (`<title>` and the
`og:`/`twitter:` meta tags - set your own site URL there too).

## How it's built

Edit the readable split sources under `src/`, then run the build - it inlines
every `src/css/*.css` and `src/js/*.js` (in the order declared in `build.mjs`)
plus the `src/html/*.html` partials into a single `index.html`. There is nothing
to install and no CDNs; a locked Content-Security-Policy keeps the output
running from `file://` or any static host, offline.

```
src/
  index.template.html   page shell + meta tags
  html/                 markup partials (hud, board, mobile-help)
  css/                  styles, concatenated in cascade order
  js/                   game logic + animations, concatenated in load order
build.mjs               zero-dependency build (Node's fs only)
assets/                 the sprites the game draws from
```

## Features you get for free

- Three levels with a per-level head swap, then a "you won" screen and an
  endless mode.
- Pac-Man-style monster chasers that ramp up each level.
- Mobile swipe controls and desktop arrow keys, with an on-screen how-to-play
  demo, plus English/Hebrew (RTL) localization you can extend.
- Best score saved locally; fully responsive board; `prefers-reduced-motion`
  respected throughout.

## License

MIT.

---

*Based on the [dubisnake](https://github.com/roei88/dubisnake) engine.*

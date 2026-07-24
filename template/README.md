# CustomSnake

A customizable **retro snake game template**: a photo snake head that cycles per
level, food to chase, and Pac-Man-style monster chasers across three levels -
built by one zero-dependency script into a **single, truly self-contained
`index.html`** (all images base64-inlined, no runtime requests). Bring your own
pictures, run one build, host one file.

The art that ships is neutral: **solid-black head placeholders** and
solid-color monster placeholders, so you can see exactly which slots to fill.

> **Ships English-only.** The language toggle button is hidden by default;
> Hebrew is included only as an example translation. See
> [Language & translation](#language--translation) to turn it on.

## Contents

- [What you get](#what-you-get)
- [Requirements](#requirements)
- [Install](#install)
- [Quick start (the CLI)](#quick-start-the-cli)
- [The `customsnake` CLI](#the-customsnake-cli)
- [Customize by hand](#customize-by-hand)
- [Language & translation](#language--translation)
- [How the build works](#how-the-build-works-single-self-contained-file)
- [Tech & constraints](#tech--constraints)
- [Project structure](#project-structure)
- [Deploy](#deploy)
- [License](#license)

## What you get

- **One self-contained `index.html`** - CSS, JS, HTML partials, *and* every image
  are inlined (images as `data:` URIs), so the file runs offline, from `file://`,
  or on any static host with **nothing else alongside it**.
- **Zero runtime dependencies** - vanilla JavaScript + an HTML5 canvas. No CDNs,
  no framework, no bundler needed to run it.
- Three levels with a per-level head swap, a "you won" screen, and an endless mode.
- Pac-Man-style monster chasers that ramp up each level (1 -> 2 -> 3).
- Mobile swipe controls and desktop arrow keys, an on-screen how-to-play demo,
  best score saved locally, a fully responsive board, and `prefers-reduced-motion`
  respected throughout.
- A cross-platform **Python CLI** (`customsnake`) to scaffold, swap images,
  regenerate placeholders/banner, and preview.

## Requirements

- **Node.js** (any recent LTS) - to run the build (`node build.mjs`). This is the
  only thing the game itself needs.
- **Python 3.9+** with **Pillow** and **Typer** - only for the optional
  `customsnake` CLI tooling (`pip install -e tools`).

## Install

### From npm (public registry)

```bash
npm install @roei88/customsnake
```

That drops the package under `node_modules/@roei88/customsnake` - a read-only
dependency copy. To actually build a game, **scaffold a working project** with the
CLI (below) or **copy the `template/` folder** into your own repo.

### From GitHub Packages (alternative)

GitHub Packages requires auth even for public packages, so create a GitHub token
with the **`read:packages`** scope and add to your `.npmrc`:

```
@roei88:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_READ_PACKAGES_TOKEN
```
```bash
npm install @roei88/customsnake
```

### Or copy the folder

Clone this repo and copy the `template/` folder - it is fully standalone.

## Quick start (the CLI)

```bash
# 1. install the CLI (from inside the template folder)
pip install -e tools            # provides the `customsnake` command

# 2. scaffold a new game
customsnake new my-snake --title "My Snake" --url https://me.github.io/my-snake
cd my-snake

# 3. drop in your own pictures (any images - auto-cropped to 512px squares)
customsnake images \
  --head1 me1.jpg --head2 me2.jpg --head3 me3.jpg \
  --ghost1 boss.png --ghost2 rival.png --ghost3 nemesis.png
#   ^ this rebuilds index.html automatically (images are inlined at build time)

# 4. preview
customsnake serve               # http://127.0.0.1:8000
```

Prefer no build step for scaffolding? add `--no-build` to `new` and run
`node build.mjs` yourself.

## The `customsnake` CLI

Built with **[Typer](https://typer.tiangolo.com/)** (the modern Python CLI
framework, on top of Click). Full reference in [`tools/README.md`](tools/README.md).

| Command | What it does |
|---|---|
| `customsnake new NAME` | Scaffold a fresh game project from the template (rebrands title/meta/package.json). |
| `customsnake images --head1 ... --ghost1 ...` | Import your own photos into the sprite slots (center-cropped to 512px squares), then rebuild. |
| `customsnake placeholders` | Regenerate the neutral placeholder sprites (black heads, colored monsters). |
| `customsnake banner --title "..."` | Regenerate the 1200x630 social banner from the current head + food. |
| `customsnake serve --port 8000` | Build the single file and preview it locally. |

Every image-changing command re-runs the build by default (pass `--no-rebuild`
to skip), because images are embedded into `index.html` at build time.

## Customize by hand

You do not need the CLI. To swap art, drop your own **square PNGs** into `assets/`
(512x512 works best) over these names, then run the build:

| File | Slot |
|---|---|
| `head-1.png`, `head-2.png`, `head-3.png` | Snake head, one per level (cycles). Drawn clipped to a circle. |
| `ghost-1.png`, `ghost-2.png`, `ghost-3.png` | The three monster chasers. |
| `food.png` | The food the snake eats. |
| `splash.png` | Game-over / win graphic. |
| `banner.png` | 1200x630 social link-preview card. |

```bash
node build.mjs      # REQUIRED after changing images - they are inlined into index.html
```

To rebrand the wordmark and card, edit `src/js/strings.js` (`brandTitle`) and
`src/index.template.html` (`<title>` and the `og:` / `twitter:` meta - set your
own site URL there too), then rebuild.

## Language & translation

**The template is English-only by default and the language toggle button is
hidden.** The Hebrew strings in `src/js/strings.js` are kept only as an example
of how a second language is wired.

To **enable** translation:

1. In `src/css/lang-toggle.css`, delete the single rule `#langToggle { display: none; }`.
2. In `src/js/strings.js`, add your locales to the `STRINGS` table (copy the `en`
   block, translate the values) and set the default in `new I18n(STRINGS, "customsnake_lang", "en")`.
3. `node build.mjs`.

Every user-facing string is looked up through `S()`, so a new language needs no
code changes beyond the `STRINGS` table.

## How the build works (single self-contained file)

`node build.mjs` (zero dependencies, Node's `fs` only):

1. Inlines the `src/html/*.html` partials into the page shell, then concatenates
   `src/css/*.css` into one `<style>` and `src/js/*.js` into one `<script>` (order
   declared explicitly in `build.mjs`).
2. **Base64-inlines every image in `assets/` as a `data:` URI**, rewriting the
   runtime references (`./assets/x.png` in JS, `url("assets/x.png")` in CSS). The
   locked CSP already permits `img-src data:`. The result loads **no external
   files at runtime**.

So a rebuild is required whenever you change an image (it is embedded), but the
payoff is a single portable file. The only reference deliberately left as an
absolute URL is the social `og:image` (crawlers cannot read `data:` URIs) - see
[Deploy](#deploy).

## Tech & constraints

- **Vanilla JS + Canvas**, no runtime deps, no modules loaded at runtime.
- **Locked Content-Security-Policy**: `default-src 'self'; img-src 'self' data:;
  script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; base-uri
  'none'; form-action 'none';` - keep new features inside it (no CDNs).
- **Fixed-timestep `requestAnimationFrame` loop** with an accumulator; no
  `setInterval`, no `Date.now()`-based animation timing.
- **`prefers-reduced-motion`** is honored everywhere (animations swap to static).
- Best score persists via `localStorage` (namespaced `customsnake_*`).
- No `getImageData`, so it stays `file://`-safe.

Deeper notes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Project structure

```
template/
  index.html            generated single self-contained file (do not hand-edit)
  build.mjs             zero-dependency build (inlines CSS/JS/HTML + assets)
  package.json          npm package (scoped for GitHub Packages)
  assets/               source sprites you customize (heads, monsters, food, splash, banner)
  src/
    index.template.html page shell + meta tags
    html/               markup partials (hud, board, mobile-help)
    css/                styles, concatenated in cascade order
    js/                 game logic + animations, concatenated in load order
  tools/                the `customsnake` Python CLI (Typer + Pillow)
  docs/                 extended technical docs
```

## Deploy

The **game** is just `index.html` - host that one file anywhere (GitHub Pages,
Netlify, S3, or open it locally).

For a rich **social link-preview card**, also host `assets/banner.png` at a real
URL and point the `og:image` / `og:url` meta in `src/index.template.html` at your
site (crawlers need an absolute URL; `data:` URIs do not work for `og:image`).
The game itself never needs the hosted banner - only the social card does.

## License

MIT - use it, rebrand it, ship it.

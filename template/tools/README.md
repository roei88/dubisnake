# customsnake CLI

A small [Typer](https://typer.tiangolo.com/) command-line tool that bootstraps and
customizes a CustomSnake game. Typer (built on Click) is the modern standard for
Python CLIs; this wraps the scaffolding + image tooling + preview into one command.

## Install

```bash
# from inside the template folder
pip install -e tools
# -> installs the `customsnake` command (deps: typer, pillow)
```

Or run without installing:

```bash
pip install typer pillow
python -m customsnake.cli --help      # run from the tools/ folder
```

## Commands

Run `customsnake --help` or `customsnake <command> --help` for full options.

### `customsnake new NAME`

Scaffold a fresh game project from the template into a new folder, rebranded and
stripped of the template's own repo/registry metadata.

```bash
customsnake new my-snake --title "My Snake" --url https://me.example.com --build
```

| Option | Default | Meaning |
|---|---|---|
| `NAME` | (required) | Folder slug and package name. |
| `--title` | = NAME | Display brand (wordmark, `<title>`, social title). |
| `--dest` | `./NAME` | Target directory. |
| `--url` | none | Your site URL (fills `og:url` / `og:image` / `homepage`). |
| `--build / --no-build` | build | Run `node build.mjs` after scaffolding. |

### `customsnake images`

Import your own photos into the sprite slots. Each is center-cropped to a square
and resized to 512x512, then the single file is rebuilt (images are inlined).

```bash
customsnake images --head1 me1.jpg --head2 me2.jpg --head3 me3.jpg \
                   --ghost1 boss.png --ghost2 rival.png --ghost3 nemesis.png \
                   --food popcorn.png --splash gameover.png
```

Slots: `--head1..3`, `--ghost1..3`, `--food`, `--splash`. Add `--no-rebuild` to
skip the build.

### `customsnake placeholders`

Regenerate the neutral placeholder sprites (solid-black heads, solid-color
monsters), then rebuild. Handy to reset to a clean slate.

### `customsnake banner`

Regenerate the 1200x630 social banner from the current `head-1.png` + `food.png`.

```bash
customsnake banner --title "My Snake" --subtitle "Eat the stars!"
```

### `customsnake serve`

Build the single self-contained `index.html` and serve it locally for preview.

```bash
customsnake serve --port 8000        # http://127.0.0.1:8000
```

## Notes

- The CLI finds the game root by looking for `build.mjs` + `src/` from the current
  directory upward, so run it from inside a template or a scaffolded project.
- `node` is required for any command that rebuilds; `pillow` for any image command.

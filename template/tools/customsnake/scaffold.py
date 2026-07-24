"""`customsnake new` - scaffold a fresh game project from the template."""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from .core import die, echo, run_build

_IGNORE = shutil.ignore_patterns(
    "index.html", "node_modules", ".git", "__pycache__", "*.egg-info",
    ".npmrc", "*.pyc", ".DS_Store",
)


def _replace_in_file(path: Path, subs: list[tuple[str, str]]) -> None:
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    for old, new in subs:
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def _write_project_readme(target: Path, title: str, url: str | None) -> None:
    play = f"\n**Play:** {url}\n" if url else ""
    (target / "README.md").write_text(
        f"""# {title}

A customized retro snake game - eat the food, dodge the monsters, clear three
levels. Ships as one self-contained `index.html` (all images inlined); zero
runtime dependencies.
{play}
## Customize

Replace the square PNGs in `assets/` with your own (`head-1..3`, `ghost-1..3`,
`food`, `splash`, `banner`), then rebuild:

```bash
node build.mjs        # or:  customsnake images --head1 me.jpg ...   (auto-rebuilds)
```

Rebrand the wordmark in `src/js/strings.js` (`brandTitle`) and the meta tags in
`src/index.template.html`, then rebuild.

## Build & deploy

```bash
node build.mjs        # regenerates the single self-contained index.html
```

Host `index.html` anywhere (any static host, or open it locally). For a social
link-preview card, also host `assets/banner.png` and point `og:image` / `og:url`
in `src/index.template.html` at your site.

## Tooling

The `customsnake` CLI (see `tools/`) can import images, regenerate placeholders,
build a banner, and serve a preview. Architecture notes are in `docs/`.

## License

MIT.
""",
        encoding="utf-8",
    )


def new_project(root: Path, name: str, title: str | None, dest: str | None,
                url: str | None, do_build: bool) -> None:
    title = title or name
    slug = re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-") or "customsnake-game"
    target = Path(dest).expanduser() if dest else Path.cwd() / slug
    if target.exists():
        die(f"destination already exists: {target}")
    echo(f"- scaffolding '{title}' -> {target}")
    shutil.copytree(root, target, ignore=_IGNORE)

    # package.json: rename, drop publish config (this is the user's own project)
    pkg_path = target / "package.json"
    if pkg_path.is_file():
        try:
            pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
        except Exception:
            pkg = {}
        pkg["name"] = slug
        pkg["version"] = "1.0.0"
        pkg["description"] = f"{title} - a customized retro snake game."
        # Strip everything specific to the template's own repo/registry so a
        # scaffolded game carries none of it (see the CustomSnake docs note on
        # not shipping template-repo details into your project).
        for k in ("publishConfig", "author", "repository", "bugs"):
            pkg.pop(k, None)
        pkg["repository"] = url if url else ""
        if url:
            pkg["homepage"] = url
        pkg_path.write_text(json.dumps(pkg, indent=2) + "\n", encoding="utf-8")

    # brand title (both locales point at the same Latin wordmark)
    _replace_in_file(target / "src" / "js" / "strings.js",
                     [('brandTitle: "CustomSnake"', f'brandTitle: "{title}"')])

    # page + social meta
    tpl = target / "src" / "index.template.html"
    subs = [
        ("<title>CustomSnake</title>", f"<title>{title}</title>"),
        ('content="CustomSnake"', f'content="{title}"'),
    ]
    if url:
        host = url.rstrip("/")
        subs += [
            ("https://YOUR-USERNAME.github.io/customsnake", host),
        ]
    _replace_in_file(tpl, subs)

    # Replace the template's own package README (which documents installing
    # THIS template from its registry) with a fresh, generic game README, so the
    # new project carries no template-repo/registry details.
    _write_project_readme(target, title, url)

    echo(f"  copied template, set brand to '{title}'"
         + (f", site URL to {url}" if url else ""))
    if do_build:
        run_build(target)
    echo("\nNext:")
    echo(f"  cd {target}")
    echo("  # drop your own images:  customsnake images --head1 me.jpg --ghost1 boss.png ...")
    echo("  # then build the single file:  npm run build   (or: node build.mjs)")

"""Shared helpers: locate the template root, run the build, serve locally."""
from __future__ import annotations

import functools
import http.server
import shutil
import socketserver
import subprocess
import sys
from pathlib import Path

# Filenames the game draws from (see src/js/assets.js ASSET_LIST + the banner).
SPRITE_SLOTS = ["head-1", "head-2", "head-3", "ghost-1", "ghost-2", "ghost-3"]
GENERIC_SLOTS = ["food", "splash"]
ALL_ASSETS = SPRITE_SLOTS + GENERIC_SLOTS + ["banner"]


def echo(msg: str) -> None:
    print(msg)


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(1)


def find_template_root(start: Path | None = None) -> Path:
    """The template root is the nearest directory that has build.mjs + src/.

    Searched from the current working directory upward, then from this
    package's own location - so the CLI works whether it is run from inside a
    copied template, from a scaffolded project, or installed editable.
    """
    candidates = []
    if start is not None:
        candidates.append(Path(start).resolve())
    candidates.append(Path.cwd().resolve())
    candidates.append(Path(__file__).resolve().parents[2])  # tools/customsnake -> tools -> template
    for base in candidates:
        for d in [base, *base.parents]:
            if (d / "build.mjs").is_file() and (d / "src").is_dir():
                return d
    die(
        "could not find a CustomSnake template here (no build.mjs + src/ nearby).\n"
        "Run this from inside the template folder or a scaffolded project."
    )


def assets_dir(root: Path) -> Path:
    d = root / "assets"
    d.mkdir(parents=True, exist_ok=True)
    return d


def run_build(root: Path) -> None:
    """Re-run `node build.mjs` to regenerate the single self-contained index.html."""
    if shutil.which("node") is None:
        die("Node.js is required to build (node build.mjs). Install Node, then retry.")
    echo("- building index.html (node build.mjs)...")
    res = subprocess.run(["node", "build.mjs"], cwd=root)
    if res.returncode != 0:
        die("build failed (node build.mjs returned non-zero).")
    echo(f"  wrote {root / 'index.html'}")


def serve(root: Path, port: int) -> None:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
        echo(f"- serving {root} at http://127.0.0.1:{port}/  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            echo("\n- stopped.")


def require_pillow():
    try:
        from PIL import Image, ImageDraw, ImageFont  # noqa: F401
        return True
    except Exception:
        die("Pillow is required for image commands. Install it: pip install pillow")

"""Image tooling: import your own photos, (re)generate placeholders + banner.

All Pillow-based. Kept dependency-light and deterministic so `customsnake`
image commands produce the exact sprite sizes the game expects (512x512 square
sprites; a 1200x630 social banner).
"""
from __future__ import annotations

import math
from pathlib import Path

from .core import assets_dir, echo, require_pillow

SPRITE_PX = 512
SS = 3  # supersample for crisp edges

# neutral defaults: heads = solid black placeholders, monsters = distinct hues
HEAD_COLORS = {"head-1": (0, 0, 0), "head-2": (0, 0, 0), "head-3": (0, 0, 0)}
GHOST_COLORS = {"ghost-1": (239, 83, 80), "ghost-2": (236, 64, 122), "ghost-3": (66, 165, 245)}

# banner palette
_SNAKE = (76, 217, 100); _SNAKE_EDGE = (27, 94, 32); _BELLY = (183, 240, 170)
_CREAM = (255, 217, 138); _CREAM_EDGE = (40, 22, 11)
_CYAN = (0, 229, 255); _CYAN_EDGE = (5, 34, 42); _RING = (0, 229, 255); _TONGUE = (233, 42, 103)
_BG = (25, 20, 16); _GRID = (32, 26, 21); _FRAME = (70, 58, 47)


def to_square(src: Path, size: int = SPRITE_PX):
    """Center-crop an image to a square and resize to `size` (RGBA)."""
    require_pillow()
    from PIL import Image
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
    return im.resize((size, size), Image.LANCZOS)


def import_images(root: Path, mapping: dict[str, Path]) -> list[str]:
    """mapping: slot name (e.g. 'head-1') -> source image path. Writes assets/."""
    require_pillow()
    out = assets_dir(root)
    written = []
    for slot, path in mapping.items():
        if path is None:
            continue
        p = Path(path).expanduser()
        if not p.is_file():
            echo(f"  ! skipping {slot}: file not found: {p}")
            continue
        to_square(p).save(out / f"{slot}.png")
        written.append(slot)
        echo(f"  {slot:8s} <- {p.name}")
    return written


def _solid_circle(color):
    require_pillow()
    from PIL import Image, ImageDraw
    n = SPRITE_PX * SS
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    m = 6 * SS
    ImageDraw.Draw(im).ellipse([m, m, n - m, n - m], fill=tuple(color) + (255,))
    return im.resize((SPRITE_PX, SPRITE_PX), Image.LANCZOS)


def make_placeholders(root: Path) -> None:
    """(Re)generate neutral placeholder sprites: black heads, coloured monsters."""
    out = assets_dir(root)
    for name, c in {**HEAD_COLORS, **GHOST_COLORS}.items():
        _solid_circle(c).save(out / f"{name}.png")
    echo("- wrote 6 placeholder sprites (black heads, coloured monsters)")


def _font(size):
    from PIL import ImageFont
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf",
        "/Library/Fonts/Arial Rounded Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if Path(path).is_file():
            return ImageFont.truetype(path, int(size))
    return ImageFont.load_default()


def _catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return (
        0.5 * ((2*p1[0]) + (-p0[0]+p2[0])*t + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
        0.5 * ((2*p1[1]) + (-p0[1]+p2[1])*t + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3),
    )


def make_banner(root: Path, title: str = "CustomSnake", subtitle: str = "Eat the popcorn!") -> None:
    """Generate assets/banner.png (1200x630 social card). Uses the current
    head-1.png if present (masked to the head circle), else a black placeholder."""
    require_pillow()
    from PIL import Image, ImageDraw
    out = assets_dir(root)
    W, H = 1200, 630
    w, h = W * SS, H * SS
    img = Image.new("RGB", (w, h), _BG)
    d = ImageDraw.Draw(img, "RGBA")
    step = 48 * SS
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=_GRID, width=SS)
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=_GRID, width=SS)
    d.rounded_rectangle([8*SS, 8*SS, w-8*SS, h-8*SS], radius=28*SS, outline=_FRAME, width=5*SS)
    for i in range(5):
        cx = w // 2 + (i - 2) * 14 * SS
        d.ellipse([cx-3*SS, 22*SS-3*SS, cx+3*SS, 22*SS+3*SS], fill=_FRAME)

    ctrl = [(70, 520), (180, 470), (300, 500), (420, 430), (520, 360), (640, 350), (740, 370), (830, 345)]
    ctrl = [(x*SS, y*SS) for x, y in ctrl]
    path = []
    for i in range(len(ctrl) - 3):
        for j in range(25):
            path.append(_catmull(ctrl[i], ctrl[i+1], ctrl[i+2], ctrl[i+3], j/24))
    n = len(path)
    for i, (x, y) in enumerate(path):
        if i % 3:
            continue
        f = i / (n - 1); r = (26 + 20 * f) * SS
        d.ellipse([x-r, y-r, x+r, y+r], fill=_SNAKE, outline=_SNAKE_EDGE, width=int(4*SS))
    for i, (x, y) in enumerate(path):
        if i % 6:
            continue
        f = i / (n - 1); br = (7 + 4 * f) * SS
        d.ellipse([x-br, y-br, x+br, y+br], fill=_BELLY)

    hx, hy, R = int(830*SS), int(345*SS), int(96*SS)
    head_png = out / "head-1.png"
    if head_png.is_file():
        head = Image.open(head_png).convert("RGBA").resize((2*R, 2*R))
        mask = Image.new("L", (2*R, 2*R), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, 2*R-1, 2*R-1], fill=255)
        img.paste(head, (hx-R, hy-R), mask)
    else:
        d.ellipse([hx-R, hy-R, hx+R, hy+R], fill=(0, 0, 0))
    d.line([(hx+R-4*SS, hy), (hx+R+44*SS, hy)], fill=_TONGUE, width=int(6*SS))
    d.line([(hx+R+44*SS, hy), (hx+R+66*SS, hy-16*SS)], fill=_TONGUE, width=int(6*SS))
    d.line([(hx+R+44*SS, hy), (hx+R+66*SS, hy+16*SS)], fill=_TONGUE, width=int(6*SS))
    d.ellipse([hx-R, hy-R, hx+R, hy+R], outline=_RING, width=int(8*SS))

    food = out / "food.png"
    if food.is_file():
        pop = Image.open(food).convert("RGBA")
        for (px, py, s) in [(1075, 235, 118), (1090, 520, 104), (150, 250, 92)]:
            p = pop.resize((int(s*SS), int(s*SS)))
            img.paste(p, (int(px*SS - s*SS/2), int(py*SS - s*SS/2)), p)

    tf, sf = _font(150 * SS), _font(62 * SS)

    def ctext(cx, cy, text, font, fill, edge, ew):
        b = d.textbbox((0, 0), text, font=font)
        d.text((cx - (b[2]-b[0])/2 - b[0], cy - (b[3]-b[1])/2 - b[1]), text,
               font=font, fill=fill, stroke_width=int(ew*SS), stroke_fill=edge)

    ctext(w // 2 - 20 * SS, 175 * SS, title, tf, _CREAM, _CREAM_EDGE, 6)
    ctext(430 * SS, 300 * SS, subtitle, sf, _CYAN, _CYAN_EDGE, 4)
    img.resize((W, H), Image.LANCZOS).save(out / "banner.png")
    echo(f'- wrote assets/banner.png ("{title}")')

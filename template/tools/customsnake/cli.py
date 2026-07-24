"""The `customsnake` CLI (Typer) - bootstrap and customize a snake game.

Commands:
  new           scaffold a fresh game project from the template
  images        import your own photos into the sprite slots (crop -> 512px)
  placeholders  (re)generate the neutral placeholder sprites
  banner        (re)generate the 1200x630 social banner
  serve         build the single file and preview it locally

Any command that changes images rebuilds index.html by default, because the
build inlines the images into the one self-contained file.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

import typer

from . import __version__
from . import imaging, scaffold
from .core import echo, find_template_root, run_build
from .core import serve as serve_dir

app = typer.Typer(
    add_completion=False,
    help="Bootstrap and customize a CustomSnake game from the template.",
    no_args_is_help=True,
)


def _version(value: bool):
    if value:
        echo(f"customsnake {__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: bool = typer.Option(False, "--version", callback=_version, is_eager=True,
                                 help="Show version and exit."),
):
    """CustomSnake project tooling."""


@app.command()
def new(
    name: str = typer.Argument(..., help="Project name / folder slug, e.g. my-snake."),
    title: Optional[str] = typer.Option(None, help="Display brand title (defaults to NAME)."),
    dest: Optional[str] = typer.Option(None, help="Target directory (default: ./<name>)."),
    url: Optional[str] = typer.Option(None, help="Your site URL, e.g. https://me.github.io/my-snake."),
    build: bool = typer.Option(True, help="Run node build.mjs after scaffolding."),
):
    """Scaffold a fresh game project from this template."""
    scaffold.new_project(find_template_root(), name, title, dest, url, build)


@app.command()
def images(
    head1: Optional[str] = typer.Option(None, help="Image for the snake head, level 1."),
    head2: Optional[str] = typer.Option(None, help="Image for the snake head, level 2."),
    head3: Optional[str] = typer.Option(None, help="Image for the snake head, level 3."),
    ghost1: Optional[str] = typer.Option(None, help="Image for monster 1."),
    ghost2: Optional[str] = typer.Option(None, help="Image for monster 2."),
    ghost3: Optional[str] = typer.Option(None, help="Image for monster 3."),
    food: Optional[str] = typer.Option(None, help="Image for the food."),
    splash: Optional[str] = typer.Option(None, help="Image for the game-over/win splash."),
    rebuild: bool = typer.Option(True, help="Rebuild index.html so the new images are inlined."),
):
    """Import your own photos into the sprite slots (center-cropped to 512px squares)."""
    root = find_template_root()
    mapping = {
        "head-1": head1, "head-2": head2, "head-3": head3,
        "ghost-1": ghost1, "ghost-2": ghost2, "ghost-3": ghost3,
        "food": food, "splash": splash,
    }
    if not any(mapping.values()):
        raise typer.BadParameter("give at least one image, e.g. --head1 me.jpg")
    written = imaging.import_images(root, mapping)
    if written and rebuild:
        run_build(root)


@app.command()
def placeholders(
    rebuild: bool = typer.Option(True, help="Rebuild index.html after regenerating."),
):
    """(Re)generate the neutral placeholder sprites (black heads, coloured monsters)."""
    root = find_template_root()
    imaging.make_placeholders(root)
    if rebuild:
        run_build(root)


@app.command()
def banner(
    title: str = typer.Option("CustomSnake", help="Wordmark shown on the banner."),
    subtitle: str = typer.Option("Eat the popcorn!", help="Tagline under the wordmark."),
    rebuild: bool = typer.Option(True, help="Rebuild index.html after regenerating."),
):
    """(Re)generate the 1200x630 social banner from the current head + food images."""
    root = find_template_root()
    imaging.make_banner(root, title, subtitle)
    if rebuild:
        run_build(root)


@app.command()
def serve(
    port: int = typer.Option(8000, help="Port to serve on."),
    build: bool = typer.Option(True, help="Build the single file before serving."),
):
    """Build the single self-contained index.html and preview it locally."""
    root = find_template_root()
    if build:
        run_build(root)
    serve_dir(root, port)


if __name__ == "__main__":
    app()

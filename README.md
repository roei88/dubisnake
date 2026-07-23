# dubisnake

A Nokia-style Snake game where the head is a profile photo instead of a plain
block, the food is a piece of popcorn, and the head photo swaps to the next
one every time you level up (looping 1 -> 2 -> 3 -> 1 ...). Walls and self
collisions end the run, speed ramps up each level, and your best score is
remembered on the device you play on.

**Play it live:** https://roei88.github.io/dubisnake/

## Controls

- **Desktop:** Arrow keys or WASD to steer, Space to pause, Enter to
  start/restart.
- **Mobile:** swipe on the board, or use the on-screen D-pad (shown
  automatically on touch devices); tap to start/restart.

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
control semantics (arrow keys, swipe, D-pad) are unchanged. A small circular
avatar showing the current head photo sits in the top-left corner of the HUD
at all times (menu, playing, paused, game over) alongside the score/level/
high-score readout.

Everything runs from a single self-contained `index.html` (vanilla JS +
canvas), no build step and no external libraries, so it also works by opening
the file directly from disk.

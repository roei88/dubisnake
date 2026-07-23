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
food (`food.png`), and the splash graphic used on the level-up flash and
game-over screen (`splash.png`). If an image fails to load, the game falls
back to a plain colored circle so it keeps working.

Everything runs from a single self-contained `index.html` (vanilla JS +
canvas), no build step and no external libraries, so it also works by opening
the file directly from disk.

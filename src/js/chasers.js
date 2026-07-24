  // ---------- chasers: the Pac-Man-style monster field ----------
  // Owns the live set of chaser cells and their shared movement cadence.
  // Everything grid/collision-related (the snake head, the food, a
  // cell-free predicate) is passed in per call, so this class holds ONLY
  // chaser state - never a reference to the wider game.
  class ChaserField {
    constructor(gridN) {
      this.gridN = gridN;
      this.cells = [];   // [{x, y}] - one entry per active chaser
      this.accum = 0;    // fractional move accumulator (see advance())
    }

    // Clear all chasers and reset the movement cadence (called at level start).
    reset() {
      this.cells = [];
      this.accum = 0;
    }

    count() { return this.cells.length; }

    // Is a chaser on cell (x, y)?
    at(x, y) {
      for (var i = 0; i < this.cells.length; i++) {
        if (this.cells[i].x === x && this.cells[i].y === y) return true;
      }
      return false;
    }

    // Spawn one chaser on a free cell far from `head`, relaxing the distance
    // requirement in passes (5 -> 3 -> 1 Manhattan) so spawning still works on
    // a crowded late-game board instead of looping forever. `isFree(x, y)` is
    // the snake-body-free predicate; `food` (or null) is avoided too. If no
    // valid cell exists, the spawn is skipped silently.
    spawn(head, food, isFree) {
      var candidates = [];
      var passes = [5, 3, 1];
      for (var p = 0; p < passes.length && !candidates.length; p++) {
        for (var gy = 0; gy < this.gridN; gy++) {
          for (var gx = 0; gx < this.gridN; gx++) {
            if (Math.abs(gx - head.x) + Math.abs(gy - head.y) < passes[p]) continue;
            if (!isFree(gx, gy)) continue;
            if (food && gx === food.x && gy === food.y) continue;
            if (this.at(gx, gy)) continue;
            candidates.push({ x: gx, y: gy });
          }
        }
      }
      if (candidates.length) {
        this.cells.push(candidates[Math.floor(Math.random() * candidates.length)]);
      }
    }

    // One greedy grid step per chaser toward `head`. Chasers pass over the
    // snake body, the food, and each other - only exact head contact matters -
    // but a chaser NEVER steps onto the head cell itself. Per-index axis
    // preference keeps multiple chasers flanking from different directions
    // instead of stacking into one blob.
    //
    // Why "never step onto the head": before this rule, being adjacent to a
    // chaser on a tick where it also stepped was an unavoidable death - the
    // player slipped safely PAST the ghost (a different cell, no overlap) and
    // the ghost's own move that same tick landed on top of them, so the
    // effective hitbox was radius 1, not 0. With the rule, death by chaser is
    // exactly "you moved into it", the same contract as walls and self
    // collision.
    _stepToward(head) {
      for (var i = 0; i < this.cells.length; i++) {
        var c = this.cells[i];
        var dx = head.x - c.x, dy = head.y - c.y;
        var sx = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
        var sy = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
        var preferX;
        if (i % 3 === 1) preferX = true;
        else if (i % 3 === 2) preferX = false;
        else preferX = Math.abs(dx) >= Math.abs(dy);
        var stepX = { x: c.x + sx, y: c.y };
        var stepY = { x: c.x, y: c.y + sy };
        var opts = preferX ? [stepX, stepY] : [stepY, stepX];
        for (var k = 0; k < opts.length; k++) {
          var o = opts[k];
          if (o.x === c.x && o.y === c.y) continue;       // already aligned on that axis
          if (o.x === head.x && o.y === head.y) continue; // never step onto the head
          c.x = o.x; c.y = o.y;
          break;
        }
      }
    }

    // Advance the shared cadence by `rate` moves-per-call; when a whole move
    // has accumulated, step every chaser toward `head`. Returns true if a
    // chaser now occupies the head cell (i.e. it caught the player).
    advance(head, rate) {
      this.accum += rate;
      if (this.accum >= 1) {
        this.accum -= 1;
        this._stepToward(head);
        return this.at(head.x, head.y);
      }
      return false;
    }
  }

  var chaserField = new ChaserField(GRID_N);

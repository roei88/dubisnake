  // ---------- rendering ----------
  // Shared by the normal in-game render() below and renderOpening() above -
  // the translucent Nokia-LCD board fill plus the dimmed guide grid, exactly
  // as before this was factored out (Task C) - no visual change.
  function drawBoardBackdrop() {
    var w = boardCssPx, h = boardCssPx;
    ctx.clearRect(0, 0, w, h);
    // light Nokia-LCD board, deliberately semi-transparent (alpha 0.82) so a
    // hint of the dark phone body underneath shows through - per request.
    // clearRect above wipes each frame, so the translucent fill can never
    // accumulate across frames.
    ctx.fillStyle = "rgba(204, 217, 163, 0.82)";
    ctx.fillRect(0, 0, w, h);

    // grid: kept for guidance but dimmed well down - per request
    ctx.strokeStyle = "rgba(46, 61, 26, 0.09)";
    ctx.lineWidth = 1;
    for (var g = 1; g < GRID_N; g++) {
      var p = Math.round(g * cellPx) + 0.5;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(w, p); ctx.stroke();
    }
  }

  function render() {
    if (state === "opening") {
      renderOpening(openingElapsedMs());
      return;
    }
    drawBoardBackdrop();

    if (!snake) return;

    // food, slightly larger than a cell, soft shadow
    // (food can legitimately be null once the board is completely full - win())
    if (food) {
      var foodImg = assetStore.drawable("food");
      var fSize = cellPx * 1.3;
      var fx = food.x * cellPx + cellPx / 2;
      var fy = food.y * cellPx + cellPx / 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = cellPx * 0.4;
      ctx.shadowOffsetY = cellPx * 0.12;
      if (assetStore.image("food")) {
        ctx.drawImage(foodImg, fx - fSize / 2, fy - fSize / 2, fSize, fSize);
      } else {
        ctx.beginPath();
        ctx.arc(fx, fy, fSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd166";
        ctx.fill();
      }
      ctx.restore();
    }

    // body, warm per-level tint circles, fading toward tail, smaller than head
    var tint = currentTint();
    var bodyLen = snake.length - 1;
    for (var i = snake.length - 1; i >= 1; i--) {
      var seg = snake[i];
      var t = bodyLen > 1 ? (i - 1) / (bodyLen - 1) : 0; // 0 near head, 1 near tail
      var size = cellPx * (0.82 - 0.22 * t);
      var alpha = 0.95 - 0.45 * t;
      var cxp = seg.x * cellPx + cellPx / 2;
      var cyp = seg.y * cellPx + cellPx / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cxp, cyp, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = tint.core;
      ctx.fill();
      ctx.lineWidth = Math.max(1, cellPx * 0.05);
      ctx.strokeStyle = tint.edge;
      ctx.stroke();
      ctx.restore();
    }

    // head: circular photo rotated toward travel direction
    var headSeg = snake[0];
    var hx = headSeg.x * cellPx + cellPx / 2;
    var hy = headSeg.y * cellPx + cellPx / 2;
    var hSize = cellPx * 0.95;
    var angle = Math.atan2(dir.y, dir.x);
    var headKey = currentHeadKey();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, hSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    if (assetStore.image(headKey)) {
      ctx.drawImage(assetStore.image(headKey), -hSize / 2, -hSize / 2, hSize, hSize);
    } else {
      ctx.fillStyle = tint.core;
      ctx.fillRect(-hSize / 2, -hSize / 2, hSize, hSize);
    }
    ctx.restore();
    ctx.lineWidth = Math.max(1, cellPx * 0.06);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.stroke();
    ctx.restore();

    // chasers: drawn last so the threat is always visible on top. Sprite
    // per index (ghost1/2/3 = red/pink/cyan), same soft shadow as the food.
    // assetStore.drawable() returns either the loaded ghost image or the colored-
    // circle fallback canvas - drawImage accepts both.
    // Idle float/rotate/pulse/glow (Task A) is layered on with a canvas
    // transform around this draw only - ch.x/ch.y (the values chaserAt() and
    // every hit test read) are never touched.
    for (var ci = 0; ci < chaserField.cells.length; ci++) {
      var ch = chaserField.cells[ci];
      var idle = GHOST_IDLE[ci % 3];
      var gImg = assetStore.drawable("ghost" + ((ci % 3) + 1));
      var gSize = cellPx * 1.14;
      var gx2 = ch.x * cellPx + cellPx / 2;
      var gy2 = ch.y * cellPx + cellPx / 2;
      var ox = 0, oy = 0, rotRad = 0, scaleMul = 1, glow = idle.glowBase;
      if (!GHOST_IDLE_STILL) {
        // own phase per chaser index so the three never pulse in lockstep
        var p = ((animTs / GHOST_IDLE_PERIOD_MS) + ci / 3) % 1;
        var m = idle.motion(p * GHOST_IDLE_TAU, p * 2 * GHOST_IDLE_TAU, GHOST_IDLE_SCRATCH[ci % 3]);
        var norm = gSize / GHOST_IDLE_GS; // raw amplitudes were tuned to a 130px reference sprite
        ox = m.dx * norm;
        oy = m.dy * norm;
        rotRad = m.rot * Math.PI / 180;
        // reference baseline scale is 1.15; only the oscillating part is kept
        // so mean scale stays 1.0 and the collision-read draw size never changes
        scaleMul = 1 + m.scaleOsc;
        glow = m.glow;
      }
      ctx.save();
      ctx.translate(gx2 + ox, gy2 + oy);
      ctx.rotate(rotRad);
      ctx.scale(scaleMul, scaleMul);
      ctx.shadowColor = idle.color;
      ctx.shadowBlur = cellPx * Math.max(0, glow) * 0.6; // kept subtle - never enough to smear the board
      ctx.shadowOffsetY = cellPx * 0.1;
      ctx.drawImage(gImg, -gSize / 2, -gSize / 2, gSize, gSize);
      ctx.restore();
    }

    // "get ready" countdown (Change 2): drawn on top of the fully-frozen
    // board (snake/food/chasers already drawn above at their positionForLevel()
    // positions) so the player can see exactly where everything is before
    // play starts.
    if (state === "countdown") renderCountdown(countdownElapsedMs());
  }

  // Big 3 -> 2 -> 1, one second each, reusing the PRESS-ANY-KEY/level-banner
  // retro text conventions (system font, board-relative size, cyan glow).
  // GHOST_IDLE_STILL doubles as the countdown's reduced-motion flag - same
  // boot-time media-query cache as the rest of the file - so under
  // prefers-reduced-motion the number still shows and the full 3s still
  // elapses, just without the per-tick scale/fade.
  //
  // Deliberately NOT drawn at board-center: positionForLevel() always
  // re-centres the snake head at grid (floor(GRID_N/2), floor(GRID_N/2)),
  // which on the odd-sized GRID_N=9 board IS board-center in pixel space, so
  // a centred number would sit directly on top of the head for the full 3s
  // freeze - exactly the orientation window the countdown exists to protect.
  // Rendered in the upper third of the board instead, well clear of the
  // centred head's row (and its body trailing left of it on the same row),
  // independent of board size.
  var COUNTDOWN_NUMBER_Y_FRAC = 0.22; // fraction of boardCssPx down from top
  function renderCountdown(elapsed) {
    // elapsed in [0,1000) -> 3, [1000,2000) -> 2, [2000,3000) -> 1; clamp to
    // 1 so a frame landing exactly on/after 3000 (the tick frame() flips to
    // "playing" on) never renders a stray 0.
    var n = Math.max(1, 3 - Math.floor(elapsed / 1000));
    var tickElapsed = elapsed % 1000; // ms into the current number, for the pulse
    var scale = 1, alpha = 1;
    if (!GHOST_IDLE_STILL) {
      var p = tickElapsed / 1000; // 0..1 within this number's one-second slot
      scale = 1.15 - 0.15 * p;    // pops in slightly large, settles to 1
      alpha = Math.min(1, p * 4); // quick fade-in, avoids a hard pop on entry
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(boardCssPx / 2, boardCssPx * COUNTDOWN_NUMBER_Y_FRAC);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "rgba(0,229,255,0.65)";
    ctx.shadowBlur = cellPx * 0.9;
    ctx.font = "900 " + Math.round(cellPx * 2.6) + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
  }

  // ---------- fixed-timestep rAF loop ----------
  function frame(ts) {
    if (!lastTs) lastTs = ts;
    var dt = ts - lastTs;
    lastTs = ts;
    animTs = ts;
    if (dt > 250) dt = 250; // clamp huge gaps (tab backgrounded)

    if (state === "opening") {
      // Auto-advance to the menu if the player never dismisses it (see
      // requestOpeningDismiss() for the dismiss path) - timed from this same
      // rAF timestamp, never Date.now(), so it stays consistent with the
      // rest of the file's animation conventions (see animTs above). step()
      // is never called here, same as every other non-"playing" state.
      if (openingStartTs === null) openingStartTs = ts;
      if (ts - openingStartTs >= OPENING_TOTAL_MS) endOpening();
    } else if (state === "countdown") {
      // Blocking "get ready" freeze (Change 2): advances nothing but its own
      // timer - no step(), no snake/chaser movement - so the board stays
      // exactly as positionForLevel() left it for the whole 3s. Same lazy
      // rAF-ts capture as openingStartTs above, never Date.now().
      if (countdownStartTs === null) countdownStartTs = ts;
      if (ts - countdownStartTs >= COUNTDOWN_MS) {
        state = "playing";
        acc = 0; // no catch-up burst: the freeze must not bank real time
      }
    } else if (state === "playing") {
      acc += dt;
      // Snapshot stepMs for this frame: step() can call levelUp(), which
      // mutates stepMs mid-loop. Without the snapshot, a single frame could
      // execute an extra step at the newly-faster rate right at a level
      // boundary (an uncommanded burst of movement).
      var stepSnapshot = stepMs;
      while (acc >= stepSnapshot) {
        acc -= stepSnapshot;
        if (state === "playing") step();
        else break;
      }
    }

    render();
    requestAnimationFrame(frame);
  }

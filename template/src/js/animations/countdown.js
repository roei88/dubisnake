  // ===== animation: get-ready countdown number =====
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

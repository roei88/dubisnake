  // ---------- responsive canvas sizing ----------
  var dpr = 1;
  var boardCssPx = 0;
  var cellPx = 0;
  // Floor multiplier retuned from *4 to *8 alongside the GRID_N cut (19->13):
  // at *4 the worst-case cell would only be 4px regardless of grid size,
  // which defeats the point of moving to fewer/bigger cells for
  // readability. *8 guarantees at least an 8px cell whenever the viewport can
  // actually fit it. This is the *ideal* floor, not an absolute one any more -
  // see SAFETY_MIN_BOARD_PX and its use in resizeCanvas() below:
  // unconditionally forcing every viewport up to this floor (the old
  // behavior) is exactly what caused #wrap to have to scroll on short
  // landscape phones that used to fit at GRID_N=19/*4. GRID_N was cut again
  // to 9 per the grid/avatar/palette spec - MIN_BOARD_PX derives from GRID_N
  // so it now floors at 9*8=72px (was 104px at GRID_N=13); no parallel
  // constant to keep in sync.
  var MIN_BOARD_PX = GRID_N * 8;   // preferred floor (72px) for legible cells,
                                    // honored whenever the viewport fits it
                                    // without forcing scroll/clipping.
  // Absolute last-resort floor (same *4 multiplier the pre-13x13 build used)
  // so the board never collapses to ~0px on a pathological viewport. Unlike
  // MIN_BOARD_PX above, resizeCanvas() only falls back to this when honoring
  // MIN_BOARD_PX would itself force #wrap to scroll - i.e. it never
  // overrides a fit budget that's already between the two floors, it only
  // stops the board from going to zero when even that fit budget is
  // negative/near-zero. Derives from GRID_N (9*4=36px, was 52px at GRID_N=13).
  var SAFETY_MIN_BOARD_PX = GRID_N * 4;
  var MAX_BOARD_PX = 720;          // cap so 4K/8K desktops don't get a huge board;
                                    // unchanged - at GRID_N=9 this yields ~80px
                                    // cells, plenty large on desktop without
                                    // further tuning.
  // The #wrap "phone frame" (border + padding, see its CSS) adds fixed,
  // KNOWN px overhead beyond what measureReservePx() measures (that function
  // only measures hud/footer - not #wrap's own border/padding). Unlike
  // the avatar-sizing fixed-point loop above, these are plain constants, not
  // derived from cellPx or anything else computed here, so there is no
  // circular-dependency risk - just add them once. Vertical: border-top(3) +
  // padding-top(22) + padding-bottom(12) + border-bottom(3) = 40. Horizontal:
  // border-left(3) + padding-left(14) + padding-right(14) + border-right(3)
  // = 34 (the env(safe-area-inset-*) part of that padding is the OS's own
  // reserved inset, already outside the viewport dimensions JS reads, so it
  // needs no separate accounting here).
  var FRAME_VERTICAL_PX = 40;
  var FRAME_HORIZONTAL_PX = 34;

  // Measures the *actual* rendered height of everything in #wrap besides the
  // board (hud + footer, plus the 2 flex gaps between #wrap's 3 children -
  // hud/boardWrap/footer), instead of a hardcoded guess. A hardcoded guess
  // was padded well above the real DOM heights (e.g. reserving 90px for
  // hud+footer when they actually render closer to 30px), which silently ate
  // into the board's height budget and was the root cause of the no-scroll
  // regression on short landscape viewports (568x320 etc.) once MIN_BOARD_PX
  // grew from GRID_N*4 to GRID_N*8 - the padded estimate left far less real
  // headroom than the numbers suggested. Measuring the live layout instead
  // keeps this accurate as the CSS changes, with no constant to drift out of
  // sync. (Used to also account for the on-screen D-pad's height on coarse-
  // pointer devices; that control was removed - touch is swipe-only now -
  // so #wrap always has exactly these 3 children/2 gaps.)
  function measureReservePx() {
    var hudEl = document.getElementById("hud");
    var footerEl = document.getElementById("footer");
    var gap = parseFloat(getComputedStyle(wrap).rowGap);
    if (!gap && gap !== 0) gap = parseFloat(getComputedStyle(wrap).gap) || 8;
    var hudH = hudEl ? hudEl.getBoundingClientRect().height : 0;
    var footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;
    return hudH + footerH + gap * 2;
  }

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    var margin = 24;

    // QA fix: the HUD's real rendered height depends on --avatar-px, a CSS
    // calc() driven by --cell-px (min(cellPx*3, 240px) - see #hud CSS), but
    // --cell-px is only known once *this function* has already picked a
    // board size - and measureReservePx() below reads the HUD's height
    // BEFORE that happens, so the board used to get sized against a stale
    // (pre-avatar-growth) HUD height, with no second pass to compensate once
    // the avatar actually grew. Verified concretely at 593x646: cellPx
    // settled at 63px -> avatar/HUD height 189px -> #wrap needed ~787px in a
    // 646px container, a persistent 141px forced scroll on first paint - and
    // nothing guarantees a real static session (no resize/orientationchange/
    // visibilitychange/DPR-change) ever gets a corrective second pass.
    // Fix: solve it as a small fixed-point iteration right here instead of
    // depending on some future external event. Each pass writes the
    // tentative --cell-px so the *next* measureReservePx() call reflects the
    // HUD height that cellPx would actually produce. The feedback loop is a
    // contraction (bigger cellPx -> bigger avatar -> bigger reserve ->
    // smaller available -> smaller cellPx), so it stabilizes to (at, or very
    // close to) a fixed point within a handful of iterations - the GRID_N
    // quantization of boardCssPx can make the very last step or two hunt by
    // one grid unit rather than land exactly, so the loop always uses
    // whichever value it lands on at the cap rather than assuming exact
    // equality is reached; the hard iteration cap is a defensive bound only,
    // in case a future CSS change ever broke the contraction outright.
    var available = 0;
    var prevBoardCssPx = -1;
    for (var iter = 0; iter < 8; iter++) {
      var reservePx = measureReservePx();

      available = Math.min(window.innerWidth, window.innerHeight) - margin;
      // Leave room for HUD + footer text so the whole stack
      // (hud/canvas/footer) tends to fit in one screen without scrolling.
      // An under-estimate here just means #wrap's own overflow-y:auto
      // kicks in instead of anything overlapping.
      available = Math.min(
        available,
        window.innerHeight - reservePx - FRAME_VERTICAL_PX,
        window.innerWidth - 16 - FRAME_HORIZONTAL_PX
      );
      available = Math.min(available, MAX_BOARD_PX);
      // Only pull the board up to the *ideal* readability floor when the
      // viewport can actually fit that floor without forcing a scroll (i.e.
      // `available` - the real fit budget computed above - already meets or
      // exceeds it, so this is a no-op). When the fit budget is smaller than
      // the ideal floor, honor the fit budget itself (keeps the no-scroll
      // requirement intact) and only clamp up to the much smaller
      // SAFETY_MIN_BOARD_PX as an absolute last resort against a near-zero
      // board on a truly pathological viewport - the old unconditional
      // `Math.max(MIN_BOARD_PX, available)` is what forced scrolling on
      // short landscape phones that used to fit at the previous
      // GRID_N/floor tuning.
      if (available < MIN_BOARD_PX) {
        available = Math.max(SAFETY_MIN_BOARD_PX, available);
      }

      boardCssPx = Math.floor(available / GRID_N) * GRID_N; // keep divisible by grid for crisp cells
      if (boardCssPx <= 0) boardCssPx = GRID_N * 4;
      cellPx = boardCssPx / GRID_N;
      // --cell-px is set on #wrap (the shared ancestor of #hud and
      // #boardWrap) so it cascades to #hud's --avatar-px calc() (see #hud
      // CSS) - written every iteration (not just once at the end) so the
      // *next* iteration's measureReservePx() sees the HUD height this
      // cellPx would actually produce, which is the whole point of the loop.
      if (wrap) wrap.style.setProperty("--cell-px", cellPx + "px");
      if (boardCssPx === prevBoardCssPx) break; // converged, stop early
      prevBoardCssPx = boardCssPx;
    }

    canvas.style.width = boardCssPx + "px";
    canvas.style.height = boardCssPx + "px";
    // Expose the *actual* achieved board size to CSS so the level-flash
    // card (absolutely positioned inside this same container, see
    // #levelFlashCard rules above) can size itself relative to the real
    // container instead of only the viewport - fixes clipping on small/
    // landscape boards where MIN_BOARD_PX forces the board below what the
    // old vmin-only sizing assumed.
    if (boardWrapEl) boardWrapEl.style.setProperty("--board-px", boardCssPx + "px");
    canvas.width = Math.round(boardCssPx * dpr);
    canvas.height = Math.round(boardCssPx * dpr);
    // Scale by the *actual* achieved backing-store ratio, not the raw dpr -
    // fractional DPRs (1.5, 1.75, 2.625...) don't survive Math.round() cleanly,
    // so this keeps drawing coordinates aligned to true device pixels.
    var sx = canvas.width / boardCssPx;
    var sy = canvas.height / boardCssPx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(sx, sy);

    render(); // repaint immediately at new size, even if paused/menu
  }

  // ---------- overlay screens ----------
  // Every string below comes from S() (the current-language STRINGS entry),
  // so re-invoking whichever of these matches the current `state` is exactly
  // what applyLanguage() needs to do to re-render the visible overlay in the
  // new language, with no separate template to keep in sync.
  function showOverlayMenu() {
    overlay.classList.remove("hidden");
    overlay.innerHTML =
      '<div class="overlayInner">' +
      '<h1>' + S().brandTitle + '</h1>' +
      '<p class="tagline">' + S().menuInstructions + '</p>' +
      // Language-independent (icons only), so it needs no S() lookup and
      // survives applyLanguage()'s rebuild unchanged. dir="ltr" pins the
      // flex-row snake against RTL reversal - see the static markup comment.
      '<div class="howto howtoTouch" dir="ltr" aria-hidden="true"><span class="htArrow htUp">&#8593;</span><span class="htArrow htRight">&#8594;</span><span class="htArrow htDown">&#8595;</span><span class="htArrow htLeft">&#8592;</span><span class="htSnake"><i></i><i></i><i></i></span><span class="htHand">&#128070;</span></div>' +
      '<div class="howto howtoKeys" dir="ltr" aria-hidden="true"><span class="htSnake"><i></i><i></i><i></i></span><span class="htKeys"><b class="htKey htkUp">&#8593;</b><b class="htKey htkLeft">&#8592;</b><b class="htKey htkDown">&#8595;</b><b class="htKey htkRight">&#8594;</b></span></div>' +
      '<button id="playBtn" type="button">' + S().playBtn + '</button>' +
      '</div>';
    bindPlayBtn();
  }

  function showOverlayDead() {
    overlay.classList.remove("hidden");
    overlay.innerHTML =
      '<div class="overlayInner">' +
      '<img class="splashPic" src="' + assetSrc("splash") + '" alt="">' +
      '<h1>' + S().deadTitle + '</h1>' +
      '<p class="stat">' + S().scoreStat(score) + '</p>' +
      '<p class="stat">' + S().hiStat(hi) + '</p>' +
      '<p>' + S().deadRetry + '</p>' +
      '<button id="playBtn" type="button">' + S().playAgainBtn + '</button>' +
      '</div>';
    bindPlayBtn();
  }

  function showOverlayWon() {
    overlay.classList.remove("hidden");
    overlay.innerHTML =
      '<div class="overlayInner">' +
      '<img class="splashPic" src="' + assetSrc("splash") + '" alt="">' +
      '<h1>' + S().wonTitle + '</h1>' +
      '<p class="stat">' + S().wonBoardFull(score) + '</p>' +
      '<p class="stat">' + S().hiStat(hi) + '</p>' +
      '<p>' + S().wonRetry + '</p>' +
      '<button id="playBtn" type="button">' + S().playAgainBtn + '</button>' +
      '</div>';
    bindPlayBtn();
  }

  function showOverlayPaused() {
    overlay.classList.remove("hidden");
    overlay.innerHTML =
      '<div class="overlayInner">' +
      '<h1>' + S().pausedTitle + '</h1>' +
      '<p class="stat">' + S().scoreStat(score) + '</p>' +
      '<p>' + S().pausedResume + '</p>' +
      '<button id="playBtn" type="button">' + S().resumeBtn + '</button>' +
      '</div>';
    bindPlayBtn();
  }

  function bindPlayBtn() {
    var btn = document.getElementById("playBtn");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      startOrResume();
    });
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  if (levelOkBtn) {
    levelOkBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation(); // don't also reach the backdrop handler below
      dismissLevelBanner();
    });
  }
  if (levelFlash) {
    // Tapping anywhere on the banner dismisses it too - on a phone, aiming
    // for the button is needless friction. Guarded to the backdrop itself so
    // this stays additive to the button rather than racing it.
    levelFlash.addEventListener("click", function (e) {
      if (e.target === levelFlash || e.target === levelFlashCard) dismissLevelBanner();
    });
  }

  function startOrResume() {
    // Assets aren't ready yet: #playBtn is disabled in this state so a real
    // click can't normally reach here, but the board/canvas tap-to-start
    // handlers call this too, so guard explicitly rather than relying only
    // on the disabled attribute.
    if (state === "loading") return;
    if (state === "menu" || state === "dead" || state === "won") {
      // newGame() ends by showing the level-1 banner, which sets state to
      // "levelbanner" - do NOT force "playing" here or the banner would be
      // skipped straight past on the very first level.
      newGame();
      hideOverlay();
      render(); // paint the fresh snake immediately, don't wait for the next rAF tick
    } else if (state === "paused") {
      state = "playing";
      hideOverlay();
    }
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      hideLevelBanner(); // same bleed-through guard as die()/win()
      showOverlayPaused();
    } else if (state === "paused") {
      state = "playing";
      hideOverlay();
    }
  }

  // ---------- opening intro scene (Task C - adapted port of
  // new-assets/animations/opener-scenes.jsx) ----------
  // Plays once, automatically, right after preloadAssets() finishes and
  // before the normal "menu" state - see startOpening() (called from the
  // preloadAssets callback near the bottom of this file) and endOpening().
  // Entirely canvas-driven from the SAME fixed-timestep frame()/render()
  // pair the rest of the game already uses: no second rAF loop, no
  // setInterval, no Date.now()-based timing (openingStartTs/animTs are both
  // captured from the rAF timestamp frame() already receives). Reuses the
  // already-loaded ghost1/2/3, head1/2/3 and food sprites - no new assets.
  // The reference stage (720x1080 portrait, separate banner+board) doesn't
  // map 1:1 onto this game's square board, so every coordinate below is
  // expressed in board-relative fractions/cellPx, not copied from the
  // reference pixel values (see local/NEWASSETS_SPEC.md, Task C: "adapt,
  // don't copy coordinates").
  var OPENING_REVEAL_MS = 3000;
  var OPENING_CHASE_MS = 3500;
  var OPENING_READY_MS = 2500;
  var OPENING_TOTAL_MS = OPENING_REVEAL_MS + OPENING_CHASE_MS + OPENING_READY_MS; // ~9s, per spec

  // Cheap ease-out-back / ease-out-cubic helpers for the scene's motion -
  // plain math, no library.
  function openingEaseOutBack(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function openingEaseOutCubic(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return 1 - Math.pow(1 - t, 3);
  }

  // Starts the intro: called once, from the preloadAssets() callback,
  // instead of jumping straight "loading" -> "menu". frame() only ever calls
  // step() while state === "playing" (see frame() below), so this new state
  // needs no extra guard there - it simply never matches that branch.
  function startOpening() {
    state = "opening";
    openingStartTs = null; // set on frame()'s first tick while opening (rAF ts)
    suppressTapStartOnce = false;
    overlay.classList.add("hidden"); // the scene is drawn on canvas, not in #overlay
  }

  // Ends the intro - naturally (auto-advance, ~9s, see frame()) or via
  // requestOpeningDismiss() below (any key/pointer/touch) - either way it
  // lands on exactly the same normal "menu" state the old "loading"->"menu"
  // jump used to.
  function endOpening() {
    if (state !== "opening") return;
    state = "menu";
    showOverlayMenu();
    maybeShowMobileHelp();
  }

  // Any key press, or any pointer/touch press ANYWHERE (wired below, near
  // the existing keyboard/touch handlers), dismisses straight to the menu.
  // suppressTapStartOnce swallows the SAME physical tap/click once more (the
  // browser still fires the trailing click/touchend for it) so it can't also
  // fall through to the existing "tap the board to start" convenience and
  // skip straight into a new game, bypassing the menu screen the dismissal
  // is supposed to land on. NOTE: a tap that happens to land exactly where
  // the freshly-shown #playBtn renders can still reach that button's own
  // click listener directly (target-phase, before bubbling reaches the
  // suppress check) and start a game one gesture early - a narrow, harmless
  // edge case (one tap = dismiss AND start), not worth the extra plumbing to
  // fully close off.
  function requestOpeningDismiss() {
    if (state !== "opening") return;
    endOpening();
    suppressTapStartOnce = true;
  }

  function openingElapsedMs() {
    if (openingStartTs === null) return 0;
    return Math.max(0, animTs - openingStartTs);
  }

  // Same lazy-capture pattern as openingElapsedMs() above, for the
  // "get ready" countdown (Change 2). Returns 0 (renders as "3") for the one
  // render() pass that can happen before frame() has captured
  // countdownStartTs on its first "countdown" tick.
  function countdownElapsedMs() {
    if (countdownStartTs === null) return 0;
    return Math.max(0, animTs - countdownStartTs);
  }

  // Reveal (0-3s): the head sprite pops in at board center (ease-out-back),
  // then a few food sprites fade in around it.
  function renderOpeningReveal(p) {
    var cx = boardCssPx / 2, cy = boardCssPx / 2;
    var headP = Math.min(1, p / 0.6);
    var headScale = openingEaseOutBack(headP);
    var hSize = cellPx * 2.4 * Math.max(0, headScale);
    if (hSize > 0.5) {
      var headImg = drawable(currentHeadKey());
      ctx.save();
      ctx.globalAlpha = Math.min(1, headP * 1.4);
      ctx.beginPath();
      ctx.arc(cx, cy, hSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(headImg, cx - hSize / 2, cy - hSize / 2, hSize, hSize);
      ctx.restore();
    }
    var foodP = Math.max(0, (p - 0.5) / 0.5);
    if (foodP > 0) {
      var foodImg = drawable("food");
      var fSize = cellPx * 0.9;
      var spots = [
        { x: cx - cellPx * 2.6, y: cy - cellPx * 1.8 },
        { x: cx + cellPx * 2.6, y: cy - cellPx * 1.4 },
        { x: cx + cellPx * 1.8, y: cy + cellPx * 2.4 }
      ];
      for (var i = 0; i < spots.length; i++) {
        var a = Math.max(0, Math.min(1, foodP * 3 - i));
        if (a <= 0) continue;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.drawImage(foodImg, spots[i].x - fSize / 2, spots[i].y - fSize / 2, fSize, fSize);
        ctx.restore();
      }
    }
  }

  // Chase (3-6.5s): the head glides left->right along a gentle sine curve
  // (a stand-in for the reference's smooth curved path, adapted to a square
  // board instead of the portrait stage), a short body trail follows, and
  // the three ghosts descend from above the board and converge into a chase
  // line behind it.
  function renderOpeningChase(p) {
    var travel = p;
    var hx = travel * boardCssPx;
    var hy = boardCssPx * 0.5 + Math.sin(travel * Math.PI * 2) * boardCssPx * 0.12;
    var headImg = drawable(currentHeadKey());
    var hSize = cellPx * 1.3;
    var heading = Math.atan2(Math.cos(travel * Math.PI * 2) * 0.7, 1);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(heading);
    ctx.beginPath();
    ctx.arc(0, 0, hSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(headImg, -hSize / 2, -hSize / 2, hSize, hSize);
    ctx.restore();

    var tint = currentTint();
    for (var i = 1; i <= 4; i++) {
      var bt = Math.max(0, travel - i * 0.05);
      var bx = bt * boardCssPx;
      var by = boardCssPx * 0.5 + Math.sin(bt * Math.PI * 2) * boardCssPx * 0.12;
      var bSize = Math.max(0, cellPx * (0.8 - i * 0.08));
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.9 - i * 0.15);
      ctx.beginPath();
      ctx.arc(bx, by, bSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = tint.core;
      ctx.fill();
      ctx.restore();
    }

    for (var ci = 0; ci < 3; ci++) {
      var descend = Math.min(1, Math.max(0, (p - ci * 0.12) / 0.7));
      var targetX = hx - (ci + 1.4) * cellPx * 1.1;
      var targetY = hy + (ci - 1) * cellPx * 0.9;
      var startY = -cellPx * 2;
      var gx = targetX;
      var gy = startY + (targetY - startY) * openingEaseOutBack(descend);
      var gImg = drawable("ghost" + (ci + 1));
      var gSize = cellPx * 1.14;
      ctx.save();
      ctx.globalAlpha = Math.min(1, descend * 2);
      ctx.drawImage(gImg, gx - gSize / 2, gy - gSize / 2, gSize, gSize);
      ctx.restore();
    }
  }

  // Ready (6.5-9s): everything settles into the exact formation newGame()
  // itself spawns (3-segment snake centered, facing right), with the ghosts
  // parked in their far corners and (motion allowing) a gentle idle bob
  // reusing the Task A GHOST_IDLE motion - a literal "get ready" preview of
  // the real board.
  function renderOpeningReady(p) {
    var cx = Math.floor(GRID_N / 2), cy = Math.floor(GRID_N / 2);
    var settle = openingEaseOutCubic(Math.min(1, p / 0.5));
    var startCells = [
      { x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }
    ];
    var fromX = boardCssPx, fromY = boardCssPx * 0.5;

    var headImg = drawable(currentHeadKey());
    var hSize = cellPx * 0.95;
    var toX = startCells[0].x * cellPx + cellPx / 2, toY = startCells[0].y * cellPx + cellPx / 2;
    var hx = fromX + (toX - fromX) * settle;
    var hy = fromY + (toY - fromY) * settle;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.beginPath();
    ctx.arc(0, 0, hSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(headImg, -hSize / 2, -hSize / 2, hSize, hSize);
    ctx.restore();

    var tint = currentTint();
    for (var i = 1; i < startCells.length; i++) {
      var seg = startCells[i];
      var segToX = seg.x * cellPx + cellPx / 2, segToY = seg.y * cellPx + cellPx / 2;
      var sx = fromX + (segToX - fromX) * settle;
      var sy = fromY + (segToY - fromY) * settle;
      var size = cellPx * (0.82 - 0.22 * (i / (startCells.length - 1)));
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = tint.core;
      ctx.fill();
      ctx.lineWidth = Math.max(1, cellPx * 0.05);
      ctx.strokeStyle = tint.edge;
      ctx.stroke();
      ctx.restore();
    }

    // QA fix: the two bottom ghosts used to sit at the literal grid corners
    // ((GRID_N-1,GRID_N-1) and (0,GRID_N-1)), which put their glow directly
    // over the first/last letters of the "PRESS ANY KEY" band drawn at
    // boardCssPx*0.88 (renderPressAnyKey()). Inset them up and inward so the
    // sprite (plus its idle glow) clears the text band while still reading
    // as "parked near the corner". Top-right is untouched - it's far enough
    // from the bottom text band already.
    var restSpots = [
      { x: GRID_N - 1, y: 0 }, { x: GRID_N - 2.3, y: GRID_N - 2.9 }, { x: 1.3, y: GRID_N - 2.9 }
    ];
    for (var ci = 0; ci < 3; ci++) {
      var spot = restSpots[ci];
      var rx = spot.x * cellPx + cellPx / 2, ry = spot.y * cellPx + cellPx / 2;
      var idle = GHOST_IDLE[ci % 3];
      var gSize = cellPx * 1.14;
      var ox = 0, oy = 0, glow = idle.glowBase;
      if (!GHOST_IDLE_STILL) {
        var pp = ((animTs / GHOST_IDLE_PERIOD_MS) + ci / 3) % 1;
        var m = idle.motion(pp * GHOST_IDLE_TAU, pp * 2 * GHOST_IDLE_TAU, GHOST_IDLE_SCRATCH[ci]);
        var norm = gSize / GHOST_IDLE_GS;
        ox = m.dx * norm * settle;
        oy = m.dy * norm * settle;
        glow = m.glow;
      }
      var gImg = drawable("ghost" + (ci + 1));
      ctx.save();
      ctx.globalAlpha = settle;
      ctx.shadowColor = idle.color;
      ctx.shadowBlur = cellPx * Math.max(0, glow) * 0.6;
      ctx.drawImage(gImg, rx + ox - gSize / 2, ry + oy - gSize / 2, gSize, gSize);
      ctx.restore();
    }
  }

  // prefers-reduced-motion fallback: a single static composed frame (the
  // fully-settled "ready" formation, no idle bob since GHOST_IDLE_STILL
  // already zeroes it above) plus the still (non-pulsing) PRESS ANY KEY text
  // - see renderPressAnyKey(). No motion is ever computed in this branch.
  function renderOpeningStill() {
    renderOpeningReady(1);
  }

  // Retro pulsing "PRESS ANY KEY" text (Hebrew equivalent via STRINGS),
  // drawn directly on the board canvas rather than as a DOM overlay so it
  // shares the exact same coordinate space/scaling as the rest of the scene
  // and needs no extra element in #wrap's flow (measureReservePx()/
  // resizeCanvas()'s sizing budget stays untouched). ctx.direction follows
  // the current language's reading direction, same as document.dir
  // elsewhere.
  function renderPressAnyKey(elapsed) {
    var text = S().pressAnyKey;
    if (!text) return;
    var alpha;
    if (OPENING_STILL) {
      alpha = 0.9; // static - no pulsing under prefers-reduced-motion
    } else {
      var fadeIn = Math.min(1, elapsed / 1000);
      alpha = fadeIn * (0.55 + 0.45 * Math.sin(elapsed / 260));
      alpha = Math.max(0.15 * fadeIn, alpha);
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "rgba(0,229,255,0.65)";
    ctx.shadowBlur = cellPx * 0.5;
    var fontPx = Math.round(cellPx * 1.05);
    var fontStack = "px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.font = "900 " + fontPx + fontStack;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = S().dir;
    // QA fix: the Hebrew string measures ~100% of the board width at this
    // font size (vs ~90% for English), clipping its leftmost letter at the
    // board edge. Measure the actual string and shrink the font to fit a
    // safe max width instead of assuming English's narrower proportions -
    // this keeps a real margin for every language/board size, not just the
    // one QA happened to measure.
    var maxTextWidth = boardCssPx * 0.86;
    var textWidth = ctx.measureText(text).width;
    if (textWidth > maxTextWidth && textWidth > 0) {
      fontPx = Math.max(1, Math.floor(fontPx * (maxTextWidth / textWidth)));
      ctx.font = "900 " + fontPx + fontStack;
    }
    ctx.fillText(text, boardCssPx / 2, boardCssPx * 0.88);
    ctx.restore();
  }

  // Top-level opening render dispatch, called from render() while
  // state === "opening". Draws the same board backdrop/grid as the real
  // game (drawBoardBackdrop(), shared with render() below) so the
  // transition into "menu"/"playing" reads as one continuous board rather
  // than a jump cut.
  function renderOpening(elapsed) {
    drawBoardBackdrop();
    if (OPENING_STILL) {
      renderOpeningStill();
    } else if (elapsed < OPENING_REVEAL_MS) {
      renderOpeningReveal(elapsed / OPENING_REVEAL_MS);
    } else if (elapsed < OPENING_REVEAL_MS + OPENING_CHASE_MS) {
      renderOpeningChase((elapsed - OPENING_REVEAL_MS) / OPENING_CHASE_MS);
    } else {
      renderOpeningReady(Math.min(1, (elapsed - OPENING_REVEAL_MS - OPENING_CHASE_MS) / OPENING_READY_MS));
    }
    renderPressAnyKey(elapsed);
  }

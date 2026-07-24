  // ---------- game state ----------
  // "loading" is the real boot state (not "menu"): the rAF loop and the
  // first real render() only start once assetStore.preload() finishes, so the
  // Play button must not be able to do anything before that - see the
  // disabled attribute on the static #playBtn and the guard at the top of
  // startOrResume(). Only assetStore.preload()'s callback advances "loading" -> "menu".
  var state = "loading"; // loading | opening | menu | levelbanner | countdown | playing | paused | dead | won
  var snake = null, dir = { x: 1, y: 0 }, queuedDir = null, food = null;
  // Pac-Man-style chasers: one per level, capped at 3. They pursue the
  // snake's head at a fraction of the snake's speed (CHASER_MOVE_RATE moves
  // per snake step, accumulated in chaserMoveAccum - see step()), float over
  // the snake's body and the food, and kill only on exact head-cell contact.
  var chasers = [];
  var chaserMoveAccum = 0;
  var score = 0, popcornCount = 0, level = 1, stepMs = BASE_STEP_MS, hi = 0;
  var acc = 0;
  var lastTs = 0;
  var animTs = 0; // rAF timestamp mirror, used only for the ghosts' idle-animation phase - never read by game logic

  // Opening intro scene (Task C) state - see the "opening intro scene"
  // section below, right before render(). openingStartTs is captured from
  // the rAF timestamp frame() already receives (never Date.now()), exactly
  // like animTs above, so the scene's timing stays consistent with the rest
  // of the file's animation conventions.
  var openingStartTs = null;

  // "get ready" countdown (Change 2): a blocking state between the level
  // banner and play, giving the player guaranteed orientation time after the
  // snake/chasers are re-centred by positionForLevel(). Timed from the same
  // rAF `ts` frame() already receives, exactly like openingStartTs above -
  // never Date.now(). Set by startCountdown(), read/cleared in frame().
  var countdownStartTs = null;
  // Consumes the SAME physical tap/click that just dismissed the opening
  // scene (the browser still fires a trailing click/touchend for it) so it
  // can't also fall through to the existing "tap the board to start"
  // convenience and skip straight into a new game, bypassing the menu screen
  // the dismissal is supposed to land on - see requestOpeningDismiss().
  var suppressTapStartOnce = false;

  // The level banner is BLOCKING (it owns `state`), so unlike the old
  // auto-timing-out flash card it can't still be on screen when the player
  // dies or wins. This stays as a defensive clear for the one path that can
  // still overlap: step() may call levelUp() (banner shown) and then, later
  // in the same step, detect that the snake moved onto a chaser and call
  // die() - the dead overlay is only ~86% opaque, so a stale banner would
  // show through it.
  function hideLevelBanner() {
    levelFlash.classList.remove("show");
  }

  // Retro "LEVEL n" screen: the level number is the only text - the monsters
  // now in play (one per level, capped at three) carry the rest of the
  // meaning, drawn at exactly 2x2 board cells each by the CSS above. Takes
  // over `state`, so the snake holds still until OK is pressed.
  function showLevelBanner() {
    var count = Math.min(level, 3);
    var html = "";
    for (var i = 0; i < count; i++) {
      // assetStore.src() keeps the existing fallback chain (real image, else the
      // generated colored-circle dataURL, else a blank pixel) so a failed
      // monster download can never leave a broken-image icon here.
      html += '<img src="' + assetStore.src("ghost" + (i + 1)) + '" alt="">';
    }
    levelMonsters.innerHTML = html;
    levelFlashTitle.textContent = S().levelFlashLabel(level);
    // Per-level colour pop, same tint the snake body uses this level.
    var tint = currentTint();
    levelFlashCard.style.borderColor = tint.core;
    levelFlashCard.style.boxShadow =
      "0 0 0 3px #0a0e06, 0 0 26px " + tint.core + "70, inset 0 0 20px " + tint.core + "1f";
    state = "levelbanner";
    levelFlash.classList.add("show");
  }

  function dismissLevelBanner() {
    if (state !== "levelbanner") return;
    levelFlash.classList.remove("show");
    acc = 0; // drop any fraction banked before the banner so dismissing it
             // can never produce a burst of catch-up steps
    startCountdown();
  }

  // 3s blocking "get ready" freeze between the level banner and play (Change
  // 2). state === "countdown" is handled in frame() (no step(), no catch-up
  // burst on exit) and render() (big centred number); see both below.
  // countdownStartTs is captured lazily from frame()'s own `ts` the first
  // tick this state is active, exactly like openingStartTs, so it stays
  // correct regardless of how much real time passed since dismissal.
  function startCountdown() {
    state = "countdown";
    countdownStartTs = null;
  }

  // Re-centres the snake (standard 3-length, heading right) and resets/
  // respawns the chasers, on EVERY level start (level 1 via newGame() and
  // every level-up). A grown snake can't be laid out straight from centre
  // without running off a 9x9 board past a few levels, so this is a full
  // Pac-Man-style position reset rather than an incremental nudge - score
  // and high score are untouched, only position/length/heading reset.
  function positionForLevel() {
    var cx = Math.floor(GRID_N / 2), cy = Math.floor(GRID_N / 2);
    snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy }
    ];
    dir = { x: 1, y: 0 };
    queuedDir = null;
    acc = 0;
    chaserMoveAccum = 0; // fresh chaser cadence each level - see step()
    chasers = [];
    var n = Math.min(level, 3);
    for (var i = 0; i < n; i++) spawnChaser(); // spawnChaser already keeps
                                                // spawns >=5 cells (relaxing
                                                // to 3, then 1) from the head
    placeFood(); // re-placed so it's never under the re-centred snake/chasers
                 // - can call win() if the board is somehow already full
  }

  function newGame() {
    score = 0;
    popcornCount = 0;
    level = 1;
    stepMs = BASE_STEP_MS;
    hideLevelBanner(); // clear any banner left over from a previous run
    positionForLevel();
    updateHud();
    updateAvatarHud(); // level just reset to 1 - keep the avatar in sync
    // Level 1 gets the same banner as every other level. Guarded because
    // positionForLevel()'s placeFood() can in principle call win() (board
    // completely full), which must not be overwritten by the banner's own
    // state change.
    if (state !== "won") showLevelBanner();
  }

  function cellFree(x, y) {
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x === x && snake[i].y === y) return false;
    }
    return true;
  }

  function chaserAt(x, y) {
    for (var i = 0; i < chasers.length; i++) {
      if (chasers[i].x === x && chasers[i].y === y) return true;
    }
    return false;
  }

  // Spawn a chaser on a free cell far from the snake's head, relaxing the
  // distance requirement in passes (5 -> 3 -> 1 Manhattan) so spawning
  // still works on a crowded late-game board instead of looping forever.
  // If literally no valid cell exists, skip the spawn silently.
  function spawnChaser() {
    var head = snake[0];
    var candidates = [];
    var passes = [5, 3, 1];
    for (var p = 0; p < passes.length && !candidates.length; p++) {
      for (var gy = 0; gy < GRID_N; gy++) {
        for (var gx = 0; gx < GRID_N; gx++) {
          if (Math.abs(gx - head.x) + Math.abs(gy - head.y) < passes[p]) continue;
          if (!cellFree(gx, gy)) continue;
          if (food && gx === food.x && gy === food.y) continue;
          if (chaserAt(gx, gy)) continue;
          candidates.push({ x: gx, y: gy });
        }
      }
    }
    if (candidates.length) {
      chasers.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }

  // One greedy grid step toward the snake's head per chaser. Chasers can
  // never leave the grid (the head is inside it), and they deliberately
  // pass over the snake's body, the food, and each other - only exact
  // head contact matters. Per-index axis preference keeps multiple
  // chasers approaching from different directions instead of merging
  // into one stacked blob.
  //
  // A chaser NEVER steps onto the head's own cell. Before this rule, being
  // adjacent to a chaser on a move where it also stepped was an unavoidable
  // death: the player slipped safely PAST the ghost (into a different cell,
  // no overlap), and the ghost's own move in that same tick then landed on
  // top of them - so the effective hitbox was radius 1, not 0, and passing
  // beside a ghost read as a phantom hit. With the rule, death by chaser is
  // exactly "you moved into it", the same contract as walls and self
  // collision, and the ghosts act as pursuing blockers that corner you
  // instead of insta-killing at range 1.
  function moveChasers() {
    var head = snake[0];
    for (var i = 0; i < chasers.length; i++) {
      var c = chasers[i];
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

  function placeFood() {
    var attempts = 0;
    var x, y;
    do {
      x = Math.floor(Math.random() * GRID_N);
      y = Math.floor(Math.random() * GRID_N);
      attempts++;
    } while ((!cellFree(x, y) || chaserAt(x, y)) && attempts < 500);
    if (!cellFree(x, y) || chaserAt(x, y)) {
      // Random search failed (board is nearly full): fall back to a
      // deterministic scan instead of placing food on an occupied cell,
      // which would otherwise force a false self-collision death on the
      // next valid grow move.
      var found = false;
      for (var gy = 0; gy < GRID_N && !found; gy++) {
        for (var gx = 0; gx < GRID_N && !found; gx++) {
          if (cellFree(gx, gy) && !chaserAt(gx, gy)) { x = gx; y = gy; found = true; }
        }
      }
      if (!found) {
        // Every snake-free cell is currently covered by a chaser - chasers
        // move constantly, so this is transient, not "board full". Relax
        // the chaser exclusion rather than mis-reporting a win.
        for (gy = 0; gy < GRID_N && !found; gy++) {
          for (gx = 0; gx < GRID_N && !found; gx++) {
            if (cellFree(gx, gy)) { x = gx; y = gy; found = true; }
          }
        }
      }
      if (!found) {
        // The board is completely full - there is nowhere left to place
        // food, so treat this as a win rather than a forced death.
        food = null;
        win();
        return;
      }
    }
    food = { x: x, y: y };
  }

  function currentHeadKey() {
    return HEAD_KEYS[(level - 1) % HEAD_KEYS.length];
  }

  function currentTint() {
    return LEVEL_TINTS[(level - 1) % LEVEL_TINTS.length];
  }

  // Always-visible avatar HUD (#avatarHud/#avatarHudImg): shows the same
  // head1/head2/head3 image already driving the snake head and
  // the level banner's monsters. Reuses assetStore.src()'s existing fallback chain (real image
  // src, or the makeFallbackCanvas() colored-circle dataURL, or
  // BLANK_PIXEL_SRC) - no new naive <img src> that can hang/blank on a failed
  // load. Called at boot (once assets are ready) and from newGame()/levelUp()
  // so it can never drift out of sync with either the snake head or the
  // level-up flash image.
  function updateAvatarHud() {
    if (avatarHudImg) avatarHudImg.src = assetStore.src(currentHeadKey());
  }

  function updateHud() {
    hudScore.textContent = String(score);
    hudLevel.textContent = String(level);
    hudHi.textContent = String(hi);
    // Score bar fill % - min(100, round(score / max(highScore,1) * 100)),
    // per spec; max(hi,1) avoids a div-by-zero flash to 100% before any
    // high score exists.
    if (scoreBarFill) {
      var pct = Math.min(100, Math.round((score / Math.max(hi, 1)) * 100));
      scoreBarFill.style.width = pct + "%";
    }
    // Level pips light up cumulatively (level >= n); DOM order is pip3/pip2/
    // pip1 top-to-bottom but the lit test is the same for all three.
    if (levelPip1) levelPip1.classList.toggle("is-lit", level >= 1);
    if (levelPip2) levelPip2.classList.toggle("is-lit", level >= 2);
    if (levelPip3) levelPip3.classList.toggle("is-lit", level >= 3);
  }

  // ---------- language switch: everything below is re-derived from S(),
  // never a page reload. Gameplay control DIRECTIONS are untouched by this -
  // switching `dir` only affects text layout (see the #avatarHud CSS comment
  // and #mobileHelpArrows's dir="ltr" markup for why the physical left/right
  // mapping stays fixed either way). Safe to call at any time, including
  // mid-game. ----------
  function applyLanguage(lang) {
    if (STRINGS[lang]) currentLang = lang;
    var s = S();

    document.documentElement.lang = currentLang;
    document.documentElement.dir = s.dir;

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", s.metaDescription);

    if (scoreLabelEl) scoreLabelEl.textContent = s.scoreLabel;
    if (levelLabelEl) levelLabelEl.textContent = s.levelLabel;
    if (hiLabelEl) hiLabelEl.textContent = s.hiLabel;

    var footerEl = document.getElementById("footer");
    if (footerEl) {
      footerEl.textContent = persistOk ? s.footerHi : s.footerHiFail;
    }

    if (mobileHelpText) mobileHelpText.textContent = s.mobileHelpText;

    if (langToggleBtn) {
      langToggleBtn.textContent = s.toggleLabel;
      langToggleBtn.setAttribute("aria-label", s.toggleAria);
    }

    // Re-render whichever overlay matches the current state, or - during the
    // brief pre-asset "loading" state, before any showOverlay* function has
    // run yet - directly correct the static markup's own elements in place.
    if (state === "menu") showOverlayMenu();
    else if (state === "dead") showOverlayDead();
    else if (state === "won") showOverlayWon();
    else if (state === "paused") showOverlayPaused();
    else if (state === "loading") {
      var loadingH1 = overlay.querySelector("h1");
      var loadingTagline = overlay.querySelector(".tagline");
      var loadingBtn = document.getElementById("playBtn");
      if (loadingH1) loadingH1.textContent = s.brandTitle;
      if (loadingTagline) loadingTagline.textContent = s.menuInstructions;
      // (no controls line any more - the .howto demo is icon-only, so there
      // is nothing here to re-translate)
      if (loadingBtn) loadingBtn.textContent = s.loadingBtn;
    }

    // The level banner can be the thing currently on screen - re-label it
    // too rather than leaving the old language up until the next level.
    if (state === "levelbanner") {
      levelFlashTitle.textContent = s.levelFlashLabel(level);
    }

    try {
      localStorage.setItem(LANG_KEY, currentLang);
    } catch (e) { /* private mode / storage disabled - in-session switch still works */ }
  }

  // hi is a module-level var, so an in-session high score still works even
  // when persistence is unavailable (private mode / quota / disabled
  // storage) - persistOk just tracks whether we can also survive a reload,
  // and surfaces a one-time notice in the footer when we can't.
  var persistOk = true;

  function notePersistFailure() {
    if (persistOk) return;
    var footerEl = document.getElementById("footer");
    if (footerEl && footerEl.dataset.persistNoted !== "1") {
      footerEl.textContent = S().footerHiFail;
      footerEl.dataset.persistNoted = "1";
    }
  }

  function loadHi() {
    try {
      var v = parseInt(localStorage.getItem(HI_KEY), 10);
      hi = isNaN(v) ? 0 : v;
    } catch (e) {
      hi = 0;
      persistOk = false;
      notePersistFailure();
    }
  }

  function saveHi() {
    if (score > hi) {
      hi = score;
      try {
        localStorage.setItem(HI_KEY, String(hi));
      } catch (e) {
        persistOk = false;
        notePersistFailure();
      }
    }
  }

  // ---------- input: queue at most one turn per step, forbid 180 into neck ----------
  function requestTurn(name) {
    var d = DIRS[name];
    if (!d) return;
    // Compare against the direction that will actually be committed next:
    // if a turn is already queued this tick, check against *that*, not the
    // stale committed dir - otherwise two opposite key presses within the
    // same step interval can both individually pass the anti-reversal check
    // and the second overwrites queuedDir, reversing the snake into its neck.
    var ref = queuedDir || dir;
    if (d.x === -ref.x && d.y === -ref.y) return;
    queuedDir = d;
  }

  function applyQueuedTurn() {
    if (queuedDir) {
      // guard again in case dir changed since queuing (shouldn't, but safe)
      if (!(queuedDir.x === -dir.x && queuedDir.y === -dir.y)) {
        dir = queuedDir;
      }
      queuedDir = null;
    }
  }

  // ---------- step / update ----------
  function step() {
    applyQueuedTurn();

    var head = snake[0];
    var nx = head.x + dir.x;
    var ny = head.y + dir.y;

    if (nx < 0 || nx >= GRID_N || ny < 0 || ny >= GRID_N) {
      return die();
    }
    // self collision: check against body (excluding tail cell, which will move away
    // unless we just ate - handled by only excluding when not growing)
    var willGrow = (nx === food.x && ny === food.y);
    var bodyToCheck = willGrow ? snake : snake.slice(0, snake.length - 1);
    for (var i = 0; i < bodyToCheck.length; i++) {
      if (bodyToCheck[i].x === nx && bodyToCheck[i].y === ny) {
        return die();
      }
    }

    snake.unshift({ x: nx, y: ny });
    // Set when this step triggers a level-up: positionForLevel() (inside
    // levelUp()) re-centres the snake AND resets/respawns the chasers, so
    // nx/ny below (this step's pre-reset head) and the pre-reset chasers no
    // longer describe the current board at all - the chaser checks further
    // down must be skipped for this tick rather than compare stale
    // coordinates against a brand-new layout.
    var leveledUp = false;
    if (willGrow) {
      score += 1;
      popcornCount += 1;
      if (popcornCount % POPCORN_PER_LEVEL === 0) {
        levelUp();
        leveledUp = true;
      } else {
        placeFood();
      }
      updateHud();
    } else {
      snake.pop();
    }

    if (leveledUp) return;

    // chasers: you die by walking INTO a ghost - and only that. Their own
    // slowed pursuit move (CHASER_MOVE_RATE moves per snake step, accumulated
    // below) can close in and block, but never lands on the head, so it
    // needs no death check of its own. See moveChasers() for why that rule
    // exists.
    if (chaserAt(nx, ny)) return die();
    chaserMoveAccum += CHASER_MOVE_RATE;
    if (chaserMoveAccum >= 1) {
      chaserMoveAccum -= 1;
      moveChasers();
      if (chaserAt(snake[0].x, snake[0].y)) return die();
    }
  }

  function levelUp() {
    level += 1;
    stepMs = Math.max(MIN_STEP_MS, stepMs * STEP_DECAY);
    // Re-centre the snake and reset/respawn the chasers for the new level
    // (level 2 -> two chasers, 3+ -> three) INSTEAD OF the old incremental
    // spawnChaser() - positionForLevel() now owns both, and as a side effect
    // the new chasers always spawn far from the (re-centred) head, fixing
    // "monsters too close at level start" without special-casing it.
    positionForLevel();
    // Keep the always-visible avatar HUD in sync with the new level's head
    // photo at this exact point, so the two can never drift apart.
    updateAvatarHud();
    // Blocking retro banner (was a ~1.9s non-blocking flash card): the snake
    // holds still until the player presses OK, so a level change can no
    // longer sneak movement past them while they read it. OK now leads into
    // the countdown (Change 2), not straight back to "playing".
    showLevelBanner();
  }

  function die() {
    state = "dead";
    hideLevelBanner(); // don't let a stale banner bleed through the
                        // translucent game-over overlay
    saveHi();
    updateHud();
    showOverlayDead();
  }

  function win() {
    // Reachable only when the snake fills every cell of the grid.
    state = "won";
    hideLevelBanner(); // same bleed-through guard as die()
    saveHi();
    updateHud();
    showOverlayWon();
  }

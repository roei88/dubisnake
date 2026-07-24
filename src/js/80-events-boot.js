  // ---------- keyboard ----------
  // WASD intentionally removed per spec - arrow keys only. (Was previously
  // mapped alongside ArrowUp/Down/Left/Right.)
  var KEY_DIR = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right"
  };

  window.addEventListener("keydown", function (e) {
    if (state === "opening") {
      requestOpeningDismiss();
      return;
    }
    if (KEY_DIR[e.key]) {
      e.preventDefault();
      // Countdown may still buffer a turn for when play starts (Pac-Man-
      // style input readiness) - requestTurn() only ever sets queuedDir, it
      // never touches `state`, so this can't shorten or skip the freeze.
      if (state === "playing" || state === "countdown") requestTurn(KEY_DIR[e.key]);
      return;
    }
    // Non-skippable (Change 2): Space/Enter must do nothing during the
    // countdown, not even fall through to pause/resume/start below.
    if (state === "countdown") return;
    if (state === "levelbanner" && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      dismissLevelBanner();
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      if (state === "playing" || state === "paused") togglePause();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      startOrResume();
    }
  }, { passive: false });

  // Any pointer press or touch, ANYWHERE in the document (not just the
  // board/canvas), also dismisses the opening scene straight to the menu -
  // see requestOpeningDismiss(). Registered on the initiating press event
  // (not a later "click"/"touchend") so it fires and flips `state` before
  // any trailing click/touchend for the same physical gesture can reach the
  // existing "tap to start" handlers further below - see the comment on
  // requestOpeningDismiss() and suppressTapStartOnce for why that ordering
  // matters. Both listeners are idempotent no-ops once state isn't
  // "opening" any more (requestOpeningDismiss() checks that itself), so
  // having both pointerdown and touchstart wired is harmless belt-and-
  // suspenders, not a double-fire risk.
  document.addEventListener("pointerdown", function () {
    requestOpeningDismiss();
  });
  document.addEventListener("touchstart", function () {
    requestOpeningDismiss();
  }, { passive: true });

  // ---------- touch: swipe on canvas ----------
  var touchStart = null;

  // Shared by the touchmove and touchend handlers below: if the drag from
  // `touchStart` to (x,y) crosses SWIPE_THRESHOLD, request the turn and
  // re-anchor touchStart to (x,y) so a continued drag (finger still down)
  // can chain further turns without lifting. Returns nothing useful - the
  // re-anchor IS the state change. requestTurn() already owns queueing and
  // anti-reversal, exactly as for repeated keyboard input.
  function maybeSwipeTurn(x, y) {
    if (!touchStart) return;
    var dx = x - touchStart.x;
    var dy = y - touchStart.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      requestTurn(dx > 0 ? "right" : "left");
    } else {
      requestTurn(dy > 0 ? "down" : "up");
    }
    touchStart = { x: x, y: y };
  }

  canvas.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", function (e) {
    e.preventDefault(); // block scroll/zoom even where touch-action is imperfect
    // Mobile responsiveness: recognize the swipe the moment the finger
    // crosses the threshold, DURING the drag - not only on touchend. The
    // old lift-to-turn behavior added the whole remaining finger-down time
    // as input latency on every single turn, which is the main reason
    // touch controls felt sluggish next to a keyboard's instant keydown.
    // Countdown may also buffer a swipe turn for when play starts, same
    // reasoning as the keydown handler above - maybeSwipeTurn()/requestTurn()
    // never touch `state`, so this can't shorten or skip the freeze.
    if ((state === "playing" || state === "countdown") && e.touches.length === 1) {
      maybeSwipeTurn(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  canvas.addEventListener("touchend", function (e) {
    e.preventDefault();
    if (suppressTapStartOnce) {
      // This touchend belongs to the SAME tap that just dismissed the
      // opening scene (see requestOpeningDismiss()) - consume the flag and
      // stop here instead of also starting a new game.
      suppressTapStartOnce = false;
      touchStart = null;
      return;
    }
    if (state === "menu" || state === "dead" || state === "won") {
      startOrResume();
      touchStart = null;
      return;
    }
    // Tail segment of the drag (post-last-re-anchor): still honored, so a
    // short flick that never fired during touchmove turns on release just
    // like before - touchmove recognition above is additive, not replacing.
    if (touchStart) {
      var t = e.changedTouches[0];
      maybeSwipeTurn(t.clientX, t.clientY);
    }
    touchStart = null;
  }, { passive: false });

  // block long-press context menu / selection on canvas
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  // On-screen D-pad removed per spec - touch devices are swipe-on-canvas
  // only now (see the canvas touchstart/touchmove/touchend handlers above).
  function isCoarsePointer() {
    return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  }

  // ---------- mobile-only "how to play" popup ----------
  // Shown once (localStorage-gated) the first time a coarse-pointer (touch)
  // device reaches the menu, since swipe-to-move isn't otherwise self-
  // explanatory the way visible D-pad arrows were. Icon-first/text-minimal
  // per spec. Never shown on mouse/trackpad devices.
  function maybeShowMobileHelp() {
    if (!mobileHelp) return;
    if (!isCoarsePointer()) return;
    var seen = false;
    try { seen = localStorage.getItem(MOBILE_HELP_SEEN_KEY) === "1"; } catch (e) { /* storage unavailable - fall through, show it */ }
    if (seen) return;
    mobileHelp.classList.add("show");
  }
  function dismissMobileHelp() {
    if (!mobileHelp) return;
    mobileHelp.classList.remove("show");
    try { localStorage.setItem(MOBILE_HELP_SEEN_KEY, "1"); } catch (e) { /* best-effort only */ }
  }
  if (mobileHelpClose) {
    mobileHelpClose.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dismissMobileHelp();
    });
  }
  if (mobileHelp) {
    // Tapping the dimmed backdrop also dismisses it; tapping the card itself
    // must not (stopPropagation below), so a stray tap while reading it
    // doesn't close it prematurely.
    mobileHelp.addEventListener("click", function (e) {
      if (e.target === mobileHelp) dismissMobileHelp();
    });
    var mobileHelpCardEl = document.getElementById("mobileHelpCard");
    if (mobileHelpCardEl) {
      mobileHelpCardEl.addEventListener("click", function (e) { e.stopPropagation(); });
    }
  }

  // tap board to restart/resume when overlay hidden but state not playing (defensive)
  wrap.addEventListener("click", function () {
    if (suppressTapStartOnce) {
      // This click belongs to the SAME tap/click that just dismissed the
      // opening scene (see requestOpeningDismiss()) - consume the flag and
      // stop here instead of also starting a new game.
      suppressTapStartOnce = false;
      return;
    }
    if (state === "menu" || state === "dead" || state === "won") startOrResume();
  });

  playBtn.addEventListener("click", function (e) {
    e.preventDefault();
    startOrResume();
  });

  // ---------- language toggle ----------
  if (langToggleBtn) {
    langToggleBtn.addEventListener("click", function (e) {
      e.preventDefault();
      applyLanguage(currentLang === "he" ? "en" : "he");
    });
    // The global keydown handler below (Space -> pause, Enter -> start/
    // resume) is bound on `window` and fires on ANY keypress regardless of
    // focus, including a native Space/Enter activation of this button - that
    // would pause/resume the game as an unwanted side effect of toggling the
    // language. stopPropagation() here (bubble phase, before the event
    // reaches window) isolates this button's own keyboard activation from
    // that global handler, without touching the handler itself.
    langToggleBtn.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") e.stopPropagation();
    });
  }

  // ---------- boot ----------
  loadHi();
  updateHud();
  applyLanguage(currentLang); // corrects the static pre-boot markup (loading
                               // label, mobile-help caption, meta description,
                               // HUD labels, footer) to match a previously-
                               // stored language choice before first paint

  // Coalesce resize/orientationchange bursts (e.g. iOS Safari's chrome
  // auto-hide/show firing repeated resize events) into one rAF-scheduled
  // pass.
  var resizeScheduled = false;
  function scheduleResize() {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(function () {
      resizeScheduled = false;
      resizeCanvas();
    });
  }
  window.addEventListener("resize", scheduleResize);
  window.addEventListener("orientationchange", scheduleResize);
  // iOS Safari's toolbar collapse/expand and Android Chrome's URL-bar hide
  // change the *visual* viewport without always firing a window resize (or
  // firing it with stale innerHeight on older iOS). visualViewport's own
  // resize event is the authoritative signal there; scheduleResize is
  // rAF-coalesced so the extra listener costs nothing when both fire.
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleResize);
  }

  // rAF is paused/throttled while a tab is backgrounded, so a resize that
  // fires while hidden can leave scheduleResize()'s queued rAF callback
  // sitting unresolved (resizeScheduled stays true, so a synthetic resize
  // dispatched in the meantime is silently ignored) until the tab is
  // foregrounded again. Recompute directly - bypassing the rAF gate - the
  // moment the tab becomes visible, instead of waiting on whatever resize
  // event happens to arrive next.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      resizeScheduled = false;
      resizeCanvas();
    }
  });

  // Re-check devicePixelRatio when it changes (moving a window between
  // displays with different DPR, or OS-level scale changes) - these don't
  // fire a window resize event, so without this the canvas stays blurry
  // until some unrelated resize happens.
  function watchDprChange() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia("(resolution: " + (window.devicePixelRatio || 1) + "dppx)");
    function handler() {
      scheduleResize();
      watchDprChange(); // re-subscribe at the new dpr
    }
    if (mq.addEventListener) mq.addEventListener("change", handler, { once: true });
    else if (mq.addListener) mq.addListener(handler); // older Safari fallback
  }
  watchDprChange();

  resizeCanvas();

  assetStore.preload(function () {
    // Guard rather than unconditionally reset: state can only still be
    // "loading" here in the current code (Play is disabled/no-op until this
    // fires), but this keeps a future change from silently reintroducing a
    // bug where finishing asset load stomps an already-started game back to
    // the menu and pops the overlay over live play. Goes to the "opening"
    // intro scene (Task C) rather than straight to "menu" - see
    // startOpening()/endOpening() above.
    if (state === "loading") {
      startOpening();
    }
    updateAvatarHud(); // always-visible avatar HUD: show it as soon as assets
                        // are ready, even before the first game starts
    render();
    requestAnimationFrame(frame);
  });
})();
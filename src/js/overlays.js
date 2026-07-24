  // ---------- overlay screens ----------
  // Every string below comes from S() (the current-language STRINGS entry),
  // so re-invoking whichever of these matches the current `state` is exactly
  // what applyLanguage() needs to do to re-render the visible overlay in the
  // new language, with no separate template to keep in sync.
  function showOverlayMenu() {
    overlay.classList.remove("hidden");
    // Menu-only: the banner art becomes a dimmed, aspect-preserved backdrop
    // (see #overlay.menuBanner in overlay.css) IN PLACE OF the brand-title
    // text, which the banner already carries. Every other overlay removes the
    // class so the backdrop is the start screen's alone.
    overlay.classList.add("menuBanner");
    overlay.innerHTML =
      '<div class="overlayInner menuInner">' +
      '<div class="menuLogo">DubiSnake</div>' +
      '<p class="menuTag">' + S().menuInstructions + '</p>' +
      // The how-to-play demo (icons only, language-independent; dir="ltr" pins
      // the flex-row snake against RTL reversal). Wrapped in a subtle chip so it
      // reads as one tidy "controls" hint on the redesigned start screen.
      '<div class="menuHint">' +
      '<div class="howto howtoTouch" dir="ltr" aria-hidden="true"><span class="htArrow htUp">&#8593;</span><span class="htArrow htRight">&#8594;</span><span class="htArrow htDown">&#8595;</span><span class="htArrow htLeft">&#8592;</span><span class="htSnake"><i></i><i></i><i></i></span><span class="htHand">&#128070;</span></div>' +
      '<div class="howto howtoKeys" dir="ltr" aria-hidden="true"><span class="htSnake"><i></i><i></i><i></i></span><span class="htKeys"><b class="htKey htkUp">&#8593;</b><b class="htKey htkLeft">&#8592;</b><b class="htKey htkDown">&#8595;</b><b class="htKey htkRight">&#8594;</b></span></div>' +
      '</div>' +
      // Mobile (coarse pointer) shows a "tap anywhere" hint instead of the Play
      // button - the existing tap-to-start handler already begins the game, and
      // dropping the button keeps the stack short enough to fit without scroll.
      // Hidden on desktop via CSS; the button is hidden on mobile via CSS.
      '<p class="menuTapHint">' + S().tapToPlay + '</p>' +
      '<button id="playBtn" type="button" class="menuPlay">' + S().playBtn + '</button>' +
      '</div>';
    bindPlayBtn();
  }

  function showOverlayDead() {
    overlay.classList.remove("hidden");
    overlay.classList.remove("menuBanner");
    overlay.innerHTML =
      '<div class="overlayInner">' +
      '<img class="splashPic" src="' + assetStore.src("splash") + '" alt="">' +
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
    overlay.classList.remove("menuBanner");
    overlay.innerHTML =
      '<div class="overlayInner">' +
      '<img class="splashPic" src="' + assetStore.src("splash") + '" alt="">' +
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
    overlay.classList.remove("menuBanner");
    overlay.innerHTML =
      '<div class="overlayInner">' +
      '<h1>' + S().pausedTitle + '</h1>' +
      '<p class="stat">' + S().scoreStat(score) + '</p>' +
      '<p>' + S().pausedResume + '</p>' +
      '<button id="playBtn" type="button">' + S().resumeBtn + '</button>' +
      '</div>';
    bindPlayBtn();
  }

  // Cartoony, colourful victory screen shown after clearing level 3 (state
  // "gamewon"). Unlike the other overlays it has TWO actions - Reset (restart
  // at level 1) and Keep Playing (endless mode) - so it wires its own buttons
  // via bindGameWonBtns() instead of the single-#playBtn bindPlayBtn(). The
  // confetti/crown are decorative (aria-hidden) and CSS-animated, gated behind
  // prefers-reduced-motion in the stylesheet.
  function showOverlayGameWon() {
    overlay.classList.remove("hidden");
    overlay.classList.remove("menuBanner");
    var confetti = "";
    for (var c = 0; c < 12; c++) confetti += '<span class="gwc"></span>';
    overlay.innerHTML =
      '<div class="overlayInner gameWonInner">' +
      '<div class="gwConfetti" aria-hidden="true">' + confetti + '</div>' +
      '<div class="gwCrown" aria-hidden="true">👑</div>' +
      '<h1 class="gwTitle">' + S().gameWonTitle + '</h1>' +
      '<p class="gwSub">' + S().gameWonSub + '</p>' +
      '<p class="stat">' + S().scoreStat(score) + '</p>' +
      '<p class="stat">' + S().hiStat(hi) + '</p>' +
      '<div class="gwBtns">' +
      '<button id="gwResetBtn" type="button" class="gwBtn gwBtnReset">' + S().resetBtn + '</button>' +
      '<button id="gwKeepBtn" type="button" class="gwBtn gwBtnKeep">' + S().keepPlayingBtn + '</button>' +
      '</div>' +
      '</div>';
    bindGameWonBtns();
  }

  function bindGameWonBtns() {
    var resetBtn = document.getElementById("gwResetBtn");
    var keepBtn = document.getElementById("gwKeepBtn");
    if (resetBtn) resetBtn.addEventListener("click", function (e) {
      e.preventDefault();
      resetToLevelOne();
    });
    if (keepBtn) keepBtn.addEventListener("click", function (e) {
      e.preventDefault();
      startInfinite();
    });
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
    overlay.classList.remove("menuBanner");
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

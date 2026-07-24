  // ---------- i18n: every visible string, keyed by language, switchable at
  // runtime with no page reload. The "dubisnake" brand name is intentionally
  // NOT in here - it's a proper noun/brand and stays as-is in both
  // languages, matching the existing convention for "WASD"-style keycap
  // labels elsewhere in this file (now moot, see KEY_DIR below - arrow keys
  // only, WASD removed as a movement input per spec). ----------
  var STRINGS = {
    he: {
      dir: "rtl",
      metaDescription: "Customized retro snake game.",
      scoreLabel: "ניקוד",
      levelLabel: "רמה",
      hiLabel: "שיא",
      footerHi: "השיא נשמר מקומית במכשיר",
      footerHiFail: "השיא לא נשמר הפעם (האחסון אינו זמין)",
      // Brand name gets a Hebrew form specifically in Hebrew mode (English
      // mode keeps the Latin "dubisnake" - see brandTitle below).
      brandTitle: "דוביסנייק",
      // Deliberately just the one punchy line now (was a full mechanics
      // explainer) - rendered bigger/bolder via the .tagline class, not the
      // plain #overlay p style; the controls line below is unchanged.
      menuInstructions: "אכלו את הפופקורן!",
      mobileHelpText: "החליקו כדי לזוז",
      loadingBtn: "טוען…",
      playBtn: "שחק",
      playAgainBtn: "שחק שוב",
      deadTitle: "המשחק נגמר",
      wonTitle: "ניצחת!",
      // GAME WON screen (clearing all three levels) - the celebratory
      // announcement plus its two action buttons (Reset / Keep Playing).
      gameWonTitle: "ניצחת במשחק!",
      gameWonSub: "עברת את כל שלושת השלבים!",
      resetBtn: "התחל מחדש",
      keepPlayingBtn: "המשך לשחק",
      scoreStat: function (n) { return "ניקוד: " + n; },
      hiStat: function (n) { return "שיא: " + n; },
      wonBoardFull: function (n) { return "הלוח מלא - ניקוד: " + n; },
      deadRetry: "הקישו שחק, לחצו Enter, או הקישו על הלוח כדי לנסות שוב.",
      wonRetry: "הקישו שחק, לחצו Enter, או הקישו על הלוח כדי לשחק שוב.",
      pausedTitle: "מושהה",
      pausedResume: "רווח / הקישו המשך כדי להמשיך.",
      resumeBtn: "המשך",
      levelFlashLabel: function (n) { return "רמה " + n; },
      // Retro opening-scene overlay text (Task C) - pulsing, drawn on the
      // board canvas itself (see renderPressAnyKey()), not uppercased (this
      // isn't a HUD label - see the Hebrew-not-uppercased note on hud-label
      // above, which doesn't apply here anyway since Hebrew has no case).
      pressAnyKey: "הקישו על מקש כלשהו",
      toggleLabel: "English",
      toggleAria: "Switch to English"
    },
    en: {
      dir: "ltr",
      metaDescription: "Customized retro snake game.",
      scoreLabel: "Score",
      levelLabel: "Level",
      hiLabel: "Best",
      footerHi: "High score saved locally on this device",
      footerHiFail: "High score not saved this time (storage unavailable)",
      // English keeps the Latin brand name as-is.
      brandTitle: "dubisnake",
      // Matches the simplified Hebrew tagline - see the "he" entry above.
      menuInstructions: "Eat the popcorn!",
      mobileHelpText: "Swipe to move",
      loadingBtn: "Loading…",
      playBtn: "Play",
      playAgainBtn: "Play Again",
      deadTitle: "Game Over",
      wonTitle: "You Win!",
      // GAME WON screen (clearing all three levels) - the celebratory
      // announcement plus its two action buttons (Reset / Keep Playing).
      gameWonTitle: "GAME WON!",
      gameWonSub: "You cleared all 3 levels!",
      resetBtn: "Reset",
      keepPlayingBtn: "Keep Playing",
      scoreStat: function (n) { return "Score: " + n; },
      hiStat: function (n) { return "High score: " + n; },
      wonBoardFull: function (n) { return "Board full - score: " + n; },
      deadRetry: "Tap Play, press Enter, or tap the board to try again.",
      wonRetry: "Tap Play, press Enter, or tap the board to play again.",
      pausedTitle: "Paused",
      pausedResume: "Space / tap Resume to continue.",
      resumeBtn: "Resume",
      levelFlashLabel: function (n) { return "Level " + n; },
      // Retro opening-scene overlay text (Task C) - pulsing, drawn on the
      // board canvas itself (see renderPressAnyKey()).
      pressAnyKey: "PRESS ANY KEY",
      toggleLabel: "עברית",
      toggleAria: "עבור לעברית"
    }
  };
  // Owns the current language and its persistence. Only the string TABLE
  // (STRINGS above) stays a plain data literal; the mutable "which language"
  // state and its localStorage round-trip live here.
  class I18n {
    constructor(strings, storageKey, fallbackLang) {
      this.strings = strings;
      this.storageKey = storageKey;
      this.lang = fallbackLang;
      try {
        var stored = localStorage.getItem(storageKey);
        if (this.strings[stored]) this.lang = stored;
      } catch (e) { /* private mode / storage disabled - fallback stands */ }
    }

    // The active language's string table.
    current() { return this.strings[this.lang]; }

    has(lang) { return !!this.strings[lang]; }

    // Switch language if known; returns the language now in effect.
    set(lang) {
      if (this.strings[lang]) this.lang = lang;
      return this.lang;
    }

    // Best-effort persist of the current choice (survives a reload).
    persist() {
      try {
        localStorage.setItem(this.storageKey, this.lang);
      } catch (e) { /* private mode / storage disabled - in-session switch still works */ }
    }
  }

  var i18n = new I18n(STRINGS, "dubisnake_lang", "he");

  // Stable accessor used throughout the game for the active string table.
  function S() { return i18n.current(); }

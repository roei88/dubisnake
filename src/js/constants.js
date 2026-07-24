  // ---------- constants ----------
  // GRID_N was 19 (720px board => ~38px cells), then cut to 13 (~55px cells)
  // for readability. Per the Product-approved grid/avatar/palette spec, it is
  // now cut again to 9: a ~30.8% reduction from 13 (the closest odd integer
  // to the requested ~35%; 8 would be 38.5% but breaks the odd/center-cell
  // invariant this comment is about). It's odd so Math.floor(GRID_N/2) still
  // gives a true center cell for the snake's start position (unchanged spawn
  // logic), and on the same 720px board it gives ~80px cells - large, clearly
  // readable head/body circles, at the cost of a smaller grid to navigate.
  var GRID_N = 9;                 // fixed logical grid, both axes
  // Per-stage accent, cycling by level (1/2/3): dark green / yellow / red.
  // Drives the avatar ring and the PRESS ANY KEY text. Glow variants are the
  // same hues at low alpha for the avatar box-shadow.
  var STAGE_COLORS = ["#1e7d32", "#b8860b", "#a51e1e"];
  var STAGE_GLOW = ["rgba(30,125,50,0.4)", "rgba(184,134,11,0.4)", "rgba(165,30,30,0.4)"];
  // Endpoints scaled twice on request: first by 1.3x (160->208, 70->91) for
  // the "30% slower" pass, then doubled (208->416, 91->182) for the "50%
  // slower" pass - halving speed means doubling the per-cell interval.
  // STEP_DECAY (the relative per-level ramp) stays untouched both times:
  // it's a ratio, not an absolute speed, so scaling only the endpoints
  // already slows every level in the curve by the same proportion.
  var BASE_STEP_MS = 416;         // level 1 step interval
  var MIN_STEP_MS = 182;          // floor
  var STEP_DECAY = 0.92;          // ~8% faster per level
  var POPCORN_PER_LEVEL = 5;
  // Chasers move at a fraction of the snake's step rate rather than a fixed
  // "every Nth step" toggle, so the cadence is tunable to non-integer ratios.
  // 0.5 (the old chaserTick 0/1 toggle) was "every 2 steps"; 0.4 is one
  // chaser move per 2.5 snake steps - 20% fewer chaser moves - per the
  // level-flow rework (small board = chasers too close to react to).
  var CHASER_MOVE_RATE = 0.4;     // chaser moves per snake step
  var COUNTDOWN_MS = 3000;        // "get ready" freeze before each level's play
  // Endless "Keep Playing" pace after clearing level 3. Deliberately SLOWER
  // (larger interval) than any real level - level 3 lands at BASE*0.92^2 ~=
  // 352ms, so 470ms is an eased, FIXED cadence (no further decay in infinite
  // mode) because a long snake plus three chasers is already hard; the point
  // of endless mode is "manageable victory lap", not another speed ramp.
  var INFINITE_STEP_MS = 470;     // endless-mode step interval (fixed, slower than level 1's 416)
  var SWIPE_THRESHOLD = 35;       // px
  var HI_KEY = "dubisnake_hi";

  var DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  // ---------- DOM ----------
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var wrap = document.getElementById("wrap");
  var boardWrapEl = document.getElementById("boardWrap");
  var hudScore = document.getElementById("scoreVal");
  var hudLevel = document.getElementById("levelVal");
  var hudHi = document.getElementById("hiVal");
  var scoreBarFill = document.getElementById("scoreBarFill");
  var levelPip1 = document.getElementById("levelPip1");
  var levelPip2 = document.getElementById("levelPip2");
  var levelPip3 = document.getElementById("levelPip3");
  var avatarHudImg = document.getElementById("avatarHudImg");
  var overlay = document.getElementById("overlay");
  var playBtn = document.getElementById("playBtn");
  var levelFlash = document.getElementById("levelFlash");
  var levelFlashCard = document.getElementById("levelFlashCard");
  var levelFlashTitle = document.getElementById("levelFlashTitle");
  var levelMonsters = document.getElementById("levelMonsters");
  var levelOkBtn = document.getElementById("levelOkBtn");
  var langToggleBtn = document.getElementById("langToggle");
  var scoreLabelEl = document.getElementById("scoreLabel");
  var levelLabelEl = document.getElementById("levelLabel");
  var hiLabelEl = document.getElementById("hiLabel");
  var mobileHelp = document.getElementById("mobileHelp");
  var mobileHelpText = document.getElementById("mobileHelpText");
  var mobileHelpClose = document.getElementById("mobileHelpClose");
  var MOBILE_HELP_SEEN_KEY = "dubisnake_mobilehelp_seen";

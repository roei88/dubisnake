  // ---------- image preload with colored-circle fallback ----------
  // No getImageData is used anywhere so this stays file:// safe.
  var ASSET_LIST = [
    { key: "head1", src: "./assets/head-1.png", fallback: "#e0a458" },
    { key: "head2", src: "./assets/head-2.png", fallback: "#c97b63" },
    { key: "head3", src: "./assets/head-3.png", fallback: "#a56a9e" },
    { key: "food", src: "./assets/food.png", fallback: "#ffd166" },
    { key: "splash", src: "./assets/splash.png", fallback: "#ffcf6b" },
    { key: "ghost1", src: "./assets/ghost-1.png", fallback: "#ff4b3a" },
    { key: "ghost2", src: "./assets/ghost-2.png", fallback: "#ff7bd5" },
    { key: "ghost3", src: "./assets/ghost-3.png", fallback: "#3ed6e0" }
  ];
  // Loads the image set and keeps a colored-circle canvas fallback per key,
  // so a failed / absent / stalled image can never blank a sprite or hang
  // the game. Access loaded state only through image()/drawable()/src().
  class AssetStore {
    constructor(list) {
      this.list = list;
      this.images = {};    // key -> HTMLImageElement (only if it loaded ok)
      this.fallbacks = {}; // key -> canvas, used when the image failed/absent
      this._ready = 0;
      this._total = list.length;
    }

    _fallbackCanvas(color) {
      var c = document.createElement("canvas");
      c.width = 64; c.height = 64;
      var cx = c.getContext("2d");
      cx.beginPath();
      cx.arc(32, 32, 30, 0, Math.PI * 2);
      cx.fillStyle = color;
      cx.fill();
      return c;
    }

    // A stalled request (neither load nor error ever fires - flaky mobile
    // networks do this) must not be able to hang the game forever: the rAF
    // loop only starts after all list entries "settle", so one dead request
    // would otherwise mean _ready never reaches _total, done() never runs,
    // and the board never starts moving even after the static Play button is
    // tapped. Give every image a hard deadline and fall back to the
    // colored-circle canvas if it hasn't settled by then.
    preload(done) {
      var self = this;
      this.list.forEach(function (a) {
        var img = new Image();
        var settled = false;
        var timeoutId = setTimeout(function () {
          self.fallbacks[a.key] = self._fallbackCanvas(a.fallback);
          finish();
        }, AssetStore.TIMEOUT_MS);
        function finish() {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          self._ready++;
          if (self._ready >= self._total) done();
        }
        img.onload = function () {
          // guard against a 200-response truncated/corrupt/zero-byte image:
          // onload can fire before naturalWidth is meaningful in some engines,
          // so only accept it as "loaded" when it actually has pixels.
          if (img.naturalWidth > 0) {
            self.images[a.key] = img;
          } else {
            self.fallbacks[a.key] = self._fallbackCanvas(a.fallback);
          }
          finish();
        };
        img.onerror = function () {
          self.fallbacks[a.key] = self._fallbackCanvas(a.fallback);
          finish();
        };
        img.src = a.src;
      });
    }

    // The loaded <img> for a key, or null - use where a REAL image is
    // required and the fallback circle is drawn some other way.
    image(key) {
      return this.images[key] || null;
    }

    // The image if loaded, else the colored-circle fallback canvas. Both are
    // valid CanvasRenderingContext2D.drawImage() sources.
    drawable(key) {
      return this.images[key] || this.fallbacks[key];
    }

    // A usable <img>-src string for a key: the real image src, else the
    // fallback canvas as a data URL, else a 1x1 transparent GIF so an
    // <img src> is never set to "" (which some browsers/embedders re-request
    // as the current document). Used for splash/level-banner/avatar <img>s.
    src(key) {
      if (this.images[key]) return this.images[key].src;
      if (this.fallbacks[key]) return this.fallbacks[key].toDataURL();
      return AssetStore.BLANK_PIXEL_SRC;
    }
  }
  AssetStore.TIMEOUT_MS = 4000;
  AssetStore.BLANK_PIXEL_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

  var assetStore = new AssetStore(ASSET_LIST);

  // ---------- head cycle / per-level body tint (predefined, no getImageData) ----------
  var HEAD_KEYS = ["head1", "head2", "head3"];
  // Per-level tint pool, cycles with the heads. Per the grid/avatar/palette
  // spec, this is no longer a warm amber cluster (~20-25deg hue spread) - it's
  // three genuinely varied hues (green ~140deg, blue ~220deg, magenta ~330deg)
  // deliberately kept clear of the HUD accent cyan (~190deg, see #hud span b
  // and the avatar ring in CSS) so "stable UI chrome" (HUD/avatar) and
  // "per-level game state" (these tints) never share a color.
  var LEVEL_TINTS = [
    { core: "#00e676", edge: "#00693e" }, // vivid green
    { core: "#2979ff", edge: "#0d3f9e" }, // electric blue
    { core: "#ff3d81", edge: "#8f0046" }  // hot magenta
  ];
  // Ghost idle animation (Task A - port of new-assets/animations/solo-scenes.jsx):
  // each chaser floats/rotates/pulses/glows on its own phase, as a purely
  // visual sub-cell offset applied only at draw time in render(). Nothing
  // here ever touches ch.x/ch.y - chaserAt() and every hit test keep reading
  // the plain integer grid cell.
  // Raw dx/dy amplitudes below are ported verbatim from the reference, which
  // was tuned against a GS=130px sprite box on a 2.5s loop; they're rescaled
  // by (in-game ghost size / GS) at draw time so they read as sub-cell drift,
  // never raw pixels.
  var GHOST_IDLE_GS = 130;
  var GHOST_IDLE_PERIOD_MS = 2500;
  var GHOST_IDLE_TAU = Math.PI * 2;
  var GHOST_IDLE = [
    { // 1 Curly - blue
      color: "#4a9eff",
      glowBase: 0.30,
      // QA fix: writes onto the caller-supplied scratch object instead of
      // returning a new object literal, so render()'s per-frame ghost loop
      // (up to 3 ghosts * ~60fps) does no per-frame allocation - see
      // GHOST_IDLE_SCRATCH below.
      motion: function (a, b, out) {
        out.dx = Math.sin(a) * 30;
        out.dy = -Math.cos(a) * 20;
        out.rot = Math.sin(a) * 6;
        out.scaleOsc = Math.sin(b) * 0.05;
        out.glow = 0.30 + Math.sin(a) * 0.25;
        return out;
      }
    },
    { // 2 Smokey - red
      color: "#ff4444",
      glowBase: 0.30,
      motion: function (a, b, out) {
        out.dx = Math.sin(a) * 25;
        out.dy = Math.sin(b) * 22;
        out.rot = Math.sin(a) * 4;
        out.scaleOsc = Math.sin(a) * 0.06;
        out.glow = 0.30 + Math.cos(a) * 0.25;
        return out;
      }
    },
    { // 3 Screamer - green
      color: "#00e5a0",
      glowBase: 0.35,
      motion: function (a, b, out) {
        out.dx = Math.sin(b) * 20;
        out.dy = -Math.cos(a) * 25;
        out.rot = Math.sin(b) * 8;
        out.scaleOsc = Math.sin(b) * 0.07;
        out.glow = 0.35 + Math.sin(b) * 0.30;
        return out;
      }
    }
  ];
  // Pre-allocated scratch objects for GHOST_IDLE[*].motion() output, one per
  // ghost slot (index = chaser index % 3). renderOpeningReady() and the main
  // chasers-render loop in render() never run in the same frame (opening vs
  // playing are mutually exclusive states), so sharing one pool across both
  // call sites is safe and avoids a second allocation site.
  var GHOST_IDLE_SCRATCH = [
    { dx: 0, dy: 0, rot: 0, scaleOsc: 0, glow: 0 },
    { dx: 0, dy: 0, rot: 0, scaleOsc: 0, glow: 0 },
    { dx: 0, dy: 0, rot: 0, scaleOsc: 0, glow: 0 }
  ];
  // Cached once at load, same convention as the CSS prefers-reduced-motion
  // rule elsewhere in this file: motion-sensitive users get idle ghosts held
  // still, glow parked at its non-pulsing baseline.
  var GHOST_IDLE_STILL = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // Same boot-time prefers-reduced-motion check, reused by the opening intro
  // scene (Task C) below - one flag, one convention, file-wide.
  var OPENING_STILL = GHOST_IDLE_STILL;
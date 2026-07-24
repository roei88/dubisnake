  // ===== animation: ghost idle float/rotate/pulse/glow =====
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

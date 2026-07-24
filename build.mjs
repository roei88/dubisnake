#!/usr/bin/env node
/*
 * dubisnake build - zero dependencies (Node's fs only, no npm packages).
 *
 * Assembles the split source under ./src into the single self-contained
 * ./index.html that GitHub Pages serves and that also runs from file://.
 * The game must ship as one inlined file (no runtime module loading, locked
 * CSP), while the SOURCE stays split for maintainability. Edit files under
 * ./src, never index.html.
 *
 *   src/index.template.html  - page shell. Contains:
 *                                <!--INCLUDE:html/<name>--> markup partials,
 *                                /*BUILD:STYLES*​/  where the CSS is inlined,
 *                                /*BUILD:SCRIPT*​/  where the JS is inlined.
 *   src/html/*.html          - markup partials, spliced in at their INCLUDE marker
 *   src/css/*.css            - CSS, concatenated (CSS_FILES order) into <style>
 *   src/js/*.js              - JS, concatenated (JS_FILES order) into <script>
 *
 * Concatenation order is explicit (not a glob) so cascade order (CSS) and
 * dependency order (JS) are never at the mercy of filename sorting.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');

// CSS files, in cascade order (base -> frame -> components -> chrome).
const CSS_FILES = [
  'css/base.css',          // reset, html/body, page wallpaper
  'css/frame.css',         // #wrap phone frame + speaker grille
  'css/hud.css',           // score header: stats, bars, pips, avatar
  'css/board.css',         // #boardWrap, 3D bezel, canvas
  'css/overlay.css',       // menu/dead/won/paused overlay + tagline
  'css/tutorial.css',      // .howto swipe + keyboard tutorials
  'css/buttons.css',       // #playBtn
  'css/level-banner.css',  // retro LEVEL n banner card
  'css/footer.css',        // #footer
  'css/lang-toggle.css',   // #langToggle
  'css/mobile-help.css',   // #mobileHelp popup
];

// JS files, in load order. `_open.js` opens the shared IIFE (first) and
// `_boot.js` closes it and runs boot (last).
const JS_FILES = [
  'js/_open.js',       // IIFE open + "use strict"
  'js/constants.js',   // grid/speed/color constants, DOM element refs
  'js/strings.js',     // i18n STRINGS (he/en) + S()
  'js/assets.js',      // AssetStore class + instance, head cycle / level tint
  'js/layout.js',      // responsive board sizing (measureReservePx/resizeCanvas)
  'js/core.js',        // game state, newGame/positionForLevel/step/levelUp/die/win, language switch, input
  'js/overlays.js',    // overlay screens (menu/dead/won/paused/banner/countdown) + opening intro
  'js/render.js',      // canvas rendering + fixed-timestep rAF loop
  'js/_boot.js',       // keyboard/touch/mobile-help/lang-toggle handlers, boot, IIFE close
];

const STYLES_MARKER = '/*BUILD:STYLES*/';
const SCRIPT_MARKER = '/*BUILD:SCRIPT*/';
const INCLUDE_RE = /<!--INCLUDE:([^>]+?)-->/g;
const GENERATED_BANNER =
  '<!-- GENERATED FILE - do not edit directly. Edit the sources under ./src\n' +
  '     and run `node build.mjs` to regenerate. See build.mjs for details. -->\n';

function readParts(files) {
  return files.map((f) => readFileSync(join(SRC, f), 'utf8')).join('\n');
}

function main() {
  let template = readFileSync(join(SRC, 'index.template.html'), 'utf8');

  // 1. Resolve markup partials (<!--INCLUDE:html/x.html-->).
  template = template.replace(INCLUDE_RE, (_m, rel) => {
    try {
      return readFileSync(join(SRC, rel.trim()), 'utf8');
    } catch (e) {
      return fail('missing include: ' + rel.trim());
    }
  });

  if (!template.includes(STYLES_MARKER)) fail('template missing ' + STYLES_MARKER);
  if (!template.includes(SCRIPT_MARKER)) fail('template missing ' + SCRIPT_MARKER);

  const css = readParts(CSS_FILES);
  const js = readParts(JS_FILES);

  // 2. Inline CSS and JS. Replacer functions so `$` in css/js is never
  //    interpreted as a String.replace special pattern.
  let out = template
    .replace(STYLES_MARKER, () => css)
    .replace(SCRIPT_MARKER, () => js);

  // 3. "Generated" banner right after the doctype line.
  out = out.replace(/^(<!doctype html>\n)/i, (_m, d) => d + GENERATED_BANNER);

  writeFileSync(join(ROOT, 'index.html'), out);
  console.log(
    'Built index.html  (' + CSS_FILES.length + ' css, ' + JS_FILES.length +
    ' js files; ' + css.length + ' css bytes, ' + js.length + ' js bytes)'
  );
}

function fail(msg) {
  console.error('build.mjs: ' + msg);
  process.exit(1);
}

main();

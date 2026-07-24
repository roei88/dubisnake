#!/usr/bin/env node
/*
 * dubisnake build - zero dependencies (Node's fs only, no npm packages).
 *
 * Assembles the split source under ./src into the single self-contained
 * ./index.html that GitHub Pages serves and that also runs from file://.
 * This is a deliberate design choice: the game must ship as one inlined
 * file (no runtime module loading, locked CSP), while the SOURCE stays
 * split for maintainability. Edit files under ./src, never index.html.
 *
 *   src/index.template.html  - the page shell, with two markers:
 *                              /*BUILD:STYLES*​/  and  /*BUILD:SCRIPT*​/
 *   src/styles.css           - all CSS, inlined into <style>
 *   src/js/*.js              - JS, concatenated in the order listed in
 *                              JS_FILES below and inlined into <script>
 *
 * The concatenation order is explicit (not a glob) so dependency order is
 * never at the mercy of filename sorting.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');

// Explicit concatenation order. Add new files here in dependency order.
// Concatenation order. `_open.js` opens the shared IIFE and must come first;
// `_boot.js` closes it and runs boot, so it must come last (the leading
// underscore flags these two wrapper files). The middle files are grouped by
// concern. This explicit order is an interim step - the OOP pass moves the
// IIFE wrapper into the template and the boot into a single entry class so
// the middle files become order-independent.
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
const GENERATED_BANNER =
  '<!-- GENERATED FILE - do not edit directly. Edit the sources under ./src\n' +
  '     and run `node build.mjs` to regenerate. See build.mjs for details. -->\n';

function main() {
  const template = readFileSync(join(SRC, 'index.template.html'), 'utf8');
  const css = readFileSync(join(SRC, 'styles.css'), 'utf8');
  const js = JS_FILES
    .map((f) => readFileSync(join(SRC, f), 'utf8'))
    .join('\n');

  if (!template.includes(STYLES_MARKER)) fail('template missing ' + STYLES_MARKER);
  if (!template.includes(SCRIPT_MARKER)) fail('template missing ' + SCRIPT_MARKER);

  // Use replacer functions so `$` sequences in css/js are never interpreted
  // as String.replace special patterns.
  let out = template
    .replace(STYLES_MARKER, () => css)
    .replace(SCRIPT_MARKER, () => js);

  // Insert the "generated" banner right after the doctype line.
  out = out.replace(/^(<!doctype html>\n)/i, (_m, d) => d + GENERATED_BANNER);

  writeFileSync(join(ROOT, 'index.html'), out);
  console.log(
    'Built index.html  (' + JS_FILES.length + ' js file(s), ' +
    css.length + ' css bytes, ' + js.length + ' js bytes)'
  );
}

function fail(msg) {
  console.error('build.mjs: ' + msg);
  process.exit(1);
}

main();

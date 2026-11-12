---
id: release-main-red-title-motion-fade
title: "The title-motion browser check reads the crossfade after it has cleared (fading in (0)), since the title's one-fade change"
area: release
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/red-main-title-motion-fade
pr:
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (merger codex-4629 and the CTO on #8928)
---

**What.** `node src/bench/title-motion.browser.mjs` fails at line 64, "fading in (0)", on clean main fd590ccd and ba2fbed0, against a fresh bench, every run. The title screen itself rotates and fades as it should. Guards: the check that the title painting drifts and the next national scene fades in keeps running.

**Cause.** Found in code: since 2d44c0d912 (Nov 8, "the title changes its painting with one fade") `rotateTitle` in src/bench/play.mjs clears the top layer 3.1 seconds after its fade begins. The rotation's interval starts when `/api/title` answers, while the check (unchanged since Oct 27) samples the top layer at a fixed delay from its own start, about four seconds later, so it lands after the clear and reads opacity 0.

**Fix.** Check only, no assertion changed: wait for the fade itself to start (the `fading` class on `#backdrop-next`), within one interval plus ten seconds, then sample it 800 ms in.

**Time box.** 0.5 hours

**Rules.** Replace, never layer: the fixed delay is replaced by the wait, with no second timer left beside it. No assertion is loosened; the wait is bounded and fails by name.

**Done when.** A second session runs the check against a fresh bench on main in the drawn place the title shows (no place is drawn; the title names its scene) three times and each prints "title motion: ok".

**Waits on.** Nothing.

**Files.** src/bench/title-motion.browser.mjs

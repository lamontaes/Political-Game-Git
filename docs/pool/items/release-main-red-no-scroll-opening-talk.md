---
id: release-main-red-no-scroll-opening-talk
title: "The no-scroll browser check waits forever for Day while the first evening's scene is open"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-no-scroll-opening-talk
pr: 8952
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (merger codex-4629 and the CTO on #8928)
---

**What.** `node src/bench/no-scroll.browser.mjs` times out clicking `#day` after the ten start sheets, on clean main 9e12fb1c and 7367b960, in every new life drawn: Gove City, Kansas; Alpine Northeast, Wyoming; Stratton Mountain, Vermont; Washington, District of Columbia. A merge desk running the browser checks of a screens pull request sees it every time. Guards: the check that no sheet scrolls the page keeps running after a day.

**Cause.** Measured: Washington, District of Columbia (UI seed fae3836a-7730-4038-8035-7e0183c6fdee), with `node src/bench/no-scroll.browser.mjs` instrumented at the click: the talk box is open with the first evening's scene ("Late on January 20th, you stay in." and Continue), and the card's time controls, `#day` among them, are hidden while a scene is open, by design. A new life opens on that scene since #8893 (Nov 12). The check never goes through a scene, unlike `bill-stage.browser.mjs`, which clicks a reply, Continue or Leave until the controls return.

**Fix.** Check only, no assertion changed: before it measures and before it plays the first day, the check goes through any open scene the way a player does (a reply, Continue or Leave, up to 40 steps, until Day shows), failing by name if a scene never closes.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: the check keeps making a new life in a drawn place and goes through whatever scene opens there. No assertion is loosened.

**Done when.** A second session runs the check against a fresh bench on main three times, each in the drawn place the new life names, and each prints "PASS 10 sheets, twice".

**Waits on.** Nothing.

**Files.** src/bench/no-scroll.browser.mjs

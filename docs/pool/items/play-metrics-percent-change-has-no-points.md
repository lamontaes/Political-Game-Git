---
id: play-metrics-percent-change-has-no-points
title: "Metrics shows a rate's change as a bare number: 'up 0.3 since last year' under a percent"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: found by opus-5234 on Nov 11, 2026, by src/bench/plain-text.browser.mjs once it reached its text checks (item tests-plain-text-no-travel-filing-place, PR 8795)
---

**What.** The Politics sheet's Metrics tab prints a rate's change from last year with no unit: "Last year 4.1 % · up 0.3 since last year" (Junction City, Georgia, place key 1342800, seed a3b686cb-ba71-4137-957b-a2e414912b99; Our Town, Alabama, seed 758917a3-4c49-47d0-ad2e-359e642c1769). A player cannot tell whether 0.3 is points or percent, and the plain-text check flags it as a bare fraction. Seen: the change reads "up 0.3 points since last year" for a rate.

**Cause.** Found in code: src/bench/play.mjs around line 3656, the Metrics row's change is `Math.abs(moved).toFixed(1)` for every unit that is not dollars, money or a count, so a percent row gets the bare number; src/bench/data/controls.json (the metrics words around line 1068) has `percent` ("%") but no word for points.

**Fix.** Add a `points` word to the metrics words in src/bench/data/controls.json ("points") and, in play.mjs, write a percent row's change as the number and that word ("0.3 points"). Change nothing else on the screen.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the word comes from controls.json, not the code. Player screen text: a figure the player reads carries its unit.

**Done when.** `node src/bench/plain-text.browser.mjs` on a fresh bench in a drawn place (place and seed named) reports no "bare fraction" on Politics Metrics, and a second session opens Politics, Metrics in the running game at 1440x900 in a drawn place and sees a rate's line read "up 0.3 points since last year" or the like, in a screenshot.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/data/controls.json

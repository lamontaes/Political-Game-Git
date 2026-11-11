---
id: tests-election-browser-checks-red-on-main
title: "The polling and election-day browser checks are red on clean main before the ballot"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: opus
effort: high
root: none
checked: fable 2026-11-10
---

**What.** Both election browser checks fail on clean main (Oct 28, 18:00 UTC) before they reach the ballot. src/bench/polling.browser.mjs with BENCH_SEED=poll-25-a times out clicking the party sheet's Join Republican button, which is found but never visible. src/bench/election-day.browser.mjs with EDAY_SEED=1793207574936 (Livermore Falls, Maine, race contest:seat:gus2025:105833:board:0:2026-11-03) times out waiting for the election-morning panel after the calendar skip and twelve Day clicks. The unit test src/bench/election-day.test.ts reaches the same morning through the bench player, so the break is in the screens or the checks' drive, not the voting engine.

**Cause.** Needs cause. Looked at the two checks named in the item: the element that hides Join Republican and the step that keeps the election-morning panel from showing were not identified, and neither check was re-run.

**Fix.** None until the cause is found.

**Time box.** 4 hours to find what hides the button and the panel.

**Rules.** Play first: the owner's path to the ballot is checked in the browser, so a red check is a stop on the golden path that must be fixed at its cause, never by loosening the check. One rule, all 56 places: both checks pass on the two named seeds and on a fresh draw each, so no fix names a place. Ask why: the PR names the element that hides Join Republican and the step that keeps the panel from showing.

**Done when.** A second session runs both browser checks on a bench from main with the two named seeds and with one fresh draw each and sees every run pass, with the seeds and drawn places named in the PR and a screenshot of the ballot from each run. The element that hid Join Republican and the step that kept the election-morning panel from showing are named by file and line.

**Waits on.** Nothing.

**Files.** src/bench/polling.browser.mjs, src/bench/election-day.browser.mjs, src/bench/play.mjs

**Notes.** Found by wire-elections-and-campaigns while checking line 25 (one polling-place path); the same failures reproduce on a bench from clean main. lead: play-first.

**Notes (re-run, 2026-11-10, main b4422d346c).** Both checks need `node --import tsx` (without it they stop on `Cannot find module '/home/user/Political-Game-Git/src/core2/places' imported from scripts/core2-year/place.ts`). `BENCH_SEED=poll-25-a node --import tsx src/bench/polling.browser.mjs`: red, at a different step from the item's. As printed: `AssertionError [ERR_ASSERTION]: no drawn town had a parties module in 6 draws` at src/bench/polling.browser.mjs:140. `EDAY_SEED=1793207574936 node --import tsx src/bench/election-day.browser.mjs` (the seed drew Alexandria, Indiana, 1800910, not Livermore Falls): red, at a different step. As printed: `locator.waitFor: Timeout 300000ms exceeded. waiting for locator('#returns:not([hidden])') to be visible` at src/bench/election-day.browser.mjs:276. Still red.

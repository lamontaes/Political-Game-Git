---
id: tests-election-browser-checks-red-on-main
title: "The polling and election-day browser checks are red on clean main before the ballot"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-tests-election-browser-checks-red-on-main
pr: #8815
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T08:33:53.747Z
---

**What.** Both election browser checks fail on clean main (Oct 28, 18:00 UTC) before they reach the ballot. src/bench/polling.browser.mjs with BENCH_SEED=poll-25-a times out clicking the party sheet's Join Republican button, which is found but never visible. src/bench/election-day.browser.mjs with EDAY_SEED=1793207574936 (Livermore Falls, Maine, race contest:seat:gus2025:105833:board:0:2026-11-03) times out waiting for the election-morning panel after the calendar skip and twelve Day clicks. The unit test src/bench/election-day.test.ts reaches the same morning through the bench player, so the break is in the screens or the checks' drive, not the voting engine.

**Cause.** Found in code: both checks drive screens that have moved; the game reaches the ballot and the morning. 1. src/bench/polling.browser.mjs (line 117) clicks the Politics ring and scans `#sheet-body` for a button reading Join. The Politics ring opens the Government tab (src/bench/play.mjs `openSheet`, line 5245: `if (tab === "politics") tab = "government"`), and joining a party lives on the Parties tab of that menu, one party's page at a time (`partyPage`, line 4991, with `partyRows`' Join button, line 1634). So no Join is found in any draw: 'no drawn town had a parties module in 6 draws' (line 140, Nov 10 re-run). 2. src/bench/election-day.browser.mjs (lines 257 to 270), playing on to election night, presses `#talk-leave`, the card's `#continue` or Day, but not a narration's own Continue (`#talk-next`). Measured on main 9ebd554b (EDAY_SEED=1793207574936: Alexandria, Indiana, 1800910, place seed d9138ed1…, the council race of 2025-11-04): the morning and the canvass played, then the screen stayed on a narration ('Late in the morning on November 4th, you go over to see Kimberly Fuller.' with only Continue) until the 300-second wait for `#returns` ran out (screenshot eday-stuck-before-returns).

**Fix.** 1. In src/bench/polling.browser.mjs, after opening the Politics ring, click the Parties tab in `#sheet-tabs` (its label is `controls.titles.parties`; select the tab button whose `key` is parties), then visit each party page tab and look for its Join button there; keep the rest of the check. 2. In src/bench/election-day.browser.mjs, add `#talk-next` (and `#talk-skip`) to the exits both of its loops press (lines 157 and 257), before `#continue` and Day, as office-hours.browser.mjs's `leaveScenes` already does. No game code changes.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Play first: the owner's path to the ballot is checked in the browser, so a red check is a stop on the golden path that must be fixed at its cause, never by loosening the check. One rule, all 56 places: both checks pass on the two named seeds and on a fresh draw each, so no fix names a place. Ask why: the PR names the element that hides Join Republican and the step that keeps the panel from showing.

**Done when.** A second session runs both browser checks on a bench from main with the two named seeds and with one fresh draw each and sees every run pass, with the seeds and drawn places named in the PR and a screenshot of the ballot from each run. The element that hid Join Republican and the step that kept the election-morning panel from showing are named by file and line.

**Waits on.** Nothing.

**Files.** src/bench/polling.browser.mjs, src/bench/election-day.browser.mjs, src/bench/play.mjs

**Notes.** Found by wire-elections-and-campaigns while checking line 25 (one polling-place path); the same failures reproduce on a bench from clean main. lead: play-first.

**Notes (re-run, 2026-11-10, main b4422d346c).** Both checks need `node --import tsx` (without it they stop on `Cannot find module '/home/user/Political-Game-Git/src/core2/places' imported from scripts/core2-year/place.ts`). `BENCH_SEED=poll-25-a node --import tsx src/bench/polling.browser.mjs`: red, at a different step from the item's. As printed: `AssertionError [ERR_ASSERTION]: no drawn town had a parties module in 6 draws` at src/bench/polling.browser.mjs:140. `EDAY_SEED=1793207574936 node --import tsx src/bench/election-day.browser.mjs` (the seed drew Alexandria, Indiana, 1800910, not Livermore Falls): red, at a different step. As printed: `locator.waitFor: Timeout 300000ms exceeded. waiting for locator('#returns:not([hidden])') to be visible` at src/bench/election-day.browser.mjs:276. Still red.

Cause found (Nov 11, 2026, cause finder for Fable B): ran election-day.browser.mjs on a fresh bench on main 9ebd554b with EDAY_SHOTS; the last screenshot shows the narration with only Continue. Read polling.browser.mjs against play.mjs's menu groups for the Join button. The polling check was not rerun; its Nov 10 failure line and the code agree.

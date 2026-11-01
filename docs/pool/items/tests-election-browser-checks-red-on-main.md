---
id: tests-election-browser-checks-red-on-main
title: "The polling and election-day browser checks are red on clean main before the ballot"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Both election browser checks fail on clean main (Oct 28, 18:00 UTC) before they reach the ballot. src/bench/polling.browser.mjs with BENCH_SEED=poll-25-a times out clicking the party sheet's Join Republican button, which is found but never visible. src/bench/election-day.browser.mjs with EDAY_SEED=1793207574936 (Livermore Falls, Maine, race contest:seat:gus2025:105833:board:0:2026-11-03) times out waiting for the election-morning panel after the calendar skip and twelve Day clicks. The unit test src/bench/election-day.test.ts reaches the same morning through the bench player, so the break is in the screens or the checks' drive, not the voting engine.

**Rules.** Play first: the owner's path to the ballot is checked in the browser, so a red check is a stop on the golden path that must be fixed at its cause, never by loosening the check. One rule, all 56 places: both checks pass on the two named seeds and on a fresh draw each, so no fix names a place. Ask why: the PR names the element that hides Join Republican and the step that keeps the election-morning panel from showing.

**Done when.** Both browser checks pass on a bench from main with the two named seeds and with one fresh draw each, the run seeds and places named in the PR, and a screenshot of the ballot from each run.

**Files.** src/bench/polling.browser.mjs,src/bench/election-day.browser.mjs,src/bench/play.mjs

**Notes.** Found by wire-elections-and-campaigns while checking line 25 (one polling-place path); the same failures reproduce on a bench from clean main. lead: play-first.

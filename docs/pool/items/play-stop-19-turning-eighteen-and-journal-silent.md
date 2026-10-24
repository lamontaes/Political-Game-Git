---
id: play-stop-19-turning-eighteen-and-journal-silent
title: "Turning 18 passes with nothing on screen, and the journal stays empty for three weeks"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: m0-m2, words
milestone: play-first
---

**What.** I started at 17 with a February 3 birthday on the v0.22.10 release. The calendar's Coming up lists three family birthdays but not mine. Pressing Week across February 3 showed nothing; only Who you are changed to "Age 18". The Journal stayed blank from January 20 until the day after I filed, when it said "I ran for Council member." (past tense, 21 months before the election). I expected my 18th birthday to be a moment (I can vote and run now) and the journal to record my first weeks.

**Rules.** This is a game, not a spreadsheet: turning 18 is golden-path step 1 and the player should see it. No hand-written player text: the birthday moment and journal lines come from the director and the English engine.

**Done when.** The owner does the same steps on the next build and is not stopped: a life started at 17 shows its own 18th birthday under Coming up, marks the day with a scene or journal line, and the filing journal line says the player filed, in the present. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/calendar.ts, src/director/journal.ts, src/bench/story.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:56, 16:02, 16:03, 16:05; screenshots 19, 40, 41, 42, 52. Lead: m0-m2 (calendar and birthday screen); words (journal lines) (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).

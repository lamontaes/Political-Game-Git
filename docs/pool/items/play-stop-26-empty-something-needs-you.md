---
id: play-stop-26-empty-something-needs-you
title: "SOMETHING NEEDS YOU appears with an empty box and nothing to answer"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
milestone: play-first
---

**What.** On the v0.22.10 release the game stopped me with SOMETHING NEEDS YOU on July 1, September 10, November 10, 17, 19 and 25, and December 8, 2026. Each time Day and Week were grayed and the talk box was empty (no name, no line, only Mark gap, Say nothing and Leave) or missing. Continue moved on most times; on December 14 it did not (see play-stop-23-job-offer-hold-locks-the-game). I could not tell who or what needed me.

**Rules.** This is a game, not a spreadsheet: a stop that holds the player must say what it is. No hand-written player text: the stop's line comes from the English engine from the module's reason.

**Done when.** The owner does the same steps on the next build and is not stopped: every SOMETHING NEEDS YOU in the first two years of a drawn life names what needs the player and offers a way to answer it. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/play.mjs, src/bench/handler.ts, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:25, 16:27, 16:34; screenshots 65, 83-dec-needs-2 to 6. Lead: m0-m2 (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).

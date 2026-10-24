---
id: play-stop-16-identical-council-seat-choices
title: "The city secretary offers five identical 'run for Council member' lines"
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

**What.** At the city secretary on the v0.22.10 release, Eden Rivera asks "What can I do for you?" and lists "I want to run for Council member." five times and "I want to run for Mayor." once. Nothing tells the five council lines apart (place number, who holds the seat, election date), and nothing says what filing needs before I choose. I picked the first and learned only afterward that it is for November 3, 2026, 21 months away. I expected each seat named with its election date and incumbent.

**Rules.** No hand-written player text: each choice names its seat and election from the contest record. One rule, all 56 places: seats are told apart the same way wherever a body has several.

**Done when.** The owner does the same steps on the next build and is not stopped: at a filing office with several seats up, each choice names its seat, its election date and who holds it now, before the player picks. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/filing.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:02; screenshot 43.

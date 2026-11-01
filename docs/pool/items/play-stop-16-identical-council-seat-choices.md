---
id: play-stop-16-identical-council-seat-choices
title: "The city secretary offers five identical 'run for Council member' lines"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6791
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** At the city secretary on the v0.22.10 release, Eden Rivera asks "What can I do for you?" and lists "I want to run for Council member." five times and "I want to run for Mayor." once. Nothing tells the five council lines apart (place number, who holds the seat, election date), and nothing says what filing needs before I choose. I picked the first and learned only afterward that it is for November 3, 2026, 21 months away. I expected each seat named with its election date and incumbent.

**Rules.** Serves LAW.md §4, Scenes and conversations; LAW.md §8, Dev-speak. No hand-written player text: each choice names its seat and election from the contest record. One rule, all 56 places: seats are told apart the same way wherever a body has several.

**Done when.** The owner does the same steps on the next build and is not stopped: at a filing office with several seats up, each choice names its seat, its election date and who holds it now, before the player picks. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** At the city secretary each council choice names its seat, its election date and who holds it now, in plain words.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/filing-visit.ts, src/bench/filing.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:02; screenshot 43. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2. Playtest Oct 26 sitting 1 (installed v0.34.0): the panel still ran to the window bottom and the choices still read "(2025, 1)"; the remainder is in play-stop-44 and the owner's check. Reopened by the CTO, Oct 26: the choices still read "(2025, 1)" on v0.34.0; remainder is in play-stop-44 and the owner's check.

Sent back 2026-10-25 ~22:45 UTC from PR #6101 (branch play-first/play-stop-16-identical-council-seat-choices, head 8672b515da with main merged in): both body screenshots are wrapped in backticks so they render as code, not images, and OWNER SCREENSHOT NEEDED still awaits the owner's yes; unwrap the image tags and it goes back in the queue once the owner says yes; finish on that branch, merge main into it first.

2026-10-25 Merger 1 correction: restored open after my chained command prematurely marked done when a head check aborted; PR #6101 remains unmerged at 8672b515da21b2fa1df4bf8e2b2c169624ba9af9. The existing Merger X send-back and its Notes remain the gate. No merge was completed.

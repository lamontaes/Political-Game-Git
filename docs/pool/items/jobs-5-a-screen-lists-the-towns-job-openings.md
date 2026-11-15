---
id: jobs-5-a-screen-lists-the-towns-job-openings
title: "A screen lists the town's job openings, with employer, kind, pay and hours"
area: core
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: jobs-1-travel-and-cards-show-every-workplace-kind
blocked-on:
root: none
lead: jobs
model: sonnet
effort: medium
source: "owner, Nov 15 20:44Z and 20:48Z (jobs read as textiles or markets; chains in sectors), 21:00Z (the point is that laws reach businesses by sector; not finely detailed, the effect web must play out); Account lead's five-piece plan, Nov 15 20:59Z; trace by T54 at /mnt/project-files/account-lead/t54-jobs-trace.md"
---

**What.** No screen lists the town's job openings. At Lauderdale Lakes FL (seed 90c1afb8-1797-401c-8261-03dd0ead413b) `/api/openings` returned none for the player on day one (trace: /mnt/project-files/account-lead/t54-jobs-trace.md); #8942 found the same. The jobs engine holds openings at every employer, but the player cannot see which sectors are hiring or what they pay. Seen: the Jobs screen on day one.

**Cause.** Found in code: the jobs engine keeps standing openings from each employer's staff times its industry's JOLTS rate (src/core2/modules/jobs.ts:1247, openings-rate.json), and `/api/openings` (src/bench/handler.ts:2426) serves only openings the player qualifies for or has applied to; no screen reads the town's whole list.

**Fix.** The Jobs screen lists the town's open openings from the jobs engine's records (employer, its kind in words, title, hourly pay rounded, hours, how long it has stood), sorted by fit, with Apply going through the existing apply action. It is a view: no count or fact of its own.

**Laws that reach it.** Minimum wage (the lowest pay shown moves when a wage law takes effect), layoffs and hiring after a law's cost lands on a kind; the player sees which sectors are hiring.

**Time box.** 3 hours, Sonnet, medium.

**Rules.** No hand-written player text in code: the screen words titles, kinds, pay and dates through bank labels. Player-screen-text: titles, kinds, pay and dates are worded labels, never ids or unrounded numbers. Read-only screens spend no game time and create no facts.

**Done when.** At two named places with seeds the screen lists openings from at least three kinds on day one, each traceable to its record; a played Apply from it reaches the existing application; pictures in the pull request; a second session sees it at a drawn place.

**Waits on.** Piece 1's base (Train #9554).

**Files.** src/bench/handler.ts, src/bench/ui (Jobs screen), its test.

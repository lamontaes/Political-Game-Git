---
id: play-stop-14-town-list-stops-at-400
title: "The town list shows only the first 400 towns, and some have no count or appear twice"
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

**What.** Picking Texas on the v0.22.10 release shows a town list that stops at the 400th town alphabetically (Abbott to Deer Park); later towns are reachable only by typing in Search, and nothing says so. Ten towns show no population (Airport Heights, Amaya, Anacua, Barksdale, Brookston and others). Agua Dulce and Chula Vista each appear twice with different counts and no county to tell them apart. I expected to scroll to any town, see a count for each, and tell same-named towns apart.

**Rules.** One rule, all 56 places: every town in every state and territory is pickable the same way. Estimate, never UNKNOWN: a town without a count shows an estimated population with its source.

**Done when.** The owner does the same steps on the next build and is not stopped: in Texas and one other place drawn from all 56, every town can be reached by scrolling or a stated search, each shows a population, and same-named towns show their county. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/creator.ts, src/bench/places.ts, src/bench/place-selection.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:49; screenshot 06.

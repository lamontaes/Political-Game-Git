---
id: play-city-books-on-screen
title: "Budgets shows the city's money taken in and paid out this year in plain dollars"
area: play
kind: feature
priority: 2
size: S
status: claimed
claimed-by: play-first/play-city-books-on-screen
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from core-city-treasury-trillions-dickens)
lead: play-first
milestone: play-first
claimed-at: 2026-10-26T06:50:08.563Z
---

**What.** A small city's books reached trillions in a year, and core-city-treasury-trillions-dickens is fixing the flows. Budgets shows the adopted plan but not what the treasury actually took in and paid, so a broken treasury is invisible. Add a So far this year line under the town's budget: taken in, paid out and cash on hand in plain dollars, read from the treasury journal, with a plain warning when spending runs past the budget.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: the three figures are sums of the treasury's journal entries, checked against its budget record. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, after a played quarter, Budgets shows the town's taken-in, paid-out and cash figures equal to its treasury journal sums in a test, in dollars a person would read, shown by a screenshot with the place and seed named. The owner plays it: he sees it on Politics → Budgets in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Budgets tells you how much your town has actually collected and spent so far this year.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/budget.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: core-city-treasury-trillions-dickens's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with core-city-treasury-trillions-dickens (needs-from in the handoff line).

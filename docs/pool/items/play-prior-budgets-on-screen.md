---
id: play-prior-budgets-on-screen
title: "Politics → Budgets shows last year's adopted budget beside this year's"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from gov-prior-year-budgets-at-opening)
lead: play-first
milestone: play-first
---

**What.** Every government opens with one adopted budget on record, and gov-prior-year-budgets-at-opening adds the years before it. Budgets shows only the current year, so a raise or a cut has nothing to be measured against. Show the prior adopted budget beside the current one for the player's town, county and state, line by line, with the change in dollars and in words (up, down, new, gone), read from the budget records.

**Rules.** Serves LAW.md §11, The world on screen makes sense. This is a game, not a spreadsheet: a short list of the lines that moved most, in words, not a full table of every line. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, once Budgets is open to the player, the town's budget shows last year's adopted total and the five lines that changed most, each read from a budget record id named in a test; where no prior year is on record it says so, shown by a screenshot with the place and seed named. The owner plays it: he sees it on Politics → Budgets in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Budgets shows what your town spent last year next to this year, and which lines went up or down.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/budget.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: gov-prior-year-budgets-at-opening's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with gov-prior-year-budgets-at-opening (needs-from in the handoff line).

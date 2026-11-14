---
id: play-bill-text-restates-law-in-force-and-rounds-twice
title: "The bill's Compare view strikes a clause that reads 'raised from X to X', and a rate shows as 0.7% on the card and 0.702 percent in the text"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: low
lead: words
root: none
source: Words lead read of the carried #8457 (draft #9106), Nov 14
claimed-at:
after:
checked:
---

**What.** On a drafted bill's paper, the Compare view strikes the section as it would read with the law in force restated, for example "the local sales tax rate shall be raised from 0.702 percent to 0.702 percent", which reads as a raise by nothing. The card and the estimate show the same rate rounded ("In force today 0.7%"), while the bill's text prints the unrounded value ("0.702 percent"). Both are on every bill, single amount or phase-in; they are not from the phase-in change. Seen: Politics, Your office, Bills, a drafted bill's paper, Compare view and the "What it would do" panel.

**Cause.** Found in code: src/bench/bill-stage.ts, in the `struck` build near line 768, recomposes the section with `value: before.value`, so the "raise" clause names the same number twice (the bank's `raise` form in data/english/bill-sections.json: "shall be raised from {before} to {value}"); the text prints `before` and `value` through `amounts` without the rounding the card's `amount()` in src/bench/play.mjs applies.

**Fix.** Word a struck clause as the law in force reads ("the local sales tax rate is 0.7 percent" or whatever the Words lead rules) and say a rate to the same rounding on the card, the estimate and the text.

**Time box.** 2 hours for one Sonnet session; the Words lead rules the wording first.

**Rules.** No dice. Player-visible words come from the English engine's banks, judged by the Words lead.

**Done when.** A second session, in the running game in a drawn place and seed, drafts a bill and opens its paper: its Compare view shows no clause that raises a value to itself, and sees the rate read the same in the card, the estimate and the bill's text (place, seed and bill id in the PR body).

**Waits on.** The Words lead's wording.

**Files.** src/bench/bill-stage.ts, data/english/bill-sections.json, src/english/bill-sections.ts, src/bench/play.mjs

**Notes.** Filed by F5 while carrying #8457.

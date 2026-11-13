---
id: gov-poison-pill-guards-measured
title: "Find which guard keeps a legislator from ever moving a poison-pill amendment"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: haiku
effort: low
lead: governing
root: none
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** legislature.poison-pill never ran in a played election window (Parkway, Missouri): movesPill (src/core2/modules/legislature.ts, line 4766) is asked only after the guards just before its caller (near line 4750) pass, and which guard holds every time was not measured. Measure each guard's pass rate in a played year and either fix the guard that never passes or record why the decision is rare.

**Cause.** Measured: Parkway, Missouri (2956306), world seed pill-1, one played year (`buildBenchWorld`, two levels) on main d59e6935d7, with counters on each guard of the floor's pill step in `src/core2/modules/legislature.ts` (lines 4708 to 4752), since removed. 87 bills reached the step. 75 would pass (line 4709), and 73 of those had an opponent to move a pill (line 4713). Their opponents' own sections gave 207 candidates, 75 of which did not win the mover over (line 4727). Of those, 19 had a majority of the roll for the section and 44 left the bill short of the votes it needs, but only 3 did both (lines 4743 to 4745). One became the best pill (line 4750), and `movesPill` was asked once and the member held (`legislature.poison-pill`, `pill-hold`). So the decision does run. The guard that holds is the pair of a majority for the section and the bill sunk by it: a backer votes for a section only if it leaves them liking the bill at least as much (line 4738), so a majority for a section rarely leaves the bill short. That matches how rare a real poison pill is. The gap row in `data/content/trait-decision-gaps.json` (line 161) still says no bill got that far, and its line numbers are stale.

**Fix.** Data only. Rewrite the `legislature.poison-pill` row in `data/content/trait-decision-gaps.json` (line 161) with what was measured: class `rare`, `why` naming the guard pair at `src/core2/modules/legislature.ts` lines 4743 to 4745 and the counts above (3 of 75 sections in a year in Parkway, Missouri, seed pill-1, one decision asked), and `fix` saying no change: the rarity is the real one. Do not widen `pillCandidates` to make pills common.

**Time box.** 0.5 hours for one Haiku session.

**Rules.** Wire to the world: measured in one year of buildBenchWorld in a drawn place, seed named. Ask why: the report names the guard by file and line.

**Done when.** A second session reads the rewritten gap row naming the guard pair and the measured counts, and in a played year in a drawn place (named with its seed) finds `legislature.poison-pill` asked at least once, or the gap row's count of sections that passed the guard pair for that year.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, data/content/trait-decision-gaps.json

**Notes.** Found Oct 24 by the traits lead's never-run audit.

Nov 11 (cause finder for Fable B): counted every guard of the pill step for a played year in Parkway, Missouri (seed pill-1) on main d59e6935d7. The decision runs (asked once, held). What holds is the pair of a majority for the section and the bill sunk by it, 3 of 75 sections, which is a real rarity. The fix is the gap row's text.

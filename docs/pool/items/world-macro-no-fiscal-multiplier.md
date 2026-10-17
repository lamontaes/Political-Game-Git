---
id: world-macro-no-fiscal-multiplier
title: "Federal spending moves output as dollars followed, not a multiplier"
area: world
kind: cleanup
priority: 2
size: M
status: done
claimed-by: claude/macro-no-multiplier
pr: #4836
after:
blocked-on:
source: "owner, Oct 16"
claimed-at: 2026-10-16T21:43:44.284Z
---

**What.** `src/core2/data/macro/parameters.json` carries `macroFiscalMultiplier` (1.2) and `src/core2/modules/macro.ts` reads the federal budget's change in purchases as a share of output times that multiplier to make an impulse. The owner, Oct 16: "You don't just get an implicit multiplier... that's not how this game works." Remove the parameter and the "impulse = change in purchases × multiplier" path. Federal outlays reach the macro engine as the sum of the dollars actually paid out through the budgets engine (payroll, transfers, purchases) and what their recipients spend, which the regional and jobs engines already read. The research (CBO ARRA ranges, Monacelli, Perotti and Trigari 2010) stays as a calibration check on the resulting totals, not as a coefficient.

**Rules.** An effect is a read, not a record: output moves because the engines that pay and spend moved it, not because a coefficient scaled a budget line. Replace, never layer: the multiplier path goes, nothing is added beside it. Nothing in the simulation is a locked number (owner, Oct 16).

**Done when.** A one-year played world in a drawn place (`buildBenchWorld`, every module installed) shows national output responding to a federal budget change through named journal entries (budget line → payee record id → spending), with no multiplier parameter left in src/core2/data/macro/; the macro tests pass with the parameter gone and a test names the place and seed. The owner plays it: a bigger federal budget shows up as people paid and buying, and the economy follows them.

**Files.** src/core2/modules/macro.ts, src/core2/modules/budgets.ts, src/core2/data/macro/parameters.json

**Notes.** Ruling in OWNER-DECISIONS.md, Oct 16 evening. The parameter's citation names data/research/stand-in-figures-2026-10-12.json; keep that as the calibration check's source.

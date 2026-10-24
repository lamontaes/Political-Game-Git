---
id: tests-justice-forfeiture-no-convicted-taker
title: "justice-forfeiture.test.ts finds no convicted bribe taker in six worlds about one run in four once the take side is calibrated"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/sleepy-carson-f8omzd
pr: #5847
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T10:31:17.500Z
---

**What.** The forfeiture test forces large bribes from a town's richest residents to its serving officials, plays 240 days and looks, over up to six drawn worlds, for a convicted taker whose sentence carries the bribe money. With the take side calibrated to honesty (the honest-pull fix in the traits integrity family), fewer officials take the forced bribes, and one of four runs found no convicted taker (Terral, Oklahoma: 31 bribes taken, 11 sentences, none of a taker). The test should reach a convicted taker by the engines' own chain every run: let the forced offers reach the officials most likely to take, or follow a taken bribe's report and prosecution to its sentence, rather than hoping six worlds hold one.

**Rules.** No dice: the conviction must come from the report, the prosecutor's case and the plea or trial the engines run, never a forced verdict. Wire to the world: the forfeiture is a journal entry from the official's cash to the treasury in a played world.

**Done when.** src/core2/justice-forfeiture.test.ts passes ten runs in a row on fresh drawn places (buildBenchWorld, seeds named), each naming the convicted taker's sentence record id and the forfeiture journal record, with the honest-pull calibration in place.

**Files.** src/core2/justice-forfeiture.test.ts, src/core2/modules/justice.ts, src/core2/modules/corruption.ts

**Notes.** Filed Oct 24 by the traits lead while landing traits-wire-integrity: one failure and three passes in four runs on the integrity branch; one pass on main.

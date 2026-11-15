---
id: gov-corruption-weights-estimated
title: "The bribe weights say what raises and lowers each chance, as estimated rows with spreads"
area: gov
kind: research
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: S3
pr: 9413
after:
blocked-on:
lead: gov
model: sonnet
effort: medium
root: rc3-thin-life-record
source: Account lead, from the owner's ruling of Nov 14, 19:25Z, Nov 15, 2026
checked: s3 2026-11-15
---

**What.** Thirteen rows in src/core2/data/corruption/parameters.json (how much money trouble, the bribe's size, ties, reputation, a soured tie and distance weigh in offering, taking, pressing, telling and reporting a bribe) were tagged TUNABLE under the stopgap SG-P15-corruption-weights, waiting for sources the owner has ruled are not needed. Seen: every bribe the game decides, for example at Cinco Bayou FL in src/director/bribe-offer-player-seat.test.ts.

**Cause.** Found in code: each row names `stopgapId: "SG-P15-corruption-weights"` and a marker sits in `decide` and the journal source in src/core2/modules/corruption.ts. The owner ruled (Nov 14, 19:25Z) that sources only establish relationships and effects, never exact figures.

**Fix.** Each row becomes ESTIMATED: `estimatedFrom` states what raises and lowers the chance in plain words, `spread` keeps the range the earlier fit and checks held; the row's `stopgapId`, the stopgap row and both markers are deleted. No value changes.

**Time box.** 1 hour, Sonnet medium.

**Rules.** No dice; no new stopgap; a chosen number is an ESTIMATED row with a spread; plain American English.

**Done when.** `grep SG-P15-corruption-weights src tests scripts` finds nothing, no row in src/core2/data/corruption/parameters.json is TUNABLE, and the corruption tests give the same results as before (rates and odds between thirds in src/core2/corruption-calibration.test.ts).

**Waits on.** Nothing.

**Files.** src/core2/data/corruption/parameters.json, src/core2/data/stopgaps/p15.json, src/core2/modules/corruption.ts

**Notes.** Built on claude/gov-corruption-weights-estimated.

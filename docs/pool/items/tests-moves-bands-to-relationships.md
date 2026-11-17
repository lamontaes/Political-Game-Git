---
id: tests-moves-bands-to-relationships
title: "The moves checks fail a world for leaving the survey's mover counts instead of checking how strongly age moves leaving"
area: people
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/long-game-bands-moves-pr
pr: #9851
after:
blocked-on:
root: none
lead: play-first
model: fable
effort: medium
source: Long game lane, Nov 17 (the CTO's calibration audit, family 32, on issue 9747)
---

**What.** Three moves checks fail a world whose count of movers leaves a band around a published rate: `moves-elsewhere.test.ts` (0.7 to 1.3 of the ACS mover rate for relatives elsewhere), `counted-moves-balance.test.ts` (0.4 to 2.5 times 1.3% a year of arrivals from abroad) `moves.test.ts` (0.8 to 1.2 for the town's adults) and `counted-moves-town.test.ts` (under 10% in five months, a ceiling from the ACS county-leaving rate). Under the owner's rule a world's count is its own; only the strength of a relationship comes from research.
Guards: the moves engine's age relationship and the admissions law's push on arrivals, at drawn places.

**Cause.** Found in code: the three tests compare a count with the survey's rate times the people at risk, so they pin the level.

**Fix.** Each band becomes a check on the relationship it stood for (skill `relationship-checks`). Relatives elsewhere: the movers' mean age rate is E[r²]/E[r] of everyone at risk, within four standard errors, above everyone's mean. Unlisted counted groups: their share who left is compared with the rest of the town's in the same months, within a factor of three. Arrivals from abroad: the band goes, the moves keep their cause, and the admissions law's twin-world case carries the strength. The town's own check (`moves.test.ts`) is converted on `claude/long-game-bands-moves` and red there: it found the age fault World fixes, and it ships with that fix.

**Time box.** 2 hours.

**Rules.** Calibration only: real data sets the strength of a relationship, never a count (owner, Nov 17, "Everything comes from the simulation"); sense checks stay.

**Done when.** A second session runs both files in a drawn place and reads each relationship line; the arrivals case passes with its count printed and no band.

**Waits on.** Nothing.

**Files.** src/core2/moves-elsewhere.test.ts, src/core2/counted-moves-balance.test.ts, src/core2/counted-moves-town.test.ts

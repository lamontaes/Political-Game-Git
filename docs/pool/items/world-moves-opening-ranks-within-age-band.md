---
id: world-moves-opening-ranks-within-age-band
title: "A town's first months of departures are whoever their records push hardest, whatever their age, so age does not move who leaves"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
after:
pr: 0
blocked-on:
model: sonnet
effort: medium
root: none
source: "Long game, Nov 17, 2026: the converted band check is red at Gisela, Arizona (comment 6936570706)"
lead: world
---

**What.** The adults who leave town in the first half year are mostly the oldest, pushed out by close family elsewhere, so the movers do not rise and fall by age the way the engine's own life-stage rates say. At Gisela, Arizona (seed ffd5db24fac16b551cade1450af7eaa4f1e84bebf8c7d564230b73786e86bedd), 10 of 581 adults left with a mean age rate of 0.0298 against 0.0392 for everyone and 0.0518 the rates predict.
Seen: Metrics' movers by age in a town's first months.

**Cause.** Found in code: `openingPulls` in `src/core2/modules/moves.ts` orders the whole town by net push and sets each person's months to go from that one rank, so the departure month is the same for everyone of the same rank whatever their age band's rate; the age rate only enters after the opening has played out.

**Fix.** Rank within each age band and spread each band over the way to leaving at its own mean pace, so a band's share that leaves a month follows its rate and the records still decide who goes first within it. The check `src/core2/moves.test.ts` ("sends adults away by age at the strength the research gives") is red on the old code and green on the new. The within-town ordering assertion in "builds each pull from the person's records" becomes within each band (CTO line).

**Time box.** 2 hours.

**Rules.** No dice; real rates set only the slope's strength, never how many move.

**Done when.** A second session plays a town in a drawn place (place and seed named) for half a year in dev mode and sees the movers' mean age rate above everyone's and within four standard errors of the rate-proportional prediction.

**Waits on.** Nothing.

**Files.** src/core2/modules/moves.ts, src/core2/moves.test.ts

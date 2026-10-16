---
id: play-councils-legislatures-and-congress-acting-on-their
title: "Councils, legislatures and Congress acting on their own (world-legislating)."
area: play
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/play.md line 75 (unchecked checklist line)"
---

**What.** `world-legislating` makes councils, legislatures and Congress act on their own, and it is built, but the bench leaves it off because after its first session it makes play about 5 to 11 times slower (Botsford, Connecticut, seed wl-a: three months took 76 s with it on). Find what grows (an unbounded scan, a table copy, a per-day loop over all bodies), make it act only on the day something changes, and turn it on in `/play`. The player would notice the world's laws changing without him, and a year still running in under two minutes.

**Rules.** Speed: a town's game year runs in under two minutes and the module may not add more than 20% to its base, measured before and after on the same machine, one process at a time; also never scan the whole world or history every day; use indexes or act on the day something changed; An effect is a read, not a record: other engines read the laws it passes; Wire to the world: it moves laws and money in a generated world and covers every body; No dice: bodies act from members' reasons and the calendar, not a roll; Replace, never layer: the bench's off switch and its workaround are deleted when it is on; One rule, all 56 places: no place named.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the bench `/play` route runs a year with `openWorldLegislating` installed, bills pass in other bodies (bill ids named), `npm run speed:year` is within 20% of the same world without it, and `src/core2/world-legislating.test.ts` passes. The owner plays it: skips a year and finds new laws in the town he did not write.

**Files.** src/core2/modules/world-legislating.ts, src/bench/world.ts, src/bench/world-modules.test.ts, scripts/core2-year/

**Notes.** Checklist line from play.md; verify against main before starting.

---
id: gov-dual-office-law-by-place-part-4-played-world-proof
title: "Dual-office law proven in a played world"
area: gov
kind: wiring
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after: gov-dual-office-law-by-place-part-1-states-a-to-f, gov-dual-office-law-by-place-part-2-states-g-to-n, gov-dual-office-law-by-place-part-3-states-o-to-z-and-territories
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: split from gov-dual-office-law-by-place in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Prove the dual-office rows in a played world. In a one-year world in a drawn place, an officeholder who wins a second office either keeps or vacates the first according to the place's cited row, and another engine (the offices module's terms and the seat's vacancy) reads the result, shown by record ids.

**Cause.** Found in code: `src/core2/office-incompatibility.ts` `incompatibleOffices` is the only reader of `src/core2/data/offices/incompatibility.json`; no played-world test follows an officeholder elected to a second office through it.

**Fix.** Add a test that, in a drawn place, finds or sets up through existing producers an officeholder elected to a second office, and follows the first term's status (kept or vacated) and the vacancy by record id.

**Time box.** 3 hours for one sonnet session.

**Rules.** Wire to the world: the proof uses the ordinary generated world and existing producers. An effect is a read, not a record: the offices module reads the incompatibility. One rule, all 56 places.

**Done when.** A second session plays a one-year `buildBenchWorld` in a drawn place (named with its seed) and sees an officeholder elected to a second office keep or vacate the first, by term record ids, as the place's row says, and the vacancy filled by the engine.

**Waits on.** gov-dual-office-law-by-place-part-1-states-a-to-f, gov-dual-office-law-by-place-part-2-states-g-to-n and gov-dual-office-law-by-place-part-3-states-o-to-z-and-territories (the rows the proof reads).

**Files.** src/core2/office-incompatibility.ts, src/core2/modules/offices.ts, src/core2/office-incompatibility.test.ts (new)

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A proof of rows that are dropped.

---
id: core-speed-journal-portfolios-in-play
title: "Building a posting's account portfolios does in play only what play reads"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** For every cash-journal posting, portfolios() in src/core2/journal-state.ts builds a set of touched accounts per owner, copies each touched owner's whole account index into an array, rechecks the index's completeness and the outside-flow totals (with BigInt), and checks each account's mode and partition metadata, even with bookkeeping off. Long Hill, Connecticut (seed m7b) posts about 160,000 entries a year, so this is one of the largest parts left of the journal's cost after core-speed-journal-posting-in-play. Keep every check under the bookkeeping switch and read the index directly in play, so a posting builds only the snapshots its arithmetic reads.

**Rules.** Bookkeeping is a debug switch: validation and copies run in tests, not in play. No dice: every dollar and record stays exactly the same. Speed: no change makes a year slower, measured before and after on the same machine, one process at a time.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) every fingerprint is identical before and after; portfolios' self time in a CPU profile falls by at least half; src/core2/journal*.test.ts and the accounts and finance tests pass.

**Files.** src/core2/journal-state.ts

**Notes.** Filed Oct 24 by the speed lead from the journal helper's finding on claude/speed-journal-in-play; stacked on that branch.

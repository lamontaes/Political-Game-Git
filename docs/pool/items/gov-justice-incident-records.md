---
id: gov-justice-incident-records
title: "Police stops, complaints, self-defense claims and concealed-weapon applications exist as incident records"
area: gov
kind: feature
priority: 2
status: in-pr
claimed-by: claude/justice-incidents
pr: #5088
blocked-on: gov-justice-carry-permit
milestone:
source: "found while building laws-record-only-reads"
claimed-at: 2026-10-19T18:40:21.441Z
---

**What.** The justice engine hears only bribery cases of officials (conviction-records.ts). Five laws (police oversight, juvenile jurisdiction age, stand your ground, facial-recognition ban, concealed-carry permit) are declared but have no effect because no engine produces the stop, the complaint, the self-defense fight or the permit request they govern. Split into one shared prerequisite and five per-law reads:

- `gov-justice-incident-producer`: incident records arise as events in a town from causes already in the world.
- Then the five reads: `gov-justice-police-oversight`, `-juvenile-age`, `-stand-your-ground`, `-facial-recognition`, `-carry-permit`.

**Rules.** Wire to the world: each incident names the town and the person record. An effect is a read: the law changes the record written, never an empty table. Replace, never layer: delete the five stopgaps as the reads land.

**Done when.** The six sub-items are in the pool, the parent is blocked on the last, and the pool index is regenerated.

**Files.** docs/pool/items/gov-justice-*.md

**Notes.** Sized M because each read is its own rule with its own check. Split Oct 19.

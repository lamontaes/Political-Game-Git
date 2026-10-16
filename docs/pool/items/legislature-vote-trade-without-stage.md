---
id: legislature-vote-trade-without-stage
title: "A vote on a bill with an unstaged trade stops with Module data must be finite (legislature.test.ts seeds a2, a3, a6)"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a chamber counts its votes, `chamberVote` in `src/core2/modules/legislature.ts` writes each member's vote row with the trades that member took, and copies each deal's `stage` into it. A deal's `stage` is optional (it is set only for a committee or floor trade), so a trade without one is written as `stage: undefined`, and the module table refuses it with "Module data must be finite, acyclic JSON data" (path `traded.0.stage`). The vote, and the whole golden-path ordinance test, stops. It shows up in `src/core2/legislature.test.ts` "an ordinance raising the minimum wage passes or fails on members' reasons" on some places (seeds a2, a3 and a6 fail on main and on the branch that found it).

**Rules.** An effect is a read, not a record: the vote row cites the trades the member took, and readers already treat `stage` as optional. No dice: nothing about the vote changes, only whether the row can be written. Replace, never layer: omit the field when there is none; do not invent a default stage.

**Done when.** With GOLDEN_PATH_SEED set to a2, a3 and a6 the test "an ordinance raising the minimum wage passes or fails on members' reasons" passes in the drawn place, and a test in src/core2/legislature.test.ts counts a bill with an unstaged trade and reads the member's vote row with the trade and no stage by its vote record id.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature.test.ts

**Notes.** Found while checking that a faster module-data copy changed no rows (PR for core-plaincopy-hot); the failure is the same on main, so it is not from that change.

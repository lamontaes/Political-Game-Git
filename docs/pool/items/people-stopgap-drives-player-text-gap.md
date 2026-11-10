---
id: people-stopgap-drives-player-text-gap
title: "Stopgaps in drives (player-text-gap): 1 open"
area: people
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr: #5287
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/drives.ts, kind player-text-gap"
claimed-at:
---

**What.** Replace or clear the 1 open player-text-gap stopgap row(s) in src/core2/modules/drives.ts: SG-P10-group-name-key. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/drives.ts

**Notes.** First row: A founded cause group carries a structured key in its name field instead of a name.

Sent back 2026-10-20 from PR #5287 (branch claude/association-names): data/english/parts/association-names.json adds eight origin authored entries with shippable true. The morning check refuses authored pieces marked shippable before grading. Keep them held until graded, and make the release claim accurately reflect what can ship; this pool-session change also edits Words-owned src/english, src/director and data/english paths, which must be owned by the Words session.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5287 (branch claude/association-names): Held names do not meet the resolved-row and one-year downstream-read acceptance; route a bounded preparation slice with its evidence table, add the missing release declaration, and address Words ownership; finish on that branch, merge main into it first.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. SG-P10-group-name-key is status resolved (resolvedAt 2026-11-08) in src/core2/data/stopgaps/p10.json: the record keeps its structured key and the name a player reads is made by the English engine (src/english/group-names.ts, data/english/group-names.json) from the group's topic. The held association-names bank the item was sent back over, data/english/parts/association-names.json, no longer exists.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).

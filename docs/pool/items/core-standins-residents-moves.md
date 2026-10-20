---
id: core-standins-residents-moves
title: "Residents, moves, health and drives stand-in rows from the #4151 audit"
area: core
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/standins-residents-moves
pr: #5086
blocked-on:
source: "split from core-people-standins-oct14"
claimed-at: 2026-10-20T18:26:23.699Z
---

**What.** The #4151 audit also changed residents (outside living costs, unplaced workers' income and voter-group lean closed as labeled estimates; owner payouts deleted), moves (a town-hall question meets the host), health and drives (never-offered act rows removed; group founding gone), births (the dated partner record) and the bench (doors, challenger name, world settings). Redo the ones main still lacks, one area at a time, against main's current files. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No hand-written player text; replace, never layer (the stand-in and its registry row go in the same change); a row is closed only by the replacement, never by deleting the row without it; one rule, all 56 places; no dice.

**Done when.** Each registry row listed in the audit table for these areas is resolved, with the test named in that table passing on a fresh branch from main (residents.test.ts, drives.test.ts, births-plan.test.ts, seated.test.ts).

**Files.** src/core2/modules/residents.ts, src/core2/modules/moves.ts, src/core2/modules/drives.ts, src/core2/modules/health.ts, src/core2/births-plan.ts, src/bench/

**Notes.** SG-P15-moves-pinned-jobs and SG-FIXER-moves-income-household stay open until core-moves-pinned-and-income-stopgaps builds the mechanics. Split from core-people-standins-oct14 (Oct 16): PR #4151 (branch stopgaps/people-core) now conflicts with main in about 40 files and was not merged; its table of rows is in that PR's description.

Sent back 2026-10-20 from PR #5086 (branch claude/standins-residents-moves): deletes stopgap rows SG-P10-testify-unbuilt, SG-P10-candidacy-unbuilt and SG-P10-lobbying-unbuilt; mark them resolved with their replacement instead; finish on that branch, merge main into it first.

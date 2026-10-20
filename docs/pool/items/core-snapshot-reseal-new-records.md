---
id: core-snapshot-reseal-new-records
title: "A save restored under bookkeeping leaves records made after the opening unfrozen (pay ledgers, earned pay periods)"
area: core
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-yucp92-ax
pr: #5676
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T12:17:21.581Z
---

**What.** The Oct 20 merge audit asked for a saves test that restores a world and checks frozen records. Records that exist at the opening restore frozen (shown in src/core2/saves.test.ts). Records a producer creates after the opening do not: core.work.payrollLedgerByCommitment and core.work.earnedPayPeriods rows are frozen in the played game under bookkeeping and unfrozen after loadGame, because the rebuilt world has no record at that path to take frozen state from. Only bookkeeping (tests and the bench) freezes records, so play is unaffected.

**Rules.** Bookkeeping is a debug switch: do not add cost to play. Replace, never layer.

**Done when.** Under bookkeeping, a world saved after 45 days and restored has every record frozen that the played game froze, by path, and a test in src/core2/saves.test.ts says so; or the saves test documents that post-opening records are frozen only by their producer and the restore refreezes them in one pass.

**Files.** src/core2/snapshot.ts, src/core2/saves.test.ts

**Notes.** Found Oct 20 while building fix 6 of release-merge-audit-oct20-morning-fixes (claude/political-game-pool-yucp92-at). Also answers that item's question about seal(): shared $ref objects are already frozen when reached a second time, so seal() returns early; no change is needed there.

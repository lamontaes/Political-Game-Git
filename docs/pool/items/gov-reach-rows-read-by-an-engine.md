---
id: gov-reach-rows-read-by-an-engine
title: "Law reach rows are read only by a screen, not by an engine"
area: gov
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/gov-reach-rows-read-by-an-engine
pr:
blocked-on:
milestone:
source: "split from gov-next-from-the-audit-this-lane (laws stress audit, defect 14)"
claimed-at: 2026-10-16T08:31:42.683Z
---

**What.** Defect 14: an ordinance's duty on a county department and the law facts a person learns are written as reach rows and read by nothing that decides. On main `reachOn` is read only by the bench card (`src/bench/card.ts`). Have an engine read the rows at the moment it decides (a department's budget request reading the duty it now carries, a person's stance reading the law fact they learned), or stop writing the rows nothing reads.

**Rules.** An effect is a read, not a record. Ask why: the cause is named by file and line, or \"not found\". No dice. One rule, all 56 places. Replace, never layer.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a county ordinance that puts a duty on a department changes that department's next budget request or act, named by reach row id and the reading record id, and a test in src/core2/law-reach-group-a.test.ts covers it.

**Files.** src/core2/law-reach/group-a-records.ts, src/core2/law-reach/host.ts, src/core2/modules/budgets.ts

**Notes.** From `docs/reports/stress-audit-laws-2026-10-14/README.md`, defect 14. Verify against main before starting; the audit ran on the Oct 14 build.

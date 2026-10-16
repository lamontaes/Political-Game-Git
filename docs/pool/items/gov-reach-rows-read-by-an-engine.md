---
id: gov-reach-rows-read-by-an-engine
title: "Law reach rows are read only by a screen, not by an engine"
area: gov
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/reach-read
pr:
blocked-on:
milestone:
source: "split from gov-next-from-the-audit-this-lane (laws stress audit, defect 14)"
claimed-at: 2026-10-16T10:00:12.209Z
---

**What.** Defect 14: an ordinance's duty on a county department and the law facts a person learns are written as reach rows and read by nothing that decides. On main `reachOn` is read only by the bench card (`src/bench/card.ts`). Have an engine read the rows at the moment it decides (a department's budget request reading the duty it now carries, a person's stance reading the law fact they learned), or stop writing the rows nothing reads.

**Rules.** An effect is a read, not a record. Ask why: the cause is named by file and line, or \"not found\". No dice. One rule, all 56 places. Replace, never layer.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a county ordinance that puts a duty on a department changes that department's next budget request or act, named by reach row id and the reading record id, and a test in src/core2/law-reach-group-a.test.ts covers it.

**Files.** src/core2/law-reach/group-a-records.ts, src/core2/law-reach/host.ts, src/core2/modules/budgets.ts

**Notes.** From `docs/reports/stress-audit-laws-2026-10-14/README.md`, defect 14. Verify against main before starting; the audit ran on the Oct 14 build.

**Verified on main (Oct 16, claude/reach-read).** Still true. `reachOn` has one caller outside the law-reach folder, the bench card (`src/bench/card.ts`), and `reachedBy` has one, the bench change list (`src/bench/changes.ts`); no engine that decides reads either. The rows are of seven kinds (eligibility, right, compliance, price, rule, service, job) aimed at people, organizations, staff, counted groups and officeholders, and each already has its own mechanic where one exists (wages, prices, staffing, voting). So the question for the next session is narrower than "have an engine read the rows": pick the kinds that have no mechanic yet (`compliance` and `rule` on organizations, `right` on people) and have the engine that decides for that target (the budgets engine's department request, the choice engine's offers) read the open rows for its target when it decides, or stop writing those kinds. The budgets engine keeps no department record to carry a duty, which is the first thing to add.

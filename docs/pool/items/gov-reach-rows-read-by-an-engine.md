---
id: gov-reach-rows-read-by-an-engine
title: "Law reach rows are read only by a screen, not by an engine"
area: gov
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from gov-next-from-the-audit-this-lane (laws stress audit, defect 14)"
claimed-at:
---

**What.** Defect 14: an ordinance's duty on a county department and the law facts a person learns are written as reach rows and read by nothing that decides. On main `reachOn` is read only by the bench card (`src/bench/card.ts`). Have an engine read the rows at the moment it decides (a department's budget request reading the duty it now carries, a person's stance reading the law fact they learned), or stop writing the rows nothing reads.

**Rules.** An effect is a read, not a record. Ask why: the cause is named by file and line, or \"not found\". No dice. One rule, all 56 places. Replace, never layer.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a county ordinance that puts a duty on a department changes that department's next budget request or act, named by reach row id and the reading record id, and a test in src/core2/law-reach-group-a.test.ts covers it.

**Files.** src/core2/law-reach/group-a-records.ts, src/core2/law-reach/host.ts, src/core2/modules/budgets.ts

**Notes.** From `docs/reports/stress-audit-laws-2026-10-14/README.md`, defect 14. Verify against main before starting; the audit ran on the Oct 14 build.

Looked at 2026-10-16 (claude session), not built: the department-duty rows (287(g) holds, police records to an oversight board, facial recognition) are `mechanic: none` with no sourced cost, so a budget request that reads them needs an invented cost per duty. The owner chooses: source a cost per duty (a research item first), or stop writing the organization rows and keep the person rows the bench card reads. The person-side half (the `law-reach:<key>` knowledge a person learns, read by the director's bring-it-up rows, which read only `organization:` keys) is buildable now and is an S item of its own.

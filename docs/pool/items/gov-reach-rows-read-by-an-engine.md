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
claimed-at: 2026-10-16T07:36:46.413Z
---

**What.** Defect 14: an ordinance's duty on a county department and the law facts a person learns are written as reach rows and read by nothing that decides. On main `reachOn` is read only by the bench card (`src/bench/card.ts`). Have an engine read the rows at the moment it decides (a department's budget request reading the duty it now carries, a person's stance reading the law fact they learned), or stop writing the rows nothing reads.

**Rules.** An effect is a read, not a record. Ask why: the cause is named by file and line, or \"not found\". No dice. One rule, all 56 places. Replace, never layer.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a county ordinance that puts a duty on a department changes that department's next budget request or act, named by reach row id and the reading record id, and a test in src/core2/law-reach-group-a.test.ts covers it.

**Files.** src/core2/law-reach/group-a-records.ts, src/core2/law-reach/host.ts, src/core2/modules/budgets.ts

**Notes.** From `docs/reports/stress-audit-laws-2026-10-14/README.md`, defect 14. Verify against main before starting; the audit ran on the Oct 14 build.

Looked at 2026-10-16 (claude session): not built, the item needs a design the owner or the justice and director lines settle. On current main the person-level reach rows are read by the bench card only, and the organization rows for 19 policies carry mechanic "none" (each already a registered stopgap). There is no department budget-request engine to read a duty, so "changes that department's next budget request" cannot be met without inventing a cost per duty (an unsourced number). The honest readers are other lines' work: (1) the director's `law-reached-person` producer (waiting in `docs/pool/items/director-civic-producers-government-last.md`) reads the person rows as a scene; (2) the justice engine reading the juvenile-court-age rule row on a young adult's case, which is `gov-justice-incident-records` (juvenile routing); (3) the police-group duties (oversight, immigration holds, facial recognition) need those engines first. Build those, then this item is a check that each is read. Until then, do not delete the rows: the bench's "what changed" card is how the owner sees a law reach people.

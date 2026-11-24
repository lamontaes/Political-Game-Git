---
id: gov-fee-facility-record-for-tolls-and-parking
title: "No government has a record of a toll road, a parking system or a public hospital"
area: gov
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: filed by hand on branch claude/project-thread-xy4wd4 (cluster 13, PR #9308)
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** A fee a government can set by bill should be offered only where its own records show it runs the thing. A government's budget shows what it spends on parks, health and hospitals, schools and colleges, and its charges row shows what it bills for. Nothing in the world records that a government runs a toll road, a parking system or a hospital of its own, so PR #9308 carries no toll or parking fee at all (series, catalog rows and bill names removed there; they return with this item), and hospital charges are offered only where the budget spends on health and hospitals. Seen: on the draft card's Fees and charges list, where a toll or parking line appears only in a place whose records show one.

**Cause.** Found in code: src/core2/budgets-service-charges.ts reads each government's mix of charged services from the Census state-by-level mix (`servicesOf`), so a town in a state whose local mix holds tolls or hospital charges was offered them (seen at Fairview, Missouri in the Words lead's read of PR #9308). src/core2/reference/local-institutions.ts names a place's hospitals but not who owns them, and no table names a toll road or a parking system. src/core2/fee-levels.ts `FEE_LEVEL_RUNS` holds the rule PR #9308 uses.

**Fix.** Add a facility record the one engine can read: for a hospital, its owner (a government, a nonprofit or a firm) from the institutions file where it names one, estimated with its spread where it does not; for tolls and parking, an enterprise row on the government that runs one, opened from the same Census charge group that sizes its charges. Then `FEE_LEVEL_RUNS` reads the record, and the next row (a public hospital's patients' bills to the government treasury) uses the same owner.

**Time box.** 4 hours for one opus session.

**Rules.** Day one is in motion: the record opens from the engine that makes the flow, never a hand-filled list. No new stopgaps without a registered row.

**Done when.** A second session opens a drawn place, sees a fee line only for a service the government runs by its records, drafts and votes one, and sees the take change; a place with a toll or parking record is offered those lines.

**Waits on.** Nothing.

**Files.** src/core2/fee-levels.ts, src/core2/reference/local-institutions.ts, src/core2/budgets-service-charges.ts

**Notes.** Found while building PR #9308 (fee levels by bill); the Words lead's read named Fairview, Missouri offered Tolls and Public hospital charges.

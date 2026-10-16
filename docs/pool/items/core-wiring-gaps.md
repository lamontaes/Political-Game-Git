---
id: core-wiring-gaps
title: "Wiring gaps: any engine whose output nothing reads"
area: core
kind: wiring
priority: 2
status: done
claimed-by: claude/core-wiring-gaps-scan
pr: #4507
blocked-on:
milestone:
source: "overnight pool item 9; docs/reports/trace-audit-2026-10-14/"
claimed-at: 2026-10-15T23:05:26.217Z
---

**What.** Some engines write records that no other engine reads, which the owner's rule calls an unregistered placeholder. The trace audit and a one-year run of the played world can list them. Each one is either wired to a real reader (a price, a payment, an eligibility, a decision's recorded reasons, a kept measure) or its writer is deleted. The player gains from each fix: a rule or record starts to change what people do.

**Rules.** An effect is a read, not a record: a record nobody reads is a placeholder and gets a reader or is deleted. Replace, never layer: the dead writer is removed in the same change. The chain is the acceptance: name the dollar or rule from record to person. Add one pool item per engine found.

**Done when.** Per engine, in a one-year played world (buildBenchWorld, a seed the builder did not choose, a drawn place from all 56), the reading engine is named by record id, or the writer is deleted and the test in the engine's test file still passes. The trace audit report in docs/reports/trace-audit-2026-10-14/ lists the engine as read afterward. The owner plays it: the rule or record changes something he can see in the town.

**Files.** docs/reports/trace-audit-2026-10-14/, src/core2/modules/, src/core2/data/stopgaps.json

**Notes.** Add one item per engine found.

**Static scan, Oct 15 (claude/core-wiring-gaps-scan).** Scanned every `.table("name")` use in `src`: 159 tables, 19 with writes and no direct read. Read some other way, checked: the business tables `ages`, `closures`, `draws` and `foundings` (through `rows(api, "business", ...)` in the world panels and metrics), `sentences` (through the justice chain), and the news tables `deliveries` and `heard` (through local helper functions). One was a true gap and is fixed: `publicPay` in the budgets engine (one row per public payday, never read; deleted). Four are filed as their own items: `core-unread-carry-requests`, `core-unread-deposit-moves`, `core-unread-outside-costs`, `core-unread-renewal-births-plans`. Not yet checked, and listed in `core-wiring-gaps-trace-pass`: `chairs` (parties), `households` and `payments` (credit), `kin` and `parameters` (renewal), `regions` (regional). The scan reads tables by name in code and cannot see a read made through a helper that builds the name, so a second pass should run on a played year.

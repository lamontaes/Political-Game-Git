---
id: core-counted-flows-monthly-speed
title: "Counted births and moves take a second every 1st of the month in year three"
area: core
kind: cleanup
priority: 2
size: M
status: claimed
claimed-by: claude/core-counted-flows-monthly-speed
pr:
blocked-on:
milestone:
source: "split from core-needs-core-91 (Oct 15, 2026)"
claimed-at: 2026-10-16T05:15:55.584Z
---

**What.** Renewal's counted births and moves (`births-counted.ts`, `applyCountedFlows`) take 1.0 second every 1st of the month in year three. Act on the day something changed, with an index, instead of scanning the counted groups.

**Rules.** An effect is a read; one rule, all 56 places; estimate, never UNKNOWN; speed: measure before and after on the same base and machine, one process at a time.

**Done when.** Measured before and after on the same base and machine in a drawn place's year three: the monthly cost drops and the counted totals are identical.

**Files.** src/core2/births-counted.ts, src/core2/modules/renewal.ts

**Notes.** Split out of `core-needs-core-91`; verify against main before starting.

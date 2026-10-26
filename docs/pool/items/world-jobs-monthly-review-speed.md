---
id: world-jobs-monthly-review-speed
title: "The jobs engine's monthly worker review takes 0.4 seconds a month"
area: world
kind: cleanup
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
milestone:
source: "split from core-needs-core-91 (Oct 15, 2026)"
---

**What.** The jobs engine's monthly worker review takes 0.4 seconds a month. Review only the workers whose circumstances changed since the last review: a new job, a layoff, a raise, a move. Everyone else keeps their job and pay unchanged. Measure the cost before and after on the same base.

**Rules.** An effect is a read; one rule, all 56 places; estimate, never UNKNOWN; speed: measure before and after on the same base and machine, one process at a time.

**Done when.** Measured before and after on the same base and machine in a drawn place with buildBenchWorld: the monthly review cost falls, and every job outcome is identical, by record id.

**Files.** src/core2/modules/jobs.ts

**Notes.** Split out of `core-needs-core-91`; verify against main before starting.

Checked 2026-10-16 against main (verify-first): the same 1,100-day profile in New London, Minnesota (seed eb73b169...075d) shows the jobs engine's `reviewWorkers` at 0.26 s of self time in total, `reviewCountedEntry` 0.11 s and `onCalendarWork` 0.15 s, so well under 0.1 s a month, not 0.4 s. The cost does not reproduce on main. Dropped; reopen with a place and seed that shows it.

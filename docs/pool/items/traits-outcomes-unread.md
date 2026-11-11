---
id: traits-outcomes-unread
title: "The 7 trait-shaped outcomes no engine reads are read by their owning engine"
area: people
kind: wiring
priority: 1
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: traits
model: opus
effort: medium
root: none
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
checked: fable 2026-11-10
---

**What.** Of 23 outcomes personality should shape, 16 were read by their owning engine after the Oct 20 families and 7 were not. Five read only in part: an ordinary worker's job performance, earnings, coping with hardship, how others learn a trait, and speech (job performance and coping with hardship have since merged). Two are stopgapped because no engine runs them in play: partnering and divorce (`SG-TRAITS-partnerships-no-engine`). Make each owning engine read the trait at its researched size.

**Cause.** Found in code: docs/reports/trait-wiring-2026-10-20.json (built by scripts/traits/trait-wiring-matrix.ts) grades 16 of 23 trait-shaped outcomes in data/content/trait-outcomes.json as read by their owning engine; `SG-TRAITS-partnerships-no-engine` (src/core2/data/stopgaps/traits.json:51) covers partnering and divorce. traits-outcome-job-performance and traits-outcome-hardship-coping have since merged, so the matrix must be rebuilt to see what is left.

**Fix.** Rebuild the matrix on current main, list the outcomes still not read (earnings, how others learn a trait, speech, partnering, divorce), and make each owning engine (src/core2/modules/work.ts, jobs.ts, src/core2/emotion.ts) read the trait at the researched size or keep its stopgap.

**Time box.** 6 hours for one Opus session.

**Rules.** An effect is a read, not a record: the outcome counts only when the engine that owns it reads the trait at the moment it decides or pays. No dice: the trait shifts a weighed reason, never a roll. Research before building: sizes come from `data/research/trait-effect-sizes.json`.

**Done when.** A second session runs a played year (buildBenchWorld, every module) in a drawn place and seed it chose and sees the rebuilt docs/reports/trait-wiring-2026-10-20.json grade all 23 outcomes as read by their owning engine, each with a record id and the engine file and line; partnering and divorce either read in play or keep their stopgap row with the item that brings the engine.

**Waits on.** Nothing.

**Files.** data/content/trait-outcomes.json, src/core2/modules/work.ts, src/core2/modules/jobs.ts, src/core2/emotion.ts, scripts/traits/trait-wiring-matrix.ts, src/core2/data/stopgaps/traits.json

**Notes.** Split Oct 24 by the CTO from `traits-wiring-audit` (order `docs/work-orders/lead-traits-2026-10-24.md`).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A wiring-audit roll-up; the live pieces are split into their own items, such as people-impressions-from-witnessed-acts.

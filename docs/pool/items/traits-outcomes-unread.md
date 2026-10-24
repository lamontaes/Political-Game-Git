---
id: traits-outcomes-unread
title: "The 7 trait-shaped outcomes no engine reads are read by their owning engine"
area: people
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** Of 23 outcomes personality should shape, 16 were read by their owning engine after the Oct 20 families and 7 were not. Five read only in part: an ordinary worker's job performance, earnings, coping with hardship, how others learn a trait, and speech. Two are stopgapped because no engine runs them in play: partnering and divorce (`SG-TRAITS-partnerships-no-engine`). Make each owning engine read the trait at its researched size.

**Rules.** An effect is a read, not a record: the outcome counts only when the engine that owns it reads the trait at the moment it decides or pays. No dice: the trait shifts a weighed reason, never a roll. Research before building: sizes come from `data/research/trait-effect-sizes.json`.

**Done when.** In a played year (`buildBenchWorld`, every module) in a drawn place, seed named, `docs/reports/trait-wiring-2026-10-20.json` (rebuilt) grades all 23 outcomes as read by their owning engine, each with a record id and the engine file and line; partnering and divorce either read in play or keep their stopgap row with the item that brings the engine.

**Files.** data/content/trait-outcomes.json, src/core2/modules/work.ts, src/core2/modules/jobs.ts, src/core2/emotion.ts

**Notes.** Split Oct 24 by the CTO from `traits-wiring-audit` (order `docs/work-orders/lead-traits-2026-10-24.md`).

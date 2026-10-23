---
id: traits-wiring-audit
title: "Personality wiring audit: a twin-world checker and the matrix of every trait decision and outcome"
area: people
kind: wiring
priority: 2
size: M
status: blocked
claimed-by: claude/trait-wiring-audit
pr: #5552
blocked-on: traits-wire-money,traits-wire-civic,traits-wire-integrity,traits-decisions-never-run,traits-outcomes-unread,traits-end-to-end-proof
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:10:43.703Z
---

**What.** Rerun the traits-in-play measurement on main at the played trait weight as a reusable checker that compares twin drawn worlds with personalities flat or mirrored. Write the matrix of every personality decision and trait-shaped outcome, with calls, the share personality turned, the research target and why each gap is open. Give every decision its own calibratable trait weight.

**Rules.** Wire to the world: the checker runs one year of buildBenchWorld in a drawn place with every module; No dice: probe is a debug switch that reads, never draws; An effect is a read: outcomes count only where an owning engine reads the trait.

**Done when.** scripts/traits/trait-wiring-audit.ts runs played, flat, mirror and copy twins of a drawn place for one year; the copy twin matches the played world exactly; docs/reports/trait-wiring-2026-10-20.json lists all 82 decisions and 23 outcomes with record evidence; report:check passes.

**Files.** src/core2/trait-probe.ts, src/core2/choice.ts, src/core2/trait-decisions.ts, scripts/traits/

**Notes.** Reopened Oct 24 by the CTO. It flipped to done when the audit PR (#5552) merged on Oct 20, while the wiring the audit found stayed open; the family PRs then put `traits-wiring-audit` as the bare first word of their bodies (#5597, merged Oct 21; #5587, #5657 and #5715, open), which the done-on-merge workflow reads as the item to close (filed as `release-pool-done-bare-id`). The checker and matrix are on main; what stays open is the wiring it found. Split into bounded items: traits-wire-money, traits-wire-civic, traits-wire-integrity, traits-decisions-never-run, traits-outcomes-unread, traits-end-to-end-proof. This item is done when they are. Order: `docs/work-orders/lead-traits-2026-10-24.md`.

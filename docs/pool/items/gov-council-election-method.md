---
id: gov-council-election-method
title: "Council election method from place data"
area: gov
kind: wiring
priority: 2
status: in-pr
claimed-by: claude/gov-council-election-method
pr: #4473
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at: 2026-10-15T21:46:43.070Z
---

**What.** Each place's council or board is elected the way its own records say (at-large, by district, or mixed). Where the repository has no record, estimate at-large with a per-world spread, marked as an estimate with its source. "Wards" is used only where a place's own records use it. State House districts stay the district meaning for state races.

**Rules.** No dice; an effect is a read; one rule, all 56 places; the chain is the acceptance. Estimate, never unknown.

**Done when.** Drawn places show their election method from data or a marked estimate; the council election engine reads it, by record id.

**Files.** src/rules election files; place data

**Notes.** CTO ruling: OWNER-DECISIONS.md, Oct 15 afternoon.

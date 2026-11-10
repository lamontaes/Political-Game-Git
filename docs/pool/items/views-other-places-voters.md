---
id: views-other-places-voters
title: "M1-13: other places' voters have no views to change; the views engine holds only the town's people"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: opus
effort: high
root: design-country-tier
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Roadmap M1-13 asks that other places' voters' views change from their own conditions within real ranges. The views engine (src/core2/modules/views.ts) keeps views for the town's full and counted people only; races elsewhere are counted from each place's 2024 lean (src/core2/electorate-places.ts), which never moves. So nothing about another place's voters changes in a year, and the new M1-13 check fails the clause. Keep a coarse lean per other place, stepped from that place's own conditions (its jobs, prices and the news it gets), read by the races counted there.

**Cause.** Found in code: src/core2/modules/views.ts holds views only for the town's full and counted people; races elsewhere are counted from each place's 2024 lean in src/core2/electorate-places.ts, which never moves; src/bench/m1-13-check.ts (line 132) prints 'no engine keeps or moves other places' voters' views' and fails its views clause.

**Fix.** Keep one coarse movement of lean per state (not per place, so the table stays at 56 rows), stepped monthly by the same view rule the town's people use times the count, from that state's own conditions in the country tier's cells (src/core2/country-model.ts, read through `countryStateNow` in src/core2/modules/macro.ts) and the national news it gets. A race counted in another place reads that place's 2024 lean (src/core2/electorate-places.ts) plus its state's movement. Build it onto the country tier's cells and its monthly step, not as a second simulation; read docs/design/country-tier.md first.

**Time box.** 8 hours for one Opus session.

**Rules.** One model, two tiers: other places' voters move by the same view rule as the town's people, times their count, never a second simulation. No dice: a place's lean moves from its conditions, and real spreads only check the totals.

**Done when.** A second session plays a year of a place drawn from all 56 (place and seed named) and sees other states' coarse leans change from their own conditions with the cause named by record id, a race counted in another place read the moved lean, and the M1-13 command (src/bench/m1-13-check.ts) pass its views clause.

**Waits on.** Nothing. The country tier's state cells are on main (`stepCountry` in src/core2/country-model.ts, read through `countryStateNow` in src/core2/modules/macro.ts).

**Files.** src/core2/modules/views.ts, src/core2/electorate-places.ts, src/bench/m1-13-check.ts

**Notes.** Found by the M0-M2 lead writing M1-13's command, Oct 24. Blocks roadmap M1-13.

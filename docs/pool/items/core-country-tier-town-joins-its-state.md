---
id: core-country-tier-town-joins-its-state
title: "The played town's outside buyers come from its state and the nation in the country tier, by sector, and each seller's share follows its own books; the fixed layoff pace is deleted"
area: core
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
after:
blocked-on:
lead: fable
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; umbrella item core-country-tier-first-slice)
standard: 2
model: sonnet
effort: medium
root: design-country-tier
checked: fable 2026-11-10
---

**What.** About four fifths of a small town's business sales are to buyers outside the town, and today every firm's outside sales move by one smooth factor for the whole place (scaleOutsideSales, called from publishConditions in src/core2/modules/macro.ts). No firm's demand ever differs from its neighbor's, so firms almost never let anyone go, and a fixed layoff pace (reviewTurnover in src/core2/modules/jobs.ts, stopgap SG-LABOR-turnover-fixed-rate) stands in for the churn. The country tier now holds every state's households and sectors. This item makes the town's outside buyers the tier's: each sector's outside demand in the town follows that sector's sales in its state and the nation, each seller's share of it follows its price, capacity and standing against its rivals, and the town's people, jobs and dollars are counted inside their state's sums. Then reviewTurnover and its table are deleted. Seen: the town's jobs month by month (people let go and hired, with Trace opening the employer's sales that fell) and its firms' outside sales (critical path: the country tier).

**Cause.** Found in code: src/core2/modules/macro.ts calls `scaleOutsideSales` (imported at line 59, called from `publishConditions` at line 171) which moves every firm's outside sales by one factor, so firms rarely lay anyone off; `reviewTurnover` (src/core2/modules/jobs.ts line 2295) is the fixed layoff pace (stopgap SG-LABOR-turnover-fixed-rate, src/core2/data/stopgaps/labor.json line 129). Design: docs/design/country-tier.md.

**Fix.** Build the five parts in order; each is an item a session can build from the item alone. Part 1 gives every kind of business a sector. Part 2 makes a seller's outside buyers follow its sector in its state and the nation. Part 3 makes a seller's share follow its own price and capacity. Part 4 counts the town inside its state's sums, once. Part 5 proves the fixed layoff pace is no longer needed and deletes it. This parent is the last check: the Done when below, in three drawn places.

**Time box.** 3 hours for one Sonnet session, for the last check once the parts are done. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice and causes, not chance: a worker is let go because their employer lost sales for a reason on its books, never at a monthly rate. Replace, never layer: the fixed pace is deleted in the same work. One model, two tiers. This item is size L, so the session that claims it splits it into bounded parts first (owner, Oct 15).

**Done when.** A second session, on main in a drawn place with a seed nobody chose, runs 24 months in dev mode and reads the town's jobs month by month with the labor-market proof script (scripts/world-proofs/jobs-24-months.ts): people are let go and hired in most months, each separation's Trace opens the employer's sales record that fell, and the share out of work stays between zero and the number of adults. A search of src/core2 finds no `reviewTurnover` and no layoff rate applied by the month. The same check passes in three drawn places, each named with its seed.

**Waits on.** Its parts: core-country-tier-town-joins-its-state-part-1-each-seller-has-a-sector, core-country-tier-town-joins-its-state-part-2-outside-buyers-follow-the-sector, core-country-tier-town-joins-its-state-part-3-a-sellers-share-follows-its-books, core-country-tier-town-joins-its-state-part-4-the-town-counts-inside-its-state, core-country-tier-town-joins-its-state-part-5-delete-the-fixed-layoff-pace.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/macro.ts, src/core2/residents-economy.ts, src/core2/business-books.ts, src/core2/country-model.ts, src/core2/data/stopgaps/labor.json, scripts/world-proofs/jobs-24-months.ts

**Notes.** Skill labor-market-proof says how to prove it (24 months, inflow and outflow). The stopgap's own text in labor.json lists what was tried on Nov 8 and 9 and why a jobs-only change does not lift the flat line. After: core-country-tier-first-slice.

**Notes (Fable, Nov 10, split).** Split into parts so that no part needs a Fable-level model (owner, Nov 10: every assignment works without Fable): core-country-tier-town-joins-its-state-part-1-each-seller-has-a-sector, core-country-tier-town-joins-its-state-part-2-outside-buyers-follow-the-sector, core-country-tier-town-joins-its-state-part-3-a-sellers-share-follows-its-books, core-country-tier-town-joins-its-state-part-4-the-town-counts-inside-its-state, core-country-tier-town-joins-its-state-part-5-delete-the-fixed-layoff-pace. The parent is now only the last check by a second session.

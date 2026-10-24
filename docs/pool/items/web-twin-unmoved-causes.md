---
id: web-twin-unmoved-causes
title: "Trace why eight no-lag web causes move no record in the twin check"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: added by EFFECT-WEB-WIRING
---

**What.** The twin check (src/core2/outcome-web-twins.test.ts, seed ew20oct26, Paris, Arkansas, three months) shifts each running cause against an unshifted copy. Eight causes with no lag moved no record total: births level, broadband, violent crime to moves, particulates, SNAP receipt, poor roads, the rural speed limit and transit service. For each, find whether the engine reads the factor but no whole death, move or job changed in a town this size, or whether the shift never reaches the reader, and fix the second kind.

**Rules.** An effect is a read, not a record; no dice; one rule for all 56 places; never narrow the twin check to make it pass.

**Done when.** Each of the eight is either shown moving an engine record in a twin run by record id, or carries a stopgap naming why it cannot in that window; the report's twin line is updated.

**Files.** src/core2/outcome-web-twins.test.ts, src/core2/health-web.ts, src/core2/modules/moves.ts, src/core2/modules/place-prices.ts

**Findings (twin trace, seed ew20oct26, Paris, Arkansas, three months).**

- The twin shifted the web's month row once, on the 3rd; the web rewrites that row when a law takes effect, which dropped the shift, so a cause's first month of effect never reached the engines. The twin now shifts again after each rewrite.
- The compare summed only top-level numbers, so nested records (expected births, death-cause carries, plans) and changed labels were invisible. It now sums nested numbers and checksums text.
- Moved an engine record after both fixes: births.rate-index (renewal countedCarry, counts), broadband.home-access (jobs, business, crime and others), crime.violent (moves pulls, counted-moves pulls), env.particulates (renewal countedCarry, counts), roads.poor-condition-pct (finance and business), roads.rural-interstate-speed-limit (renewal countedCarry, counts), transit.service-access (budgets, credit, others).
- Cannot move: program.snap-receipt. Its only link, snap-to-food-insecurity, has no engine reader (SG-WEB-unread-household-food-insecurity). Also unread: transit-loss-to-unemployment (SG-WEB-unread-labor-unemployment-pct), broadband-to-employment (SG-WEB-unread-labor-employment-rate), home-internet-to-scores (SG-SCHOOL-links-not-running).
- The matrix `twins` block still holds the old run; refresh it with all causes and EFFECT_TWINS_WRITE.

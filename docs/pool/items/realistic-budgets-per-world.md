---
id: realistic-budgets-per-world
title: "Public budgets, federal debt and Treasury lines open drawn per world"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/realistic-budgets-treasury
pr: #6565
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
claimed-at: 2026-10-28T06:01:03.275Z
---

**What.** Rows 50 to 52 of docs/reports/real-statistics-in-play-2026-10-27.md: federal, state and local budget lines per resident, federal debt holders, Treasury payees and federal spending by state. Each opens on the published value. Tax and benefit rates in law stay. The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed.

**Rules.** Estimate, never UNKNOWN: Each value starts from the published one as the center of a per-world spread drawn from the world seed at Start, tagged in its parameter table. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** In two played worlds on drawn places and seeds, each listed statistic differs between the worlds and from its published row, named by record id; the guard covers it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/budget-stakes.ts

**Notes.** Filed by the realistic-not-real audit of Oct 27.

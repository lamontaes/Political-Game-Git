---
id: realistic-money-and-population-per-world
title: "Household cash, living costs, benefits, deposits, tuition and town size open drawn per world"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by:
pr: #6598
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
claimed-at:
---

**What.** Rows 14 to 18 and 28 of docs/reports/real-statistics-in-play-2026-10-27.md: SCF starting cash, living costs and goods prices, the average Social Security benefit, county deposits, private school share and tuition, and place population. Each opens on the published value. The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed.

**Rules.** Estimate, never UNKNOWN: Each value starts from the published one as the center of a per-world spread drawn from the world seed at Start, tagged in its parameter table; a benefit formula set in law stays. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** In two played worlds on drawn places and seeds, each listed statistic differs between the worlds and from its published row, named by record id; the guard covers it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/starting-cash.ts, src/core2/opening-finance.ts, src/core2/opening-income.ts, src/core2/modules/credit.ts, src/core2/opening-private-tuition.ts, src/core2/gov-rules/place-population.ts

**Notes.** Filed by the realistic-not-real audit of Oct 27.

Oct 29 (CTO): set done; PR #6598 merged (the done flip failed while branch protection refused the flip job's push).

---
id: gov-recall-bars-calendar-months
title: "A recall bar stated in calendar months is read as calendar months from the term's own dates"
area: gov
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/data/campaigns/recall-bars.json stores every bar as days (openingDays, closingDays), and the recall engine in src/core2/modules/recalls.ts compares days since the term began and days until it ends. Several statutes count the bar in calendar months (six months after the term begins, or before it ends; two months in one row), stored today as 182 or 61 days and tagged ESTIMATED with stopgapId SG-GOV-recall-bars-calendar-months. Six calendar months run 181 to 184 days, so a fixed count can admit a date the statute bars: for a term ending January 1, 2027, July 2, 2026 is inside six months but 183 days away. Let a bar row state calendar months (openingMonths, closingMonths), and have the engine compare the date with the term's start plus those months, or its end less them, with a day past a month's end landing on its last day. Then retag those rows SOURCED from their statute quotes, drop their estimatedFrom, spread and stopgapId, and close SG-GOV-recall-bars-calendar-months.

**Rules.** One rule, all 56 places: a month bar is a per-place row in data any place's statute can use, never a place named in logic. Replace, never layer: rows counted in months lose their day values, estimate tags and spreads in the same change. No dice: the bar is a date comparison, never a draw.

**Done when.** A test in src/core2/recalls.test.ts asserts that a six-month closing bar on a term ending January 1, 2027 bars July 2, 2026 and admits June 30, 2026, and that a day-counted row still returns its days; scripts/research/check-core-research.ts passes with the month rows SOURCED; and a one-year run of the played world (buildBenchWorld, a place whose bar is in months, drawn from all 56 and named with its seed in the PR) shows a recall petition started no earlier than that many months after the term began, named by recall record id and the term's dates.

**Files.** src/core2/modules/recalls.ts, src/core2/recalls.test.ts, src/core2/data/campaigns/recall-bars.json, data/research/core/recall-timing-statutes-2026.json, scripts/research/check-core-research.ts, src/core2/data/stopgaps.json

**Notes.** Filed Oct 24, 2026 from the merger's second send-back of PR 5853 (research-core-recall-petition-windows): Louisiana's six-month closing bar was tagged SOURCED as 182 days. The fixer retagged the month rows ESTIMATED with the calendar's spread; the engine is unchanged.

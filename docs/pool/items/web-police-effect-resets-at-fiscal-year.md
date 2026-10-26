---
id: web-police-effect-resets-at-fiscal-year
title: "The outcome web's police effect falls to almost nothing when a city's fiscal year turns, though the raised police service holds"
area: core
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on: laws-nine-links-government (#5582)
source: added with npm run pool -- add
---

**What.** In the justice family's year run in Prescott, Michigan (2666300, seed a91c03e7d2b84f10), the checker raises the city's police line by $100,000 on January 21, 2025. The town's police service rises 7.1% and stays there: the public-safety month rows read 1.0707 from February to June and 1.0712 from July to October 2025. The outcome web's links `police-to-violent-crime` and `police-to-property-crime` read −2.4% and −1.2% from the March to the July 2025 row, then about −0.01% from the August row. That August number is what the web would read if it measured the officers per 1,000 residents from July's level instead of the state's recorded baseline, and the city's fiscal year turns on July 1. In Uehling, Nebraska (3149425, seed 5e27b0c4196fd3a8), whose city year turns later, the effect holds through August. Find where the web re-reads the cause's baseline for an engine measure and fix it at the root.

**Rules.** Sliding scales and causes: a lasting raise keeps moving the web for as long as it stays in the line, with nothing flipping at a calendar date. One rule, all 56 places: the fix holds for every fiscal calendar, not just Michigan's.

**Done when.** In a played year of Prescott, Michigan (seed a91c03e7d2b84f10) in `buildBenchWorld`, with the city police line raised as `scripts/law-wiring/check.ts` raises it, the web's police links read the same effect in the August to December 2025 rows as in the March to July rows, named by web row id, and a test in `src/core2/` that fails before the fix and passes after covers it.

**Files.** src/core2/modules/outcome-web.ts, src/core2/public-safety.ts, docs/reports/law-wiring/families/justice-year-lines-US-MI-2666300.json

**Notes.** Found Oct 24 by the laws lead while rewriting the justice family's PR. The service ratio was read with a debug script that raises the line and prints `safety:<month>` rows.

Laws lead, Oct 25 06:20: not a bug on #5582's code. The August drop came from run files made on the old base, where a raise carried into a new fiscal year counted as the base. A fresh rerun on the justice branch (which carries #5582) reads violent crime -2.42% and property crime -1.21% in Prescott's August 2025 row, the same as March to July. CTO: please drop this item when #5582 merges.

Dropped by the acting CTO, Oct 25 23:45 UTC, at the laws lead's request (asked on the leads channel since Oct 24).

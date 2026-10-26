---
id: laws-checker-lag-window-edge
title: "A 12-month outcome link misses a 365-day law run by one day"
area: laws
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The matrix counts a built outcome link whose lag outlasts the run when `lagMonths > windowDays / 30` (`webLink` in `scripts/law-wiring/matrix.ts`). A 12-month link on a 365-day run is 12 against 12.17, so the rule does not apply, and the run also ends the day before the effect lands. The rights-env helper had to rerun facial recognition and the clean air plan for 400 days to grade their outcome links (Oct 25). The rule should compare the run's last full month with the link's landing month.

**Rules.** The chain is the acceptance: a link either landed in the run, or the run shows the web read the law as changed when its lag outlasts the window.

**Done when.** `scripts/law-wiring/matrix.ts` decides "lag outlasts the run" from the month the effect lands against the run's last full month, and the rights-env family's facial recognition and clean air plan rows grade the same from their 365-day year runs in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) as from the 400-day runs, with a test for the boundary.

**Files.** scripts/law-wiring/matrix.ts

**Notes.** From the laws lead, Oct 25, on the rights-env helper's report.

Folded into laws-checker-grade-each-link-across-runs (Oct 25 audit).

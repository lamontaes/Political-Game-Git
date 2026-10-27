---
id: justice-low-level-bail-and-costs
title: "Minor-offense cases take the felony court cost and the general bail share"
area: laws
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on: justice-low-level-offenses
source: added with npm run pool -- add
---

**What.** In `justice-low-level-offenses`, the new minor-offense cases reuse the case flow's existing figures: each case's court cost is the felony figure, and a poor group's arrestees are held before trial at the same share as other non-violent adults (inferred from the code, `src/core2/public-safety.ts`, `courtCosts` and the bail step). Misdemeanor courts cost less per case and hold fewer people before trial.

**Rules.** Research before building: sourced misdemeanor court costs and pretrial detention shares (BJS and court statistics), each number in the parameter table tagged with its source and spread. No dice.

**Done when.** `src/core2/data/public-safety/parameters.json` has sourced rows for a misdemeanor case's court cost and pretrial detention share, the case flow reads them for minor-offense cases, and the justice family test passes on its named seed and a fresh one, naming a minor case's court-cost journal entry.

**Files.** src/core2/public-safety.ts, src/core2/data/public-safety/parameters.json

**Notes.** Filed by the laws lead, Oct 25, from the low-level offenses helper's report.

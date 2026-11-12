---
id: justice-low-level-bail-and-costs
title: "Minor-offense cases take the felony court cost and the general bail share"
area: laws
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on: justice-low-level-offenses
lead: laws
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Minor-offense cases take the felony court cost and the general bail share. In the low-level offenses work, the minor-offense cases reuse the case flow's existing figures: each case's court cost is the felony figure, and a poor group's arrestees are held before trial at the same share as other non-violent adults. Misdemeanor courts cost less per case and hold fewer people before trial. Add sourced misdemeanor court-cost and pretrial-detention rows and read them for minor-offense cases.

**Cause.** Found in code: `courtCosts` (src/core2/public-safety.ts, line 1238) and the `courtCostPerCaseMinor` parameter (read at lines 1221, 1246 and 1333) apply one court-cost figure to every case, and the bail step uses `unableToPost` (line 976) for all adult cases; the minor-offense stream is the `LOW_LEVEL` offense.

**Fix.** Add sourced misdemeanor court-cost and pretrial-detention-share rows to src/core2/data/public-safety/parameters.json (BJS and court statistics, each tagged SOURCED or ESTIMATED with its spread) and read them for minor-offense cases in `courtCosts` and the detention step.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: sourced misdemeanor court costs and pretrial detention shares, each number in the parameter table tagged with its source and spread. No dice. Estimate, never UNKNOWN: a figure with no source starts from the felony figure's real average and is marked ESTIMATED.

**Done when.** A second session, not the builder, runs the justice family test on its named seed and a fresh one in a drawn place of the played world (`buildBenchWorld`, place and seed named). src/core2/data/public-safety/parameters.json has sourced rows for a misdemeanor case's court cost and pretrial detention share, the case flow reads them for minor-offense cases, and a minor case's court-cost journal entry is named by record id.

**Waits on.** Nothing (justice-low-level-offenses is done).

**Files.** src/core2/public-safety.ts, src/core2/data/public-safety/parameters.json, src/core2/justice-low-level.test.ts

**Notes.** Filed by the laws lead, Oct 25, from the low-level offenses helper's report.

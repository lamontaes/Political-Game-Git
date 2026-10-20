---
id: world-public-opening-floor-proof
title: "Prove in a played world that a public employer's opening is posted at the public pay floor: six drawn towns opened no public position in a year"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The merge audit asked for a played-world test that enacts a public pay floor, lets a public employer (town, county, school) open a position through the jobs engine, hires into it and checks by record id that the hire's pay meets the floor. On Oct 20 six drawn towns (Arbon Valley ID, Port Wing WI, Fairplay GA, Telford PA, Casco ME, Ravenswood WV; seeds in the PR for this item) opened no position at any public employer in a year after the floor was enacted, so the path the floor hooks (payFor in src/core2/modules/jobs.ts) is not reached in ordinary play at public employers. Find why public staff do not turn over through the jobs engine (budget-set staff, retired templates?) and make a leaver at a public employer open a replacement there, or move the floor to where public pay is really set.

**Rules.** No dice. Wire to the world: proven in buildBenchWorld with a drawn place. Replace, never layer.

**Done when.** In a drawn place (named in the PR body), a public employer's leaver is replaced by an opening posted through the jobs engine within a year, a test in src/core2/public-pay-floor-hire.test.ts enacts a floor, then asserts by record id that the opening and its hire are paid at or above publicPayFloorHourly, and SG-GOV-public-pay-floor-owner's text matches what is proven.

**Files.** src/core2/modules/jobs.ts, src/core2/public-pay-floor-hire.test.ts, src/core2/data/stopgaps.json

**Notes.** Split from release-merge-audit-oct20-morning-fixes fix 3 (PR #5285). Found Oct 20 by claude/political-game-pool-yucp92-aq.

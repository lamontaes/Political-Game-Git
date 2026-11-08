---
id: economy-recessions-from-causes
title: "The national economy has cycles that come from causes (credit, demand, prices), not a settling loop"
area: world
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The national month step (src/core2/macro-model.ts stepMacroMonth) is a damped loop (output gap persistence, real rate, Okun, Phillips) with no shock source, so every place's unemployment settles and stays flat for twenty years: Ripley TN, Carlisle OK and Greenup IL held 3.8 to 4.7 percent for twenty years in the Dev Tester's drift runs (Nov 8). Real economies have recessions that come from causes inside them. A recession here must arrive the same way: as a record one engine wrote and another reads, never a scheduled date.

**Rules.** Standing rules: no dice (no scheduled or rolled recession), sliding scales and causes (a shock is a record another engine wrote: household and business loan losses and defaults from the credit module, a fall in home values from housing, a price or wage shock from the macro prices, a policy change), one engine for the national step, one rule for all 56 places, estimate not unknown. Real recessions (NBER dates, BLS unemployment) check the totals; they never schedule one.

**Done when.** Over a twenty-year played run in a place drawn from all 56 (name the place and seed), the national unemployment rate rises by at least two points in at least one episode and recovers, each episode traced by record id to the cause that moved the output gap (for example loan losses booked by the credit module in the months before it), and the same run with the cause removed (twin world, no losses) stays within a point of the settling path; US unemployment over many seeded runs shows episodes at a frequency and depth within the NBER postwar range (about one in every six to eight years), checked as a total, not set as one.

**Files.** src/core2/macro-model.ts, src/core2/modules/macro.ts, src/core2/modules/credit.ts, src/core2/modules/housing.ts

**Notes.** Found by the Dev Tester (Nov 8) and sent by the Coordinator. Jobs and economy session, not started: it needs a design of which records feed the output gap and a calibration against NBER episodes; the labor market engine downstream (jobs-elsewhere, reviewTurnover, the entry rate feedback) already reads the state's unemployment each month, so a real cycle moves every town.

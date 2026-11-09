---
id: nation-president-orders-by-series
title: "An unplayed President and administration change a federal law series by order or rule, so the next one can reverse it, through the one executive engine"
area: gov
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** presidentialOrders and pardonable in office-day-federal-president.ts return nothing (SG-OFFICE-FED-presidential-orders, SG-OFFICE-FED-pardons): the executive engine's orderableBy reads only a state's canOrder research, so a President who is not played never issues an order and a played one has none to issue. Researched precedents of back-and-forth by order (Nov 9, sourced from whitehouse.gov, presidency.ucsb.edu, govinfo.gov and KFF): federal contractor minimum wage (EO 13658 Obama 2014 at 10.10 dollars, EO 14026 Biden 2021 at 15 dollars, EO 14236 Trump 2025 revoking 14026), federal-employee bargaining and Schedule F (EO 13957 Trump 2020, EO 14003 Biden 2021 revoking it, Trump 2025 reinstating it), transgender military service (EO 14004 Biden 2021, EO 14183 Trump 2025) and the Mexico City policy (memoranda, seven flips 1984 to 2025). None of these is a federal law series the game reads today (the only bargaining series is the state public-sector one), so an order on them would write a record no engine reads. The federal series an engine reads and an administration can set by rule or determination are the better first slice: limit-power-plant-carbon (an EPA rule under Clean Air Act section 111; the climate engine and the emissions link read it, so an order reaches emissions, warming and the hazard levels), immigration.admit-more-immigrants (the President's annual refugee admissions determination) and the series the powers catalog lets the federal executive move.

**Rules.** One executive engine: the governor path (pendingGovernorOrders and issueOrder in executive.ts) generalized to a federal ORDERABLE set with a cited authority per series, never a second order system. The President decides from their own view of the question and the law now (viewOn), never a roll; a played President chooses. Day-one effect: the sitting President of the opening world would flip some series on the first day, which changes every world's baseline, so the Laws and effects line rules on the opening values and the timing of a first order before it ships. Pardons need the justice engine to record which sovereign prosecuted (a federal conviction); build that in the justice engine, not here.

**Done when.** In a played world at a place drawn from all 56 with a seed the builder did not choose, an unplayed President issues an order on a federal series from their view, a law row for the series in force from the next day cites the order and the President, and an engine reads it (the climate's emissions index for the power-plant series, 24 months on); the next President of the other side reverses it by their own view; a test names the place, seed and record ids; presidentialOrders lists what the played President can issue.

**Files.** src/core2/modules/executive.ts, src/core2/modules/president-acts.ts, src/core2/office-day-federal-president.ts, src/core2/modules/climate.ts, data/research/executive/

**Notes.** Found by Nation, Nov 9. Federal Register and congress.gov pages were blocked in research, so the authority for each series (the statute and the precedent) is still to quote from fetched pages. Coordinator order of Nov 9: executive orders and pardons through the one executive engine, after the town disasters.

---
id: nation-president-orders-by-series
title: "An unplayed President and administration change a federal law series by order or rule, so the next one can reverse it, through the one executive engine"
area: gov
kind: feature
priority: 3
size: L
status: open
standard: 2
claimed-by:
pr:
blocked-on: nation-president-orders-by-series-part-1-more-series-authorities, nation-president-orders-by-series-part-2-reversal-and-reader, nation-president-orders-by-series-part-3-played-president-orders, nation-president-orders-by-series-part-4-pardons
source: added with npm run pool -- add
after:
lead: nation
model: sonnet
effort: low
root: rc7-player-cannot-drive
checked: fable 2026-11-10
---

**What.** An unplayed President already weighs and issues one federal order (limit-power-plant-carbon, from src/core2/data/executive/federal-orders.json) through the executive engine, but only that one series exists, the played President has no screen over orders, and `pardonable` still returns nothing (SG-OFFICE-FED-pardons). Make the President change a federal law series by order or rule so the next one can reverse it, through the one executive engine, in four parts: more series with quoted authorities, reversal and a reader, the played President's orders, and pardons. Researched precedents of back-and-forth by order (Nov 9; whitehouse.gov, presidency.ucsb.edu, govinfo.gov, KFF): federal contractor minimum wage (EO 13658, EO 14026, EO 14236), federal-employee bargaining and Schedule F (EO 13957, EO 14003, 2025), transgender military service (EO 14004, EO 14183) and the Mexico City policy (seven flips, 1984 to 2025). None is a federal series an engine reads today, so the first slice is the series an engine reads. Seen: federal laws in force changing when a new President reverses an order, in the Laws screen and the paper.

**Cause.** Found in code: src/core2/data/executive/federal-orders.json lists one order; `presidentialOrders` (line 974) and `pardonable` (line 985) in src/core2/office-day-federal-president.ts return the one-series set and nothing.

**Fix.** Build the four parts in order; this item adds no code of its own.

**Time box.** 12 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One executive engine: the governor path (pendingGovernorOrders and issueOrder in executive.ts) generalized to a federal ORDERABLE set with a cited authority per series, never a second order system. The President decides from their own view of the question and the law now (viewOn), never a roll; a played President chooses. Day-one effect: the sitting President of the opening world would flip some series on the first day, which changes every world's baseline, so the Laws and effects line rules on the opening values and the timing of a first order before it ships. Pardons need the justice engine to record which sovereign prosecuted (a federal conviction); build that in the justice engine, not here.

**Done when.** A second session, not the builder, plays a world at a place drawn from all 56 on a seed nobody chose and sees an unplayed President issue an order on a federal series from their view, a law row from the next day citing the order and the President, an engine reading it, and the next President of the other side reversing it, by record ids; presidentialOrders lists what the played President can issue, and a pardon ends a federal sentence.

**Waits on.** The four parts: nation-president-orders-by-series-part-1-more-series-authorities, nation-president-orders-by-series-part-2-reversal-and-reader, nation-president-orders-by-series-part-3-played-president-orders, nation-president-orders-by-series-part-4-pardons. Also a Laws-and-effects ruling on the opening values and the timing of a first order (a sitting President would flip some series on day one and change every world's baseline).

**Files.** src/core2/modules/executive.ts, src/core2/modules/president-acts.ts, src/core2/office-day-federal-president.ts, src/core2/modules/climate.ts, data/research/executive/orders-and-vacancies-2026-11.json

**Notes.** Found by Nation, Nov 9. Federal Register and congress.gov pages were blocked in research, so the authority for each series (the statute and the precedent) is still to quote from fetched pages. Coordinator order of Nov 9: executive orders and pardons through the one executive engine, after the town disasters.

Nov 10, Fable audit: the audit of Nov 9 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 3, "Washington", read in the code and measured in a played year in Caño Martín Peña, Puerto Rico, seed 50fe2d1143af) found that "The President nominates a cabinet and weighs one executive order (`src/core2/data/executive/federal-orders.json:5`)." Confirmed on main, Nov 10: that file's `orders` list holds one row, `limit-power-plant-carbon`, read by `issueFederalOrder` and `presidentialOrderDecisions` in `src/core2/modules/executive.ts`. So the first slice named in What exists for one series, and the President still has one thing to decide by order; the admissions determination and the other federal series are not there. The audit did not count orders issued in the year it played. The owner's ruling it quotes, November 8: "The other 49 states changing laws and, stuff happening nationally and locally and stuff is to the utmost importance, even simulation kind of stuff." The other parts of the audit's "Washington barely acts" finding have evidence on `gov-congress-passes-policy-laws` (Congress introduced five bills in the year and the Senate none) and `justice-federal-case-stream` (the federal courts hear no cases).

**Notes (pool redo, Nov 10).** Checked on main: `presidentialOrders` no longer returns nothing (it returns `federalOrderable()`, one series) and an unplayed President already issues that order from president-acts.ts, so the brief's "unplayed President orders" part became "more series with authorities" and "reversal and a reader". docs/audits/fable-vision-2026-11-09.md is not on main (it lives on branch audit/fable-vision).

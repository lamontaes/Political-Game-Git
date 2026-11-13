---
id: world-founded-business-outside-sales-flow-starts-at-zero
title: "A new shop or factory opens and its outside customers pay it nothing"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: Account lead T34 (Opus)
pr:
blocked-on:
after:
lead: jobs
model: opus
effort: medium
root: none
source: found by Account lead T30 while checking world-business-founding-no-purchase-kinds
claimed-at: 2026-11-13
checked:
branch: claude/project-thread-o3ckul
---

**What.** A business founded in a played world gets its customers from the incumbents by `shiftPurchaseShare`, and the founding record says it won a positive monthly customer spend. But in a played 600-day world at Skagway, Alaska (US-AK 0270760, buildBenchWorld seed 8f3ccb88950177eb7865cdf9e9309e08981110a90485863070461caa82dfce65, drawn as `a:1` for the purpose founding-sweep, twoLevel), 5 of 9 founded businesses ended with an outside-sales flow whose `amountMinor` is 0: manufacturing founded 2025-06-01, 2025-07-01, 2025-09-01 and 2026-07-01, and an inn founded 2026-02-01 (flow ids `entrant:organization:founded:<kind>:<founder>:<date>:0`). The other four founded businesses and all 21 other live outside-sales flows in that world pay a positive amount. The player sees a new factory or inn that opens, hires and takes a loan, and never sells outside, so it earns nothing from outside buyers and closes or limps along. One inn (2025-09-01) did close on 2026-05-01. Seen: the town's business list and its founders' books in a played world.

**Cause.** Measured: by Account lead T34 (Nov 13), reproduced on the train at Skagway with the seed above. The zero is the share, not the factor or the limit: `divideOutsideSales` (src/core2/residents-economy.ts) sets each seller's share to its service level times the kind's total over what all sellers serve, and the service level is `firmStaffing(...).serviceLevel = staff / target` (src/core2/modules/jobs.ts). A founded business joined the jobs engine through `registerEmployer` with no staff and `need: 0`, so at its first staffing review its level was 0, and the next monthly scaling set its outside flow to 0. Every entrant hit 0 one to two months after opening. Need then grows only by `jobsStaffGapActedPerMonth` (0.15) x gap x cash reach a month, and a firm posts an opening only when need reaches 1. A firm opening with a staff of 1 whose buyers are all outside saw its target fall as its receipts read zero, so need leveled off below 1 (0.28 to 0.59 at day 300) and it never posted a job: locked at zero. Inns with larger opening staffs and household buyers posted, hired in 3 to 5 months and came back.

**Fix.** In src/core2/modules/jobs.ts: `registerEmployer` seeds `need` with the opening staff, so a founded business posts its opening jobs at its first review, as a real startup hires before it opens; and the employer row carries `hiring` while it has no staff and its opening postings stand, during which `firmStaffing` gives no reading, so the business keeps the outside buyers its founding won (it sits out the division, as an unreviewed firm already did). Its first hire, or its openings lapsing, ends the hold; from then its staff divides its customers like any firm's, even to zero. The founders checked at Skagway hold jobs elsewhere (one of nine also works at their own inn), so there is no working owner to count toward staff.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** Wire to the world: the share an entrant wins is read by the same monthly scaling as everyone's. No dice. One rule, all 56 places: the check draws its place and names it with the seed.

**Done when.** A second session (not the builder) plays a 600-day played world at Skagway AK seed 8f3ccb88... and two drawn places, every business founded in the run that won outside buyers has a positive outside-sales amount a year later, named by flow id; a test beside src/core2/market-entry.test.ts covers it; a year of `speed:year` is within 20% of its base. On screen: nothing yet; it would show on the town's business list and its jobs, and the founders' books.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/market-entry-opening-staff.test.ts (residents-economy.ts and business.ts unchanged)

**Notes.** Filed by hand on the Account lead T30 branch. The seed is the hash of "a:1" and "founding-sweep" through drawPlace in scripts/core2-year/place.ts.

A kind with no incumbent in the place has no market, so a town can never gain its first business of a kind (business.ts marketRoom); whether that is realistic is an open design question, not part of this item.

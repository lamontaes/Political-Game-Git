---
id: core-fast-clock-skipped-year-prices-rise-more-than-a-played-year
title: "A skipped year's prices rise more than the same year played, in some places"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: design-country-tier
source: found Nov 10 by the builder of the fast clock's part 3 (pull request #8238)
checked: fable 2026-11-10
---

**What.** After the fast clock's part 3, a skipped year moves prices, but in some places it moves them more than the same year played day by day. A player who skips ahead should come back to about the world they would have reached by playing. The gap is outside the fifth the fast clock's parts hold themselves to.

**Cause.** Measured: three causes, found with a month-by-month probe of every business's review in Houston, Delaware (seed 7b20d94f3ce81a6655c0), Chumuckla, Florida (seed 2fdde3f8466bb2ae9991) and Oak City, Utah (world seed 8beeea108f57624a9f74ea03af24bff99c3032859dadb259b322fc1c26011c32), on main at 6af036c7. Found in code:

1. The played year has more businesses in its price average. The test's figure (townMetrics, src/core2/modules/world-metrics.ts:143) averages every open business's price over its opening price. In play, the press engine gives each local outlet business books on its first day (`enrollPressEmployers`, src/core2/modules/press.ts:397 and 868), and the business engine founds firms each month (`foundings`, src/core2/modules/business.ts:1721). The business engine opens only from `onDay` (business.ts:2586) and the press books are made only from `onDay`. A skip runs neither. In Houston, played had 38 firms against 31 skipped. Four press outlets (organization:press:newspaper:0 and :1, radio:0 and television:0 of jurisdiction_9b7aeeda90a8d3b2) sat at 1.0157, and three manufacturing firms were founded on Jun 1, Sep 1 and Nov 1 (organization:founded:manufacturing:person_ef531d10250053d9:2025-06-01 and two more). Each founding cuts the incumbents' demand by the entrant's share (`book.anchorAnnualDemandMinor *= ...`, business.ts:2182). Houston's two manufacturing incumbents (organization_07e22a76d660958c and organization_07e22b76d660973f) fell to 0.556 of capacity, so their reviews cut prices to 0.837, while the same firms rose to 1.028 in the skip. Over the 31 firms both years share, Houston rose 3.23 percent played and 3.23 percent skipped; all 38 played firms rose 2.60 percent. In Oak City, played rose 1.73 percent (34 firms) against 3.57 percent skipped (28). In Chumuckla, 3.50 percent (38) against 3.18 (31).
2. A skipped month's reviews read a month that is not yet booked. On the first of a skipped month, `runResultsDay` (src/core2/life.ts:594) runs each module's `onResultsMonth` in module order: work, finance, residents, macro, jobs, business, place-prices and so on. Finance's `catchUpFinanceMonth` (src/core2/modules/finance.ts:122) runs the business reviews. Each review reads the previous month's `paidIncomeByPlaceMonth` (src/core2/finance-state.ts:1372). That happens before residents' `runResidentsDay` (src/core2/modules/residents.ts:1590) books the month's counted wages. In Houston, the Mar 1 review of organization_1591075a150067d2 read $114,000 of February pay, against $473,000 booked by the end of that day (figures here are in dollars; the journal keeps cents). The review takes that partial month as its income basis, so the skipped town's income ratio moved between 0.91 and 1.46 with whatever had been booked, while the played one moved between 1.16 and 1.34. Full workers' pay is also absent in a skip (registered SG-SPEED-results-mode-work-attendance, src/core2/modules/work.ts:1007).
3. The economy's first month comes a month late in a skip. Macro opens from `onResultsMonth` (src/core2/modules/macro.ts:793) on the first of February, after that day's dated work has already run. So its first month is published on Mar 1 instead of Feb 1. Every skipped review all year reads a general price factor one month behind: 1.0238 against 1.0279 on Jan 1, 2026, in Houston. The jobs and place-prices engines open the same way.

Probes, in a working copy and undone: with no foundings in either year, Houston's played year rose 4.20 percent against 3.23 skipped. With residents' catch-up run before finance's, Houston's skip rose 3.97 percent, and its income ratio followed the played one (reach 1.034 skipped, 1.050 played). With that order and the business engine also opened in the skip, the skip still founded no firm. The played founder, person_ef531d10250053d9, chose to found on Apr 1 with $11,500 of savings. In the skip the same person had no savings and falling cash, because full workers are paid nothing in a skip.

**Fix.** Four changes, in this order. Rerun the part's test after each one.

1. Reviews read a booked month. On the first of a skipped month, the finance catch-up's reviews must run after residents' catch-up has booked the month's counted wages. Add a hook that `runResultsDay` (life.ts) runs after every module's `onResultsMonth`, and move `catchUpFinanceMonth`'s work into it. Do not name a module in life.ts.
2. Engines open on the first skipped day. The engines that open from `onResultsMonth` (macro, jobs, place-prices) must open on the first day of a skip, before that day's dated work, not on the next first of the month. Then the economy publishes the same first month in both years.
3. The business and press engines run in a skip. Give the business module an `onResultsMonth` that opens it the way `openOnce` opens macro, so its monthly dated work (`business-month`: month, foundings, scheduleMonth) runs in a skip. Have the press module make its outlets' business books (`enrollPressEmployers`) from `onResultsMonth` too.
4. Full workers are paid in a skip. This is SG-SPEED-results-mode-work-attendance. A founder's savings come from pay, so without it the skip founds no firm and fact 1 stays. If the work engine cannot pay a full worker's month without an attendance decision, stop after step 3. Report the gap that remains, with the part's test showing the 31-firm and all-firm averages, and leave this step to the speed lead as its own item.

**Time box.** 5 hours for one Opus session for steps 1 to 3, with the part's test run after each step in Houston (seed 7b20d94f3ce81a6655c0) and one fresh draw. Step 4 is a separate item if it cannot be done without an attendance decision.

**Rules.** Speed: a skipped year runs as results, so the fix may not make it run every engine's every day. No dice. Sliding scales and causes. One rule, all 56 places. Replace, never layer: the order fix replaces the current one, and no second review path is added. Follow .agents/skills/speed-work/SKILL.md for timing and .agents/skills/money-economy/SKILL.md for reading prices.

**Done when.** A second session runs src/core2/results-mode-pay-prices-jobs.test.ts on main in Houston (seed 7b20d94f3ce81a6655c0) and in two drawn places it chooses by a seed nobody picked, naming the seeds. In each, the skipped year's first review of a business reads the previous month's paid income as booked at the end of that day. The skipped year has an economy month dated the first of February. The skipped year shows press outlets' books and, once step 4 is in, at least one founding where the played year has one. The printed price changes are within a fifth of each other. If step 4 is left out, the second session reads the remaining gap in the pull request, firm by firm.

**Waits on.** Nothing. Pull request #8238 (part 3) is on main.

**Files.** src/core2/life.ts, src/core2/types.ts, src/core2/modules/finance.ts, src/core2/modules/residents.ts, src/core2/modules/business.ts, src/core2/modules/press.ts, src/core2/modules/macro.ts, src/core2/modules/work.ts, src/core2/finance-state.ts, src/core2/results-mode-pay-prices-jobs.test.ts

**Notes (Fable, Nov 10, reopened).** Pull request 8239 only wrote this item's cause; it built nothing. Its first line named this item, so the merge marked it merged by mistake. It is open again and nothing here is on main yet.

**Notes (cause finder, Nov 10).** Ran on main at 6af036c7. The part's test with seed 7b20d94f3ce81a6655c0 (Houston) printed 2.60 percent played and 3.23 percent skipped. That is now just within a fifth; the item first measured 3.26. A fresh draw, Ontario, Oregon (seed 4da5df57c7c0edbb428c), printed 3.15 and 3.63. No seed was named for Chumuckla. With seed 2fdde3f8466bb2ae9991 it printed 3.50 played and 3.18 skipped, so the item's 1.87 and 4.16 did not reproduce there. Oak City, Utah (reached with the seed set to an empty string) showed the largest gap, 1.73 against 3.57. A probe test, never committed, wrote each business's price, demand, costs, review date and price factors on the first of each month for both years, plus the review's income read. Still unknown: whether paying full workers in a skip can be done without an attendance decision (step 4). Also unknown: why the played year reads February as its income basis and then counts every later month as 16 to 34 percent more income. February is a short month with fewer paydays, so this likely inflates played demand wherever the game opens in January; it was seen in Houston and Oak City. It is a separate defect in `reviewBusiness`'s basis (finance-state.ts) and may deserve its own item. One more oddity: in the played year, `paidIncomeByPlaceMonth` holds near-zero totals for months the reviews had read in full (Houston September: $1.03 million at the review, $4,400 at year end). Something prunes or rewrites old months; the reviews were not affected.

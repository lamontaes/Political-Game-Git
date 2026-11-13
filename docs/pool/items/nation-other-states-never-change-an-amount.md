---
id: nation-other-states-never-change-an-amount
title: "Other states can only change yes-or-no laws: no tax rate, wage amount or budget ever moves there, so their budgets' tax-rate factor does nothing"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: nation
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 3, "One tally per session" and "Other states' budgets")
model: opus
effort: high
root: design-country-tier
checked: fable 2026-11-10
---

**What.** In every state but the player's own, a legislature can answer a yes-or-no question and nothing else. Read in the code, and confirmed by the audit's reviewer: only yes-or-no questions can change; tax rates, wage amounts and budgets in other states never do. Each other state's revenue line is the published figure times a wage or price factor times a tax-rate factor (`src/core2/modules/outside-budgets.ts`, near line 125). The tax rates that factor reads can never change in other states, so the rate factor does nothing, and the budget is still a published figure scaled by a factor. The owner sent that design back on November 8: budgets move from each state's own economy and laws. Nothing here was measured in a played year; the audit's played years (467 changes in Wickliffe, Oklahoma, 473 in Caño Martín Peña, Puerto Rico) show changes to yes-or-no laws only by the code's own rule. Fix it at the cause for every state and territory: the one rule that lets another state's legislature act also lets it raise or lower an amount (an income, sales or property tax rate, a minimum wage, a budget line) from its members' views and its own books, kept as a result with its date and vote count, so the rate factor has something to read. Feeds: nation-other-states-change-laws-in-year-one-then-almost-never.

**Cause.** Found in code: src/core2/modules/world-legislating.ts outsideEnact (line 1486) writes only value 1 or 0; outside-budgets.ts rateFactor (line 110) is therefore always 1.

**Fix.** Let the one outside-session rule raise or lower an amount (tax rate, wage, budget line) from views and the ledger, kept as a result row.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the rate factor in another state's budget is a reader with nothing to read until an amount can change, and an amount that changes must move that state's revenue line the same month. No dice: the size and direction of a change follow the members' and governor's views and the state's deficit or surplus, never a rate or a draw. One rule, all 56 places: the same amount laws the player's own state may change, by the same powers data, with no state named. Owner, November 8, on other states' budgets built as a published figure times one factor: sent back; budgets move from each state's own economy and laws. Owner, November 8: "they've got to spend money... They should be passing stuff." Owner, November 5: keep only the result, and build the detail on demand.

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed. With dev mode's Run on the Calendar, play three years. Dev mode's Watch panel and the Nation heading in the News then show other states changing amounts, not only yes-or-no laws: at least five states with a tax rate, a wage amount or a budget line that moved, each with the old and new value, its date and its vote count, by record id (a screenshot). Follow the dollars for one of them: that state's revenue line for the tax is higher or lower than in a twin world where the change is held back, by the amount the new rate gives on its base, and its budget's spending or balance answers. Then the named repro, Caño Martín Peña, Puerto Rico, seed 50fe2d1143af, one year: the changes are no longer yes-or-no laws alone. A test draws a place, plays two years and fails if no other state's amount law changed or if a changed rate left its revenue line where it was. The owner plays it: the News tells him a neighboring state cut its income tax to a named rate, and the records he can open show that state taking in less from it.

**Waits on.** Nothing. The country tier it reads is on main (pull request 8116).

**Files.** src/core2/modules/outside-budgets.ts (`rateFactor`, line 110; `revenueFactor`, line 125), src/core2/modules/world-legislating.ts (`openOutsideSession`, line 1354; `outsideEnact`, line 1486, which writes only `value: direction > 0 ? 1 : 0`), src/core2/modules/laws.ts (`stateLawInForce`), src/core2/data/legislature/series-powers.json, src/core2/data/laws/starting-law.json, src/bench/nation-news.ts, src/bench/ui/dev-watch.mjs

**Notes.** Fable's country tier design (pool item core-country-tier-first-slice) decides the shape; this item is the measured defect it must close. From the Fable audit, Pillar 3, read in the code and confirmed by the audit's independent reviewer; the audit names it one of "two medium pieces ... worth doing" before the country tier: "let other states change amounts (taxes, wages, budgets)". The audit did not measure another state's budget over a played year. Confirmed on main, Nov 10 (helper): `outsideEnact` enacts a row for a question in `PLATFORM_QUESTIONS` with a value of 1 or 0; `rateFactor` divides the state's rate in force today by its rate on the day the world opened, which is 1 unless the starting data itself schedules a change. Related: `nation-other-states-change-laws-in-year-one-then-almost-never` (why they change anything), `nation-another-states-law-reaches-nobody` (who a change lands on), `core-outside-governments-treasuries` (open, priority 3: a coarse treasury for every other state), `gov-outside-revenue-real-payers` (open: the home town's outside-revenue plug, a different books question).

**Notes (Fable, Nov 10, model).** The sort marked this for a Fable-level model. Read again by Fable: One engine (the outside sessions) and a written fix: Opus at high effort.

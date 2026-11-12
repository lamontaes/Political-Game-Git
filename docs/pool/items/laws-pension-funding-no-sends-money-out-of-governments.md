---
id: laws-pension-funding-no-sends-money-out-of-governments
title: "Answering no on funding pensions on schedule sends $20.6 million out of governments in 180 days (Marion, Mississippi)"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "Every law in dev mode's list, tried at four bodies")
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A government that votes not to fund its pensions on schedule should pay less into them, and in the game it ends far poorer. Measured in the law sweep in Marion, Mississippi (seed 7df73e53cd67): answering no on funding pensions on schedule sent $20.6 million out of governments in 180 days, against a twin world with no bill. The figure has the public broadband rider's amounts taken out, because the bill left the body with that rider. The audit lists this among results that point the wrong way and did not trace it to a payer or to code. The audit does not name the body; it found the broadband rider on the Mississippi House's bills, which ran 180 days. Find which payment carries the $20.6 million, by its own label, and fix it at the cause for every government the law binds: a yes raises the retirement contribution by the law's amount and that money goes to the pension fund, and a no lowers it, so the treasury keeps what it no longer pays. Seen: a government's treasury losing $20.6 million when it votes not to fund pensions.

**Cause.** Found in code: `sweepReserves` in `src/core2/budgets-treasury.ts` (line 1631, called at line 1619 in every monthly close) sends each state and local treasury's cash above a reserve to the outside account (`reserve-sweep`). The reserve is a fixed share of the budget's own yearly spending: `reserveMonthsOfSpending` (1.2 months, `src/core2/data/budgets/treasury-spending.json`) over 12, so a tenth of a year, plus payroll. A law that moves a spending line therefore moves the reserve by a tenth of the line's yearly change. A government's cash in a twin comparison shows that reserve, not what the law did to its money. Answering no on `fund-pensions-to-schedule` runs the `pension-funding` case in `src/core2/law-reach/group-b.ts` (line 421), whose `moveBudget` plan is `pensionShortfallPerResidentDollars` ($70, `src/core2/data/laws/reach-group-b-parameters.json`) times residents on `retirementContributions`. For Mississippi's about 2.94 million residents that is $205.8 million a year. With the line lowered, a tenth of it, $20.6 million, is swept to the outside: exactly the audit's "$20.6 million out of governments". The money the government no longer pays into pensions is not lost; it is moved out of the treasury's sight. The money the sweep sends out never comes back as the government's own: the account is the outside's.

**Fix.** Keep the swept money as the government's own. In `sweepReserves`, move the excess to a reserve investment account the government owns, not to the outside: register it once per treasury, as `escrowOf` in `src/core2/modules/justice.ts` (line 1167) registers the court escrow (an account with `ownerId` the government's organization, named `reserve-investments`). In the same monthly close, before the lines are paid, draw from that account into the main account what the main account lacks for the month's standing dues, before any shortfall is recorded. Keep `reserve-sweep` as the transfer's reason, so the journal still names it. Then a law that lowers a spending line leaves the government's cash plus investments higher, and one that raises a line leaves it lower, by the money the line moved. Update `scripts/core2-year/closures.mjs` check 6 if the plug row `reserve-sweep` in `src/core2/data/outside-flows.json` no longer touches the outside. This one change also answers `laws-free-transit-brings-governments-money`, the same tenth of the transit line.

**Time box.** 4 hours for one Opus session.

**Rules.** The chain is the acceptance: the rule is followed from the law row to the budget line that changed, to the payment the treasury made or stopped making, and to who received it, by record id. Ask why: the proof names, by record, the payment that moved each dollar, and a government that ends poorer after deciding to pay less is a defect until its cause is named. One rule, all 56 places: the direction holds for every government the place's law lets answer the question. Owner, November 7, quoted by the audit: "these should all be able to be reversed."

**Done when.** A second session runs `scripts/dev-tests/law-run.ts` in Marion, Mississippi (seed 7df73e53cd67) and in a drawn place (named with its seed) for `fund-pensions-to-schedule` answered no, 180 days, against its control, with a bill that left the body with one section. It sees governments' cash plus reserve investments higher than the control by about what the lowered `retirementContributions` line did not spend, and no `reserve-sweep` transfer to the outside account. In the running game, the state's treasury on Politics, Budgets reads the law's money the right way.

**Waits on.** Nothing. gov-riders-added-when-every-vote-is-forced is done; rerun the repro clean, with one section and no rider, before trusting the $20.6 million.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/justice.ts, src/core2/data/budgets/treasury-spending.json, src/core2/data/outside-flows.json, scripts/core2-year/closures.mjs, src/core2/law-reach/group-b.ts

**Notes.** From the Fable audit, Pillar 2, "Some results point the wrong way (measured; the first traced to its payer)". Measured: the one total, in one town, with the rider's amounts subtracted by the audit. Not traced: the payer, the label, the code. The audit: "I did not trace the pension, transit or wage-question results", and "Treat the other results as true of Marion, Mississippi until repeated." It was not among the five laws repeated in LaGrange, Wyoming. Read on main, Nov 10, not shown to be the cause: the `pension-funding` case calls `moveBudget` with a plan that adds the shortfall per resident times residents to the `retirementContributions` line, with `inForce: input.enacting`; what a no does to a budget the starting yes never raised, and whether the reserve sweep then moves the difference to the outside account, are the first two things to check. Because this bill carried a rider, the repro must first be rerun clean; `gov-riders-added-when-every-vote-is-forced` covers the rider itself. Related: `laws-nine-links-taxes` (blocked; the family this law sits in), `money-town-tax-raise-leaves-its-own-treasury-no-richer` (the reserve sweep).

**Notes (Fable's check, Nov 10).** How to find the cause: rerun the Marion, Mississippi twin clean (one section, no rider) and compare the governments' journals by payment kind over the 180 days. The first suspect is the retirementContributions line moved by a no and then swept to the outside account (`sweepReserves`, src/core2/budgets-treasury.ts line 1631). The fix is then made at that payment, so a no lowers the contribution and the treasury keeps it.

Nov 11 (cause finder for Fable B): the audit's $20.6 million is exactly a tenth of a year of the pension line's change for Mississippi ($70 times about 2.94 million residents), which is the reserve `sweepReserves` keeps. The free transit result ($8.25 million, a tenth of $28 times the same residents) is the same thing the other way. Found from the code and the audit's own figures; no new run, because a twin run would only repeat the audit's totals. The fix keeps swept money as the government's own investments.

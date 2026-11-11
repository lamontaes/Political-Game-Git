---
id: laws-free-transit-brings-governments-money
title: "Making transit free brings governments $8.25 million when it should cost them the fares (Marion, Mississippi)"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: laws-pension-funding-no-sends-money-out-of-governments
blocked-on:
lead: laws-effects
model: haiku
effort: low
root: rc8-law-judged-by-paperwork
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "Every law in dev mode's list, tried at four bodies")
checked: fable 2026-11-10
---

**What.** A government that makes transit free gives up its fares, and in the game it ends richer. Measured in the Nov 9 law sweep in Marion, Mississippi (seed 7df73e53cd67): making transit free left governments $8.25 million higher against a twin world with no bill, with the public broadband rider's amounts taken out by the audit because the bill left the body with that rider. The audit lists this among results that point the wrong way and did not trace it to a payer or to code; it does not name the body or restate the days, only that the Mississippi House's bills ran 180 days. Find which payment carries the $8.25 million, by its own label, and fix it at the cause for every government that runs transit: riders stop paying fares, the transit operator loses that revenue, and the government that passed the law pays the operator the lost farebox from its own treasury. Seen: a government's treasury, which ends richer after making transit free.

**Cause.** Found in code: the `transit-fares` case in `src/core2/law-reach/group-b.ts` (line 389) raises the government's `transit` spending line by `transitFareboxPerResidentDollars` ($28, `src/core2/data/laws/reach-group-b-parameters.json`) times residents, about $82.3 million a year for Mississippi's roughly 2.94 million residents. `sweepReserves` in `src/core2/budgets-treasury.ts` (line 1631) keeps a reserve of a tenth of a year's spending (`reserveMonthsOfSpending`, 1.2 months) and sends the rest of the treasury's cash to the outside each month. A higher line raises that reserve by a tenth of $82.3 million, $8.2 million, which stays in the treasury instead of being swept out. That is the audit's "$8.25 million higher". The government's real cost of the fares it pays is hidden by the same sweep. The cause and its fix are written in `laws-pension-funding-no-sends-money-out-of-governments`, which is the same sweep the other way.

**Fix.** Nothing of its own. The fix in `laws-pension-funding-no-sends-money-out-of-governments` (swept money kept in a reserve investment account the government owns) also makes this result point the right way. Once that lands, re-run the Done when below; build here only if the fare money still points the wrong way, and then write what was seen into this item.

**Time box.** 1 hour for one Haiku session, after the pension item lands.

**Rules.** The chain is the acceptance: the rule is followed from the law row to the fare a named rider no longer pays, to the operator's lost revenue, to the treasury payment that replaces it, by record id. Ask why: the proof names, by record, the payment behind each dollar, and a treasury that gains from giving a service away is a defect until its cause is named. One model, two tiers: counted households stop paying fares by the same rule as full people, times their count. One rule, all 56 places: the direction holds wherever a place's records show transit.

**Done when.** After the pension item's fix is on main, a second session runs `scripts/dev-tests/law-run.ts` in Marion, Mississippi (seed 7df73e53cd67) and in a drawn place (named with its seed) for fare-free transit, 180 days, with a bill that left the body with one section, and sees governments' cash plus reserve investments lower than the control by about what the raised `transit` line paid, and riders' fares at zero, by record id.

**Waits on.** laws-pension-funding-no-sends-money-out-of-governments.

**Files.** src/core2/law-reach/group-b.ts (the `transit-fares` case, line 389), src/core2/data/laws/reach-group-b.json, src/core2/modules/place-prices.ts (`readPriceLaws`), src/core2/law-reach/index.ts (`LINE_MECHANICS_B`), scripts/dev-tests/law-run.ts

**Notes.** From the Fable audit, Pillar 2, "Some results point the wrong way (measured; the first traced to its payer)". Measured: the one total, in one town, with the rider's amounts subtracted by the audit. Not traced: the payer, the label, the code. The audit: "I did not trace the pension, transit or wage-question results", and "Treat the other results as true of Marion, Mississippi until repeated." It was not among the five laws repeated in LaGrange, Wyoming. Read on main, Nov 10, not shown to be the cause: the `transit-fares` case calls `moveBudget` with a plan that adds the farebox per resident times residents to the government's `transit` spending line, and the price engine reads the same law when it settles fares; which of the two leaves a treasury with more, and whether a budget line raised this way draws money in from outside, are the first things to check. Because this bill carried a rider, the repro must first be rerun clean (`gov-riders-added-when-every-vote-is-forced`). Related: `web-fare-free-riders-reach-nothing` (open; the added riders move no record), `gov-fee-level-by-bill` (open).

Nov 11 (cause finder for Fable B): the audit's $8.25 million is a tenth of a year of the transit line's raise for Mississippi ($28 times about 2.94 million residents), the reserve `sweepReserves` keeps. It is the pension item's cause the other way, so this item waits on that fix and then re-measures.

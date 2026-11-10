---
id: laws-free-transit-brings-governments-money
title: "Making transit free brings governments $8.25 million when it should cost them the fares (Marion, Mississippi)"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "Every law in dev mode's list, tried at four bodies")
---

**What.** A government that makes transit free gives up its fares, and in the game it ends richer. Measured in the law sweep in Marion, Mississippi (seed 7df73e53cd67): making transit free brought governments $8.25 million, against a twin world with no bill. The figure has the public broadband rider's amounts taken out, because the bill left the body with that rider. The audit lists this among results that point the wrong way and did not trace it to a payer or to code. The audit does not name the body or restate the days; it found the broadband rider on the Mississippi House's bills, which ran 180 days. Find which payment carries the $8.25 million, by its own label, and fix it at the cause for every government that runs transit: riders stop paying fares, the transit operator loses that revenue, and the government that passed the law pays the operator the lost farebox from its own treasury.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: the rule is followed from the law row to the fare a named rider no longer pays, to the operator's lost revenue, to the treasury payment that replaces it, by record id. Ask why: the proof names, by record, the payment behind each dollar, and a treasury that gains from giving a service away is a defect until its cause is named. One model, two tiers: counted households stop paying fares by the same rule as full people, times their count. One rule, all 56 places: the direction holds wherever a place's records show transit.

**Done when.** A second session, not the builder, runs the twin check through dev mode's own law control in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed the title shows; redraw until a body there may pass the law, the starting law answers no, and households in the place pay transit fares. In dev mode's Bills panel on the Government screen pick that Body, a Sponsor, the Law (fare-free transit) and the Answer Yes, press Introduce, tick Chair hears the bill, set the Margin to 3 and the Executive to Signs, and press Pass. The bill page must show one section and no rider (screenshot). Run 180 days in the Run panel (120 at a town or county board). Start a second game on the same place and seed, pass nothing and run the same days. Compare every cash account in the two worlds: full people in town, counted households, businesses, each government's treasury and the outside account. Governments must end lower than in the twin by about the fares no longer collected, households that ride must end higher by the fares they no longer pay, and each difference is named by the payment's own label, with one rider named by record id. Then the same check as a named repro in Marion, Mississippi, seed 7df73e53cd67, where governments ended $8.25 million higher. The script pair `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" node --max-old-space-size=4500 --import tsx scripts/dev-tests/law-run.ts <seed> state fare-free-transit 180` (one heavy run at a time) must point the same way, and a test on a drawn place fails when governments end higher. The owner plays it: he makes the buses free, riders keep their fare money, and the budget shows what it costs.

**Files.** src/core2/law-reach/group-b.ts (the `transit-fares` case, line 389), src/core2/data/laws/reach-group-b.json (the policy row, line 4), src/core2/modules/place-prices.ts (`readPriceLaws`, line 946, and `PRICE_LAWS.fareFreeTransit`, line 936), src/core2/law-reach/index.ts (`LINE_MECHANICS_B`, line 18), scripts/dev-tests/law-run.ts

**Notes.** From the Fable audit, Pillar 2, "Some results point the wrong way (measured; the first traced to its payer)". Measured: the one total, in one town, with the rider's amounts subtracted by the audit. Not traced: the payer, the label, the code. The audit: "I did not trace the pension, transit or wage-question results", and "Treat the other results as true of Marion, Mississippi until repeated." It was not among the five laws repeated in LaGrange, Wyoming. Read on main, Nov 10, not shown to be the cause: the `transit-fares` case calls `moveBudget` with a plan that adds the farebox per resident times residents to the government's `transit` spending line, and the price engine reads the same law when it settles fares; which of the two leaves a treasury with more, and whether a budget line raised this way draws money in from outside, are the first things to check. Because this bill carried a rider, the repro must first be rerun clean (`gov-riders-added-when-every-vote-is-forced`). Related: `web-fare-free-riders-reach-nothing` (open; the added riders move no record), `gov-fee-level-by-bill` (open).

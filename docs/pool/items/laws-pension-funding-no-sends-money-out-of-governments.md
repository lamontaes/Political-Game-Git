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
effort: high
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A government that votes not to fund its pensions on schedule should pay less into them, and in the game it ends far poorer. Measured in the law sweep in Marion, Mississippi (seed 7df73e53cd67): answering no on funding pensions on schedule sent $20.6 million out of governments in 180 days, against a twin world with no bill. The figure has the public broadband rider's amounts taken out, because the bill left the body with that rider. The audit lists this among results that point the wrong way and did not trace it to a payer or to code. The audit does not name the body; it found the broadband rider on the Mississippi House's bills, which ran 180 days. Find which payment carries the $20.6 million, by its own label, and fix it at the cause for every government the law binds: a yes raises the retirement contribution by the law's amount and that money goes to the pension fund, and a no lowers it, so the treasury keeps what it no longer pays.

**Cause.** Needs cause. Looked at: Marion, Mississippi, seed 7df73e53cd67: answering no on fund-pensions-to-schedule sent $20.6 million out of governments in 180 days against a twin. Candidate code: src/core2/law-reach/group-b.ts case "pension-funding" (line 421), budgets-treasury.ts sweepReserves.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: the rule is followed from the law row to the budget line that changed, to the payment the treasury made or stopped making, and to who received it, by record id. Ask why: the proof names, by record, the payment that moved each dollar, and a government that ends poorer after deciding to pay less is a defect until its cause is named. One rule, all 56 places: the direction holds for every government the place's law lets answer the question. Owner, November 7, quoted by the audit: "these should all be able to be reversed."

**Done when.** A second session, not the builder, runs the twin check through dev mode's own law control in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed the title shows; redraw until the place's state legislature may pass the law and the starting law answers yes. In dev mode's Bills panel on the Government screen pick the state legislature as the Body, a Sponsor, the Law (fund pensions to schedule) and the Answer No, press Introduce, tick Chair hears the bill, set the Margin to 3 and the Executive to Signs, and press Pass. The bill page must show one section and no rider (screenshot). Run 180 days in the Run panel. Start a second game on the same place and seed, pass nothing and run the same 180 days. Compare every cash account in the two worlds: full people in town, counted households, businesses, each government's treasury and the outside account. Governments must end no lower than in the twin, the retirement contributions they paid must be lower by the law's amount, and each difference is named by the payment's own label. Then pass the yes over it and show the contribution return. Then the same check as a named repro in Marion, Mississippi, seed 7df73e53cd67, where $20.6 million left governments. The script route for the same pair, `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" node --max-old-space-size=4500 --import tsx scripts/dev-tests/law-run.ts <seed> state fund-pensions-to-schedule 180` (one heavy run at a time; it passes the yes and then the repeal, so read the leg that matches), must point the same way, and a test on a drawn place fails when governments end lower after a no. The owner plays it: his state votes to skip the pension payment and its treasury has more cash this year, with the shortfall on the record for later.

**Waits on.** Nothing. gov-riders-added-when-every-vote-is-forced is done; rerun the repro clean, with one section and no rider, before trusting the $20.6 million.

**Files.** src/core2/law-reach/group-b.ts (the `pension-funding` case, line 421; `reviewFiscalRules`, line 1040), src/core2/data/laws/reach-group-b.json (the policy row, line 202), src/core2/budgets-treasury.ts (`sweepReserves`, line 1631), scripts/dev-tests/law-run.ts

**Notes.** From the Fable audit, Pillar 2, "Some results point the wrong way (measured; the first traced to its payer)". Measured: the one total, in one town, with the rider's amounts subtracted by the audit. Not traced: the payer, the label, the code. The audit: "I did not trace the pension, transit or wage-question results", and "Treat the other results as true of Marion, Mississippi until repeated." It was not among the five laws repeated in LaGrange, Wyoming. Read on main, Nov 10, not shown to be the cause: the `pension-funding` case calls `moveBudget` with a plan that adds the shortfall per resident times residents to the `retirementContributions` line, with `inForce: input.enacting`; what a no does to a budget the starting yes never raised, and whether the reserve sweep then moves the difference to the outside account, are the first two things to check. Because this bill carried a rider, the repro must first be rerun clean; `gov-riders-added-when-every-vote-is-forced` covers the rider itself. Related: `laws-nine-links-taxes` (blocked; the family this law sits in), `money-town-tax-raise-leaves-its-own-treasury-no-richer` (the reserve sweep).

**Notes (Fable's check, Nov 10).** How to find the cause: rerun the Marion, Mississippi twin clean (one section, no rider) and compare the governments' journals by payment kind over the 180 days. The first suspect is the retirementContributions line moved by a no and then swept to the outside account (`sweepReserves`, src/core2/budgets-treasury.ts line 1631). The fix is then made at that payment, so a no lowers the contribution and the treasury keeps it.

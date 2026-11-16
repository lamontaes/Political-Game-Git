---
id: gov-treasury-surplus-earns-interest-at-the-central-bank-rate
title: "A state or local treasury's invested surplus earns interest at the central bank's rate, paid by the lenders it went to"
area: gov
kind: stopgap
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: gov-outside-revenue-retire-plug
blocked-on:
lead: governing
model: opus
effort: medium
root: rc1-world-outside-town
source: "The Account lead's reading of the revenue plug (docket Q10), Nov 14-15, 2026"
checked:
claimed-at:
---

**What.** Each month a state or local treasury sends what it holds above its reserve to the outside account "to invest" (`sweepReserves`, SG-GOV-reserve-sweep), and nothing comes back: no interest, no principal when the treasury needs it. The government's miscellaneous revenue (interest earnings are the largest part of the Census line) is paid by the plug instead. The federal treasury already borrows from named lenders and pays them interest (`gov-outside-revenue-borrowing`, done), so only state and local treasuries are affected. Seen: the budget screen's other-revenue line and the treasury's balance month after month.

**Cause.** Found in code: src/core2/budgets-treasury.ts `sweepReserves` (the one-way transfer with reason `reserve-sweep`) and `outsideRevenueMonthly` (paying a twelfth of the miscellaneous line with no payer), both registered as stopgaps.

**Fix.** Keep what a treasury sweeps as a balance it holds with named lenders (the same holders the federal debt rows use, as a counted group elsewhere). Each month those lenders pay the treasury interest at the central bank's policy rate in force (src/core2/modules/macro.ts) times the balance held, as an ESTIMATED row with its spread; a treasury short of cash draws it back before it borrows. The part of the miscellaneous line this replaces comes off the plug in the same change, and the rest stays registered with its amount stated. Out of scope: fines elsewhere wait on the crime design (docket Q9); rents, property sales, donations and central bank earnings have no payer the game holds yet.

**Time box.** 5 hours for one Opus session at medium effort. When it runs out, push what passes and set the item's state honestly.

**Rules.** Replace, never layer; the chain is the acceptance (one interest dollar from a named lender to the treasury and on to a named payee); one rule, all 56 places; speed: a year within 20% of its base.

**Done when.** A second session, in a one-year run of the played world in a drawn place (named in the PR body), finds a state or county treasury that swept a surplus receiving interest from a named lender record each month at the policy rate in force, a rate change moving next month's interest, the reserve-sweep row's marker gone or restated with what remains, and `npm run speed:year` within 20% of base.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps/gov.json

**Notes.** Checked Nov 15: no open PR or other thread holds the reserve sweep. Related, not the same: money-town-tax-raise-leaves-its-own-treasury-no-richer (the sweep after a tax raise).

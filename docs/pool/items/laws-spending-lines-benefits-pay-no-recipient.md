---
id: laws-spending-lines-benefits-pay-no-recipient
title: "A raised federal benefit line pays no one: income security, Medicare, veterans, agriculture and education aid"
area: laws
kind: bug
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 14, 2026 (/mnt/project-files/laws/take-effect.md)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** When Congress raises a spending line whose money goes to benefit recipients (Medicare, income security, veterans, and agriculture and education aid), the extra money is paid to the outside account under "Benefit recipients elsewhere" and no person or household gets more. Social Security is not one of them: its checks do rise with the line (`applySocialSecurityLevel` in src/core2/budgets-treasury.ts), and the law's own record of whom it reached is item `laws-social-security-raise-traced-to-the-law`. A state's welfare and Medicaid raise does reach people (the assistance benefit), but is credited to the wrong law (item `laws-budget-line-reach-credited-to-latest-measure`); a state housing raise reached two households. It is one simulation: a raised federal benefit line should reach the people the benefit engines already pay, in town as full people and everywhere else as counted groups by the same rule times their count. Seen: the bill card (dev mode's bill outcome) and the law page's "What this did" for the bill, and the Journal of a retiree in town whose check rises.

**Cause.** Found in code: no engine reads a federal benefit line. Law reach registers handlers only for the lines in src/core2/data/laws/reach-group-b.json `budgetLines` (highways, transit, healthAndHospitals, schools, higherEducation, welfareAndMedicaid, naturalResources, parks, retirementContributions) and the group A lines in reach-group-a.json (administration, corrections, fire, housing, police, schools) (src/core2/law-reach/group-b.ts `registerPolicyHandler` for each `budgetLines` key); medicare, incomeSecurity, veterans, agriculture and education are none of them (socialSecurity is read by the treasury itself, see What). The treasury's monthly close (src/core2/budgets-treasury.ts, `payOut` for the `beneficiaries` group in src/core2/data/budgets/spending-payees.json) pays the line's outside share to `accounts.main(outside)`. The benefit payers (src/core2/law-reach/group-b-money.ts `payBenefits`, `paySsi`; src/core2/modules/retirement-claims.ts) set each check from law and never read the federal line in force. Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, train 9ed4bf9c: Social Security H.R. 4 raised a tenth and run 100 days; the applied table holds one row for its law id, $38.0 billion to the outside account, and since no handler is registered for the key no reach store can hold another. (A first reading of the state lines that looked only at the applied table missed the reach stores; the state welfare result above is from `lawReach` over every store, probe /mnt/project-files/laws/probes/budget-state.ts at Train 8b6c8903.)

**Fix.** Make the benefit payers that already pay each program read the line: the program's payment in force is its opening amount times the line in force over the line at the opening, through `budgetInForce` in src/core2/budgets-treasury.ts, and register each payer as a line payer (`linePayers`) so what it pays in town is charged to the line; the rest of the line's beneficiary share goes to the counted beneficiaries of each state through the country tier's household income (src/core2/country-law.ts), not the outside account. Reuse the existing payers; add none.

**Time box.** 8 hours for one Opus session at medium effort.

**Rules.** One model, two tiers. The chain is the acceptance: one dollar of the raise followed from the treasury to a named recipient's benefit and back out. No dice. Wire to the world.

**Done when.** A second session, not the builder, starts the bench with an empty Place field so the place is a drawn place, writes down the place and seed, and in dev mode passes a Congress bill raising income security by a tenth; after the next check date, the bill card and "What this did" name full people in town whose benefit rose and counted people elsewhere, and dev mode's twin money shows the U.S. treasury's loss matching what households received, by holder.

**Waits on.** Nothing. Related: laws-three-federal-budget-lines-reach-nobody (veterans), core-country-tier-federal-budget-reaches-the-states (PR #8388, the tier's share of the federal budget).

**Files.** src/core2/budgets-treasury.ts, src/core2/law-reach/group-b-money.ts, src/core2/modules/retirement-claims.ts, src/core2/country-law.ts, src/core2/data/budgets/spending-payees.json

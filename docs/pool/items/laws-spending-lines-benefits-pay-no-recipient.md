---
id: laws-spending-lines-benefits-pay-no-recipient
title: "A raised spending line's benefit share pays no one: Social Security up, nobody's check up"
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

**What.** When Congress or a state raises a spending line whose money goes to benefit recipients (Social Security, income security, veterans, agriculture and education aid at the federal level; housing and welfare and Medicaid at the state level), the extra money is paid to the outside account under "Benefit recipients elsewhere" and no person or household gets more. Raising Social Security by a tenth ($152 billion) passed and paid out, and no retiree in town or in the counted population received a larger check. It is one simulation: a raised benefit line should reach the people the benefit engines already pay, in town as full people and everywhere else as counted groups by the same rule times their count. Seen: the bill card (dev mode's bill outcome) and the law page's "What this did" for the bill, and the Journal of a retiree in town whose check rises.

**Cause.** Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, train head 9ed4bf9c4b065f8c4d260fd3431b28e7a35ab936. Each line was raised a tenth by a bill passed through the game's own legislature (`draftBill`, `provisionFor`, dev mode's `decideAt`), signed, and the world run 100 days; the applied rows for the bill's own law id were read from the law-reach store (probes `/mnt/project-files/laws/probes/budget-lines.ts` and `budget-state.ts`). Social Security H.R. 4: one applied row, $38.0 billion, target `organization:jurisdiction_5f95b637a3a2bdda` (the outside account). Found in code: src/core2/budgets-treasury.ts, the monthly close, `payOut` for the `beneficiaries` group of `PAYEES` (src/core2/data/budgets/spending-payees.json: socialSecurity is beneficiaries 1.0, incomeSecurity 0.85, veterans 0.6, agriculture 0.6, education 0.35, housing 0.3, welfareAndMedicaid 0.2) pays `accounts.main(outside)`. The benefit payers (src/core2/law-reach/group-b-money.ts `payBenefits`, `paySsi`; src/core2/modules/retirement-claims.ts) set each check from law and never read the line in force, so the money and the checks are two separate facts.

**Fix.** Make the benefit payers that already pay each program read the line: the program's payment in force is its opening amount times the line in force over the line at the opening, through `budgetInForce` in src/core2/budgets-treasury.ts, and register each payer as a line payer (`linePayers`) so what it pays in town is charged to the line; the rest of the line's beneficiary share goes to the counted beneficiaries of each state through the country tier's household income (src/core2/country-law.ts), not the outside account. Reuse the existing payers; add none.

**Time box.** 8 hours for one Opus session at medium effort.

**Rules.** One model, two tiers. The chain is the acceptance: one dollar of the raise followed from the treasury to a named retiree's check and back out. No dice. Wire to the world.

**Done when.** A second session, not the builder, starts the bench with an empty Place field so the place is a drawn place, writes down the place and seed, and in dev mode passes a Congress bill raising Social Security by a tenth; after the next check date, the bill card and "What this did" name full people in town whose check rose and counted people elsewhere, and dev mode's twin money shows the U.S. treasury's loss matching what households received, by holder.

**Waits on.** Nothing. Related: laws-three-federal-budget-lines-reach-nobody (veterans), core-country-tier-federal-budget-reaches-the-states (PR #8388, the tier's share of the federal budget).

**Files.** src/core2/budgets-treasury.ts, src/core2/law-reach/group-b-money.ts, src/core2/modules/retirement-claims.ts, src/core2/country-law.ts, src/core2/data/budgets/spending-payees.json

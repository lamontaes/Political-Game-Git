# Opening budget estimates keep their researched calculation

Before: Local and unsurveyed-territory budget estimates received a seeded
lognormal spread after their researched calculation. Identical recorded
inputs could therefore yield different revenue, spending and debt.

After: Opening amounts use the same calculation and whole-dollar rounding
directly. Known government figures keep their values. The change applies to
newly opened budgets and preserves budgets already saved. It follows the
owner's explicit X3 removal of monetary draws in the rebuild dispatch.

## 1. Why-chain

An opening budget records expected revenue, appropriations and debt. Those
amounts come from a government's read finance figures or a sourced average.
A local estimate scales the finance average by population and its existing
government-type allocation. The old helper multiplied that result by a
seeded lognormal draw. Why did it draw? The old rule authored a 0.05 spread
without a mechanism. Bedrock finding: a stand-in monetary draw. The owner
ordered its removal. The survivor is the existing researched calculation.

## 2. Research

No new rate, population, cost or calibration is introduced. The existing
public-budget-bases packet derives per-resident general-government finances
from Census 2022 revenue and spending over 2023 residents. Its population
inputs include BEA 2024, Census place estimates and ACS local populations.
The existing 1.1506 calibration is the ratio of NASBO fiscal 2025 all-funds
state spending to Census 2022 state expenditure across 50 states. The packet
explicitly excludes utilities, liquor stores and insurance trusts.
Unsourced government-type allocation shares and pension assumptions remain
labeled placeholders. Removing a draw does not establish those assumptions.

## 3. Revisions

All eight calls to the old `opened` wrapper become `Math.round` calls over
their existing inputs. Its RNG imports and unused spread constant are removed.
State revenue and spending still use finance-per-resident times population
times calibration. Local allocations, island-area averaging, DC's local
finance column, debt bases, pension carve-out and reserve rules are preserved.
The results can differ where actual inputs or laws differ; a seed alone no
longer perturbs these amounts. Existing saved budgets are not rewritten.

## 4. What gets built

1. Keep `openGovernmentBudget`, its source packets and its existing caller.
2. Remove the per-line monetary RNG wrapper and its unused declaration.
3. Prove all 56 state/DC/territory openings across three seeds, alongside
   compiled city, county and town candidates.
4. Prove read-state revenue formulas, rounding, saved-budget reopening and
   unchanged repeated opening. Do not create an account or a payment.

## 5. Simulated, records, world pieces, checks

Simulated: no new person decision is introduced. This is the existing opening
calculator, not a law-effect or payment producer.
Records: the existing caller saves adopted budget records. Previously saved
records remain authoritative. Real payments and account migration stay in
their existing M5 writers.
World pieces: compiled jurisdictions, government candidates, finance packets
and population readers already exist. Missing research retains the existing
unsupported result; it is not replaced with a new guessed amount.
Checks: same inputs yield identical budget records across seeds. Read finance
formulas and whole-dollar rounding remain exact.

## 6. Proof run

The new test file covers all 56 places with seeds opening-amount-a,
opening-amount-b and opening-amount-c. Before repair, the corrected budget-field
fixture showed actual seed-dependent failures for AS, MP and a local town.
One additional DC test mismatch was a fixture using the wrong finance column;
it was corrected to preserve DC's existing local-column rule.
After repair, all 59 focused tests passed, including canonical serialization
of the opened budgets and repeat opening with byte-identical saved output.
The original prototype also used the wrong adopted-budget field name; its
failed output is retained separately and is not treated as product evidence.
There was no full-world, speed, browser or named-person watched run.

## 7. Worked example

The same recorded Town of Bethel, Connecticut candidate is opened under three
seeds. Each opening now uses its sourced population, Connecticut's local
finance column and the existing city allocation shares. Its adopted revenue,
appropriations, balance, reserve, debt and pension record match exactly.
American Samoa and Northern Mariana Islands similarly retain their existing
island-area average mechanism without a new drawn multiplier. Saving and
reopening the budgets leaves their recorded amounts unchanged. No individual
payment, court account or tax authority is inferred from these budget rows.

## Remaining dependencies

CTO review is required for this core financial change. Historical-government
account consolidation still needs the approved identity and migration seam.
The generic tax kind still needs reviewed per-family final-term and actual
occurrence bindings. No alias, new tax mapping or duplicate producer is added.

# Unread tax deductions use similar states

Before: An unread deduction used the plain mean for its tax-structure group.
Connecticut's modeled single-filer deduction was $8,947.

After: An unread deduction uses researched states ranked by matching tax
structure, then Census region, then median household income. Connecticut's
modeled deduction is $8,926. The earlier seeded estimate was $9,958, as reported
in the owner's dispatch. Reciprocal-rank weighting is an authored estimation
choice submitted for CTO review, not a measured coefficient or legal deduction.

## 1. Why-chain

Paycheck withholding depends on taxable pay. Taxable pay subtracts a deduction.
Ten states in the read compilation use exemptions or credits whose details
have not been read. The existing calculator therefore estimates a deduction.
The owner now requires closer researched states to bear more weight.
Bedrock: an explicit estimation rule over sourced state facts, with no draw.
Income similarity does not establish a legal exemption or a causal effect.

## 2. Research

The existing Tax Foundation 2026 packet supplies 32 read single-filer
deductions: nine flat-tax and 23 graduated-tax references. The Census Bureau's
[CPS ASEC Table H-8](https://www2.census.gov/programs-surveys/cps/tables/time-series/historical-income-households/h08.xlsx)
supplies 2023 median household income in current dollars for 50 states and DC.
The packet records sheet h08, column F, rows 11–61 and the workbook's SHA-256.
Connecticut is $92,240, Vermont $85,190, Rhode Island $81,860, New York $81,600,
Maine $75,740 and Minnesota $90,340. These are household statistics, not worker
pay or legal tax terms. Census regions use the existing sourced classifier.

## 3. Revisions

The plain mean is replaced by a weighted mean over all 32 read references.
Matching tax structure ranks before geography. Matching Census region ranks
before household-income distance. Rank 1 gets weight 1, rank 2 gets 1/2, and
so on. Exact ties share their first occupied rank and weight; the next rank
skips the occupied positions. The final estimate rounds to whole dollars.
No outcome level is drawn. Known deductions and all existing bracket and
filing-status rules remain in the existing calculator.

## 4. What gets built

1. Keep `stateIncomeTaxSchedule` and the existing paycheck caller as survivors.
2. Replace only its unread-deduction fallback with the ranked estimate.
3. Add one sourced household-income packet and expose ranked references for
   focused proof. Cache derived rankings across paychecks.
4. Keep missing territory schedules outside the state compilation unsupported.
   No income-tax power, rate, exemption or individual income is fabricated.

## 5. Simulated, records, world pieces, checks

Simulated: the existing calculator applies the schedule to actual paycheck
bases. This change introduces no person decision or money producer.
Records: no completed assessment, liability or payment is rewritten.
World pieces: state schedule and paycheck caller already exist; household
income is a representative sourced ranking input, not a saved worker's income.
Checks: known deductions remain exact, all ten estimates are seed-invariant,
and the existing 56-place coverage test retains unsupported territories.

## 6. Proof run

The focused CT regression first failed against the plain mean: 894700 minor
units received, 892600 expected. After the repair, all 11 tests in the changed
withholding test file passed. The tests retain 56-place coverage and verify
known deductions, unchanged brackets, identical withholding across seeds a,
b and c, structure/region/income precedence, and a real equal-distance tie.
These are calculator fixtures. A named-person watched-world run was not run.

## 7. Worked example

CT's first four references are VT, RI, NY and ME, weighted 1, 1/2, 1/3 and 1/4.
They precede Minnesota despite Minnesota's smaller household-income distance,
because the Northeast region ranks first within matching tax structure.
All 32 references produce $8,925.5202845 before rounding, or $8,926.
For Massachusetts, DC and Maryland are both $4,500 away in household income,
with matching tax structure and a different region. Both receive rank 5 and
weight 1/5; the following reference begins at rank 7.

## Delivery and remaining dependencies

This replaces the merged plain-mean fallback, not the existing tax producer.
Audit still owns the historical-account alias and tax pre-assessment contracts.
The tax-kind fixtures at 06ad828c242e39a38561a23781d41fa0629ecdb7 are a received
checkpoint, not production readiness. No new mapping or completed-liability
rewrite is included. CTO's merged M5 proof is accepted without a duplicate run.

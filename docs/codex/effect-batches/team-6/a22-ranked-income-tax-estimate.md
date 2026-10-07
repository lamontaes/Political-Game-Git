# An estimated income-tax schedule no longer changes with the seed

Before: A state's newly adopted or reshaped income tax received a rate scale
and deduction drawn around other states' averages. Identical source facts
could produce different withholding schedules in different worlds.

After: The existing fallback weights sourced schedules for the requested tax
shape by Census region and household-income distance. It uses the approved
reciprocal-rank estimation rule and retains any read state deduction. It still
labels the result as an estimate; final enacted bill rates are a separate
admission gap.

## 1. Why-chain

Why did a missing bill rate need a fallback? The existing reader has no admitted
numeric bracket binding. Why use real same-shape schedules? They supply actual
rate and deduction observations instead of an invented liability. Why rank by
region and income? Those are the owner's approved peer dimensions. Why weight
nearer references more? Reciprocal rank is the accepted authored estimation
rule, not an empirical coefficient. Why remove the seed? Identity does not
change a legal rate or the sourced schedule facts. Bedrock: actual published
schedule inputs and a clearly labeled deterministic estimate. A yes/no answer
still does not establish what numeric rate the sponsor wrote.

## 2. Research

The existing Tax Foundation packet, _State Individual Income Tax Rates and
Brackets, 2026_, is a provisional secondary compilation transcribed from a
fetched summary, with limited official checks. It covers fifty states and D.C.,
single-filer bracket thresholds in annual USD and marginal rates in percent.
It excludes territory schedules, married/head-of-household schedules, credits
and exemptions. This patch does not upgrade those facts to fully researched
statutory authority.

The Census CPS packet supplies representative 2023 median household incomes,
Table H-8, column F, current annual USD. It ranks places and never supplies an
individual tax base. The existing Census four-region classification is reused.
The owner-approved reciprocal-rank rule from #1369 is an authored design choice.
Source URLs are preserved in the source packets and the returned estimate basis.

## 3. Revisions

The requested tax shape selects candidate schedules first. Same Census region
precedes absolute household-income distance. Equal closeness shares the same
competition rank and weight; alphabetical ordering affects display only.
Deduction weights are renormalized over only the read deductions. A known own
state deduction stays exact. Immutable source estimates are cached by state,
shape and own deduction; repeated payroll reads do not sort the packet again.

The flat schedule averages the peers' marginal rates. Graduated schedules keep
the existing taxable-income steps, averaging actual peer tax at those steps;
the marginal rate is the change in that weighted tax divided by the income
interval. This preserves the existing numerical representation and creates no
new turning point or behavioral curve. Percent becomes basis points once;
annual deduction dollars become minor units once. No rate scale is drawn.

## 4. What gets built

1. Remove the rate-scale and deduction RNG from the existing fallback reader.
2. Reuse sourced same-shape schedules with the accepted deterministic ranking.
3. Preserve repeal, tax-year applicability, filing-status handling and known deductions.
4. Keep actual payroll and assessment callers unchanged.
5. Publish this bounded repair separately from final enacted term admission.

## 5. Simulated, records, world pieces, checks

Simulated: no new law introduction, vote, actor decision or payment in this patch.
Records: the existing reader returns the same shape and law-measure IDs; no saved
schema or completed liability is changed. World pieces: the existing catalog and
law-in-force records are still required. The legacy newly-adopted-tax default
shape, January 1 timing and filing-status approximations remain explicitly open
issues, rather than new inferred authority.

The existing statutory-tax.ts caller reads stateIncomeTaxUnderLaw, then applies
its schedule to the recorded annualized wage base. This patch does not create
another assessment producer, generic TaxTerms mapper or liability override.
The separate public-budgets/income-tax-adoption forecast remains an A22/A29 gap;
its deletion requires the actual tax-kind collections path, not this reader pass.

## 6. Proof run

Current-main baseline d33b1d3c4b4d5f1b9ff58de02a75783e610107ee passed the
original seven state-income-tax-law.test.ts cases. Candidate
fc66da96f439565e1daf362d2816bf8ad2dea6e4 passed eight cases in the same
changed file: seven retained scenarios plus an unsupported-territory guard.
The old seed-variation assertion now requires seed independence, as the owner
ordered. Repeal, future tax-year timing, constitution-sensitive shape changes,
known Idaho deduction, filing-status handling and marginal-rate checks remain.

An independent calculation from the sourced packet ranks Florida's same-region
flat peers first: Georgia, North Carolina, Kentucky, Louisiana and Mississippi.
Reciprocal weighting of all fifteen flat schedules gives 416 basis points and
an annual $10,773 deduction after rounding. The test checks the actual minor-unit
conversion, not an arbitrary acceptable range. These are estimated inputs, not
a Florida tax statute or a saved tax collection.

Two scoped strict TypeScript roots load 730 files with zero owned diagnostics.
Scoped lint, formatting, report and whitespace checks pass. Zero-dice exits 1
with zero new findings and five inherited stale entries. Spelling exits 1 with
19 findings outside the owned files. Shared baselines are untouched. Native logs are
/tmp/team6-a22-before.log and /tmp/team6-a22-final.log; JSON receipts use the
same names with .json. Latest fetched main
afd2570df0a0cd59cc92358879f182e94f588345 has no intervening changes to
the owned reader, statutory-tax caller, peer packets or Census region reader.
The tests use their existing explicitly partial authored
law fixtures; they do not demonstrate natural passage or canonical world saves.
Browser, game-year, full suite, named-person payment, all-56 watched-world and
unmocked tax-kind integration are NOT RUN. Final bill-term binding is still
missing, and the full A22 endpoint is not declared complete.

## 7. Worked example

The controlled Florida fixture adopts an income tax and chooses its flat shape.
The existing reader returns the labeled 4.16% peer estimate with $10,773 annual
deduction. Another seed returns the same schedule because all source facts are
unchanged. No person, paycheck, appointment, transfer or stamp is invented in
this reader test. The seven retained fixtures also show that a known Idaho
$16,100 deduction remains exact and an Oregon repeal still stops the reader's
tax. A real sponsor's own bracket terms must supersede the estimate once their
keys, units and recorded-base occurrence contract are admitted.

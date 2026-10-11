# Law consequences and the outcome web have a complete rule ledger

The consequence and outcome rules are ready for the core2 ports to reuse. Every KEEP function in this area's classifier list is lifted or has a specific reason it cannot be lifted intact. The player reaches the same point as before; this shelf adds no playable law route. The CTO still needs to review eleven preserved gaps and suspected bugs, then send the draft to a separate finisher.

## What was lifted

Measured: the ledger accounts for 86 declarations. It includes all 49 classifier KEEP functions in scope and 37 named audit overrides or supporting declarations. Of those 86, 71 are lifted and 15 have a reason they cannot be lifted intact. The machine-readable record is [inventory.json](inventory.json).

Measured in [the fan-out comparisons](enactment.golden.test.ts#L88): the shelf preserves the actual enactment fan-out order: ready tax adoption, generic and family appropriations, matters for newly created appropriations, duties, eligibility, and effective consequences. Measured in the same comparison: it keeps the context's governing law and subject ids. Measured by source inspection in [the unchanged fan-out body](../../simulation/enacted-law-effects.ts): the audit's rule-change and program-term effects are derived reads in the actual legacy fan-out, rather than separate writer calls.

Measured in [the full composition comparisons](selection.golden.test.ts#L108): outcome composition selects links, classifies their readiness, reads causes and baselines, applies lags and immediate law reversion, selects place sizes, applies moderators, and multiplies factors. Measured in the same comparisons: range checks report violations without clipping. Measured in [the monthly comparisons](place-month.golden.test.ts#L19): monthly outcomes retain prior structural levels, replacement-index carryover, level addition, local population weights, state aggregation, and rounding.

Measured in [formula comparisons](formulas.golden.test.ts#L116): amount units, clause dates, felt size, monthly pay, and benefit and loan formulas match. Measured in [admission comparisons](admission.golden.test.ts#L86): recipient categories, landing direction, SNAP ordering, and award admission match. Measured in [selection comparisons](selection.golden.test.ts#L108): coverage and program sunset boundaries match. Measured in [paid-leave comparisons](paid-leave.golden.test.ts#L58): premiums, benefits, and ranked estimates match.

Measured by source inspection in [the reader contracts](enactment.ts#L1) and [outcome contracts](outcome-readers.ts#L1): callers supply indexed records, the legal hierarchy, place identities, and final adopted terms. Measured by [the isolation check](inventory.test.ts#L64): the shelf imports no legacy engine at runtime. Inferred from those contracts: the later port can bind its writers without adding a scheduler here.

## What cannot be lifted intact

[The ledger](inventory.json) gives a reason for each of the 15 declarations. They assemble legacy household, schooling, farm, service-recipient, or saved-tax facts; write price, benefit, exposure, or enrollment records; coordinate registry writers; or validate and display legacy records. Measured by source inspection in the ledger: separable predicates and arithmetic have their own lifted entries. The later port must supply its existing indexes and writers rather than copy the old stores.

Law in force, tax authority, effective-date law, minimum-wage authority, institution overrides, offices, elections, legislatures, and economy remain with RULES-2. Measured in the publication ref check recorded in the PR: only this branch is published.

## Preserved behavior for the CTO

All eleven items are open in [stopgaps.json](stopgaps.json), with an author, date, code marker, reason, and replacement. The code preserves their legacy results.

| Stopgap | Observed behavior                                                                                                                                                                 | Later replacement                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| OW-001  | Measured by source inspection in [source](exposure.ts#L9): Non-money gains and losses all feel like 0.1 months of pay.                                                            | Research per-effect felt size.                                                |
| OW-002  | Measured by source inspection in [source](exposure.ts#L47): Monthly pay scales 28 days to an average month. Mixed-currency transfers are summed; the last included currency wins. | Indexed pay with explicit currency admission.                                 |
| OW-003  | Measured by source inspection in [source](landing-direction.ts#L9): Equal factors count as a gain for a higher-is-worse outcome and as a cost for higher-is-better.               | Decide how a neutral landing is represented.                                  |
| OW-004  | Measured by source inspection in [source](outcome-readers.ts#L207): Lags use rounded 30.44-day months. Threshold and degenerate shape arithmetic is retained.                     | Approve calendar and continuous-shape contracts separately.                   |
| OW-005  | Measured by source inspection in [source](enactment.ts#L58): Fan-out dispatches on the current day and supplies every person. The family appropriation writer is state-only.      | Effective-date events, indexed recipients, and writer coverage at all levels. |
| OW-006  | Measured by source inspection in [source](sunset.ts#L33): The first textual date wins; impossible dates parse, then calendar arithmetic rejects them.                             | Typed adopted dates and invalid-date admission.                               |
| OW-007  | Measured by source inspection in [source](sunset.ts#L90): Bundled program-life clauses are excluded. Selection has no as-of enactment cutoff.                                     | Component-aware, date-indexed program terms.                                  |
| OW-008  | Measured by source inspection in [source](paid-leave.ts#L1): Paid leave assumes a seven-day own-condition wait and five workdays per weekly cap.                                  | Sourced program-specific parameters.                                          |
| OW-009  | Measured by source inspection in [source](snap-order.ts#L8): Legacy SNAP allocation takes whole households until a population target is reached.                                  | Recorded household applications and indexed eligibility.                      |
| OW-010  | Measured by source inspection in [source](recipient.ts#L111): Missing age cohorts or unsupported runtime recipient keys can throw.                                                | Reject unsupported catalog rows before the predicate.                         |
| OW-011  | Measured in the failed direct-import run; [the test marker](place-month.golden.test.ts#L11) records undefined outcome bases during circular initialization.                       | A separately reviewed legacy module initialization contract.                  |

Measured against [RULES-1's recipient implementation](https://github.com/lamontaes/Political-Game-Git/blob/e7e3cf8f9ae71de17ddb7fd50d7ac5f8f3b034b2/src/rules/outcome-web/recipient.ts): the inherited shelf returned false for a missing age cohort. Measured by [the admission comparisons](admission.golden.test.ts#L86): this lift restores the legacy throw, including boolean short-circuit behavior. Measured by [the source-hash check](inventory.test.ts#L55): inventoried old engines remain unchanged. [parameters.json](parameters.json) records provenance for inherited defaults; no coefficient was retuned.

## Checks and hand-off

Measured in the baseline run recorded in the PR plan: the inherited 224 tests passed before edits. Measured by the linked golden comparisons above: tests compare the unchanged exported functions and private declarations across all 56 places. Measured by those comparisons: fan-out and outcome selection exercise local, state or territory, and federal contexts. Measured by source inspection in [the oracle adapter](legacy-source.test-support.ts#L8): private declarations are read from the original source and evaluated with test-only record-reader or writer substitutions. Inferred from that substitution boundary: the fixtures establish rule equivalence and do not establish core2 integration.

Measured by [the generated fixture comparison](formulas.golden.test.ts#L356): the baseline uses the existing resident builders in Guam, with seed `RULES4-outcome-web-20261010`. Measured in that comparison: monthly pay agrees with recorded work flows. Inferred from its scope: it does not prove an ordinary core2 law reaches a person. That remains the later integration port and separate finisher's job.

The gate consists of the shelf tests, strict changed-file TypeScript checks including tests, ESLint, Prettier, the PR release check, and zero-dice. Detailed counts and the published head are recorded in the PR hand-off after the gate completes. Measured by [the completion check](inventory.test.ts#L55): it verifies the source hashes of every inventoried legacy file.

Model: this session identifies as Codex, GPT-6. The deployed variant and runtime effort are not exposed. Usage is not visible. Work began October 10, 2026, at 9:33 p.m. Eastern. Elapsed time is recorded in the final PR comment. There were no implementation helpers; the repository report skill requires one read-only prose reviewer. A separate finisher has not sent this work back.

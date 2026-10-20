# Open stopgaps that never fired (Oct 20, 2026)

Of 263 open stopgap rows, 139 fired in three drawn towns over two played years each, and 124 never fired. Only 36 of those 124 are real candidates for a staleness check. The other 88 cannot say anything: 29 are marked by a call that records no hit, and 59 have no marker call in the code (they are data rows or comments). A row that never fired may still be right, because its condition may be rare; the row's owner decides.

## The 36 candidates

| Row                                         | Kind                                           | File                                               |
| ------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| SG-PW8-partnership-start                    | estimated-record                               | src/core2/births-plan.ts                           |
| SG-GOV-REACH-A-rent-contracts               | missing-mechanic                               | src/core2/data/laws/reach-group-a.json             |
| SG-GOV-local-executive-proposal             | assumed-data                                   | src/core2/data/legislature/executive-proposal.json |
| SG-GOV-justice-bribery-grade                | assumed-data                                   | src/core2/justice-law.ts                           |
| SG-GOV-justice-forfeiture-by-place          | estimated-rule                                 | src/core2/justice-law.ts                           |
| SG-GOV-justice-prosecutor-stand-in          | missing-data                                   | src/core2/justice-law.ts                           |
| SG-GOV-REACH-B-flat-tax-replacement         | missing-data                                   | src/core2/law-reach/group-b-money.ts               |
| SG-GOV-measure-groups-stand-in              | missing-data                                   | src/core2/modules/ballot-measures.ts               |
| SG-GOV-budget-adopted-by-rule               | missing-engine                                 | src/core2/modules/budgets.ts                       |
| SG-WORLD-withholding-local-base             | assumed-data                                   | src/core2/modules/budgets.ts                       |
| SG-GOV-campaign-mail-seller                 | missing-data                                   | src/core2/modules/campaigns.ts                     |
| SG-GOV-campaign-pollster-seller             | missing-data                                   | src/core2/modules/campaigns.ts                     |
| SG-GOV-campaign-venue-seller                | missing-data                                   | src/core2/modules/campaigns.ts                     |
| SG-GOV-executive-powers-research            | missing-data                                   | src/core2/modules/executive.ts                     |
| SG-WORLD-housing-fill-in-arrears            | owner-decision                                 | src/core2/modules/housing.ts                       |
| SG-GOV-justice-player-choices               | missing-mechanic                               | src/core2/modules/justice.ts                       |
| SG-GOV-committee-day-hooks                  | owner-decision                                 | src/core2/modules/legislature.ts                   |
| SG-STATE-line-item-veto-engine              | missing-mechanic                               | src/core2/modules/legislature.ts                   |
| SG-P8-school-acquaintance-contact-frequency | contact-frequency-logic-gap                    | src/core2/modules/life.ts                          |
| SG-PEOPLE-press-interview-conversation      | missing-mechanic                               | src/core2/modules/press.ts                         |
| SG-GOV-recall-bars-national                 | assumed-data                                   | src/core2/modules/recalls.ts                       |
| SG-GOV-recall-signature-groups              | missing-data                                   | src/core2/modules/recalls.ts                       |
| SG-GOV-staff-unpaid                         | missing-engine                                 | src/core2/modules/staff.ts                         |
| SG-GOV-ballot-order-estimates               | missing-data                                   | src/core2/modules/voting.ts                        |
| SG-GOV-ward-map                             | missing-record                                 | src/core2/modules/voting.ts                        |
| SG-GOV-township-law-level                   | behavior                                       | src/core2/modules/world-legislating.ts             |
| SG-OFFICE-FED-pardons                       | missing-mechanic                               | src/core2/office-day-federal-president.ts          |
| SG-OFFICE-FED-presidential-orders           | missing-mechanic                               | src/core2/office-day-federal-president.ts          |
| SG-OFFICE-FED-situation-room                | missing-record                                 | src/core2/office-day-federal-president.ts          |
| SG-OFFICE-FED-trip-residents                | missing-record                                 | src/core2/office-day-federal-president.ts          |
| SG-OFFICE-FED-prepared                      | missing-engine-hook                            | src/core2/office-day-federal.ts                    |
| SG-STATE-dev-seat-player                    | missing-core-api                               | src/core2/office-day-state.ts                      |
| SG-GOV-dual-office-law                      | estimated-rule                                 | src/core2/office-incompatibility.ts                |
| SG-CORE-past-territory-ballots              | missing-data                                   | src/core2/past-elections.ts                        |
| SG-GOV-policy-power-unresolved              | missing-record                                 | src/core2/policy-authority.ts                      |
| SG-P8-public-payroll-due-flow               | estimated-modeled-public-pay-obligation-bridge | src/core2/work-cash.ts                             |

## What to do next

- Make the 29 bare markers record their hits, so a later run can judge them (pool item `core-stopgap-bare-markers-record-hits`).
- Each row's owner checks the 36 candidates above: replace the row, remove it if it is already replaced, or keep it and say which condition fires it.

## How it was run

A call that is bare records nothing, and only the call through the world's interface records a hit. The towns were Bristol, Florida; East Carbon, Utah; and Warm Springs, Oregon, drawn with one seed, each built as the played world with every module and played 730 days. The script `scripts/core2-year/stopgap-never-hit.mjs` repeats it.

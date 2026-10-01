# Tax questions need terms the existing collector can read

The admitted tax handler can assess an enacted, typed levy against a person's saved taxable occurrence. The catalog must supply the same legal identity and typed terms before that path can run. The coordinator owns the catalog rows and dated term binding. This handoff lists the existing consumer's requirements and its limits; it adds no rates, authority, taxable occurrences or liabilities.

## Existing field and unit requirements

These are existing TypeScript fields, not new catalog key assignments. The coordinator must publish the canonical catalog key and unit for each admitted field. Missing terms remain unavailable. An explicit zero rate is distinct from an absent rate.

| Existing field                               | Required meaning and unit                                                                                                                                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TaxTerms.seriesKey`                         | Stable tax-series identity, preserved across prospective versions. Not a rate or a question label.                                                                                                                   |
| `TaxTerms.baseKey`                           | Exact semantic key matching the actual saved `TaxBaseRecord.baseKey`.                                                                                                                                                |
| `TaxTerms.baseLabel`                         | Nonempty description of that legally defined taxable base.                                                                                                                                                           |
| `TaxTerms.rateNumerator`, `rateDenominator`  | Exact integer ratio, with a positive denominator and a share from zero through one. Convert a declared ratio fraction once; do not treat a percentage as a fraction or infer a rate from yes/no.                     |
| `TaxTerms.exemptBaseKeys`                    | Explicit sorted, unique semantic base keys. Empty must mean an enacted empty exemption list, not missing research.                                                                                                   |
| `TaxTerms.allowanceMinorUnits`               | Exact nonnegative USD cents deducted from this occurrence. This is not an annual marginal bracket threshold.                                                                                                         |
| `TaxTerms.currency`                          | `USD`; the existing route refuses other currencies.                                                                                                                                                                  |
| `TaxTerms.effectiveDelayDays`                | Exact prospective days relative to enactment. Current sourced proposal admission accepts only its acquired ninety-day baseline. An absent field retains that historical default; it cannot stand for an unread date. |
| `TaxTerms.collectionLagDays`                 | Exact integer days after the taxable occurrence, currently one through 3,650. Same-day withholding is a different existing writer.                                                                                   |
| `TaxTerms.publicPurpose`                     | Nonempty enacted purpose description. It does not identify an account.                                                                                                                                               |
| `TaxTerms.assumptionNote`                    | Explicit source and modeling limits, not legal authority.                                                                                                                                                            |
| `TaxTerms.legalBaselineAssumption`           | Existing enum. Source-backed proposals currently require `carry-forward-acquired-baseline-in-game`; fictional profiles cannot supply authority.                                                                      |
| `TaxProposalRecord.publicGovernmentIdentity` | Exact saved government identity for local recipients. Preserve `governmentKey` and jurisdiction; do not alias a county or city to its state.                                                                         |
| `TaxProposalRecord.publicOrganizationId`     | Actual saved public account organization. Recipient is a proposal field, not a `TaxTerms` field or a free-text catalog account name.                                                                                 |
| `TaxProposalRecord.power`                    | Acquired legal-power evidence and its actual availability date. A catalog question or account alone grants no authority.                                                                                             |

The arithmetic in `previewTax` subtracts the occurrence allowance, applies the exact ratio and rounds half up to USD cents. It is the existing calculation; the handler does not supply a replacement.

## Legal and occurrence joins

`resolveTaxConsequences` in `src/simulation/law-consequences/tax.ts` requires all of these existing joins:

- A non-null canonical catalog question matching the operative enacted `LawInForce` at the saved base's occurrence date.
- That law's actual measure ID, an attached `TaxProposalRecord`, its levy provision and an effective `TaxPolicyRecord` belonging to that proposal.
- A saved current-date `TaxBaseRecord`, with its source event, jurisdiction, exact base key, USD amount and actual person payer.
- Assessment activity ID equal to that base ID; activity subjects include the saved payer's person ID.

| Shared row field | Existing binding                                               |
| ---------------- | -------------------------------------------------------------- |
| Kind             | `tax`                                                          |
| Selector         | `recorded-tax-base-payer`                                      |
| Action           | `assess-enacted-tax-base`                                      |
| Predicate        | `has-operative-typed-tax-policy`                               |
| Amount           | `{op: "record", key: "enacted-tax-assessment", unit: "minor"}` |
| Row lag          | Zero days; the typed policy owns collection timing.            |
| Repeal policy    | `preserve-completed`                                           |

`assessTaxBase` freezes one base/series assessment. `taxCollectionTransition` separately attempts the actual due-date transfer to the frozen recipient. Collection stamps retain the assessment's authority and saved outcome IDs. Repeat calls and later terms cannot reprice or recollect a completed assessment.

## Exact unsupported bindings to retain

The following limits are measured from the current source, rather than claims that the whole tax system lacks those capabilities.

| Binding                     | Current consumer limit and required dependency                                                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog terms               | No catalog-to-`TaxTerms` mapper exists in this handler. Root must publish exact keys, units, final dated term values and their source IDs. No local key names are assigned here.                                                                                                    |
| Dated term representation   | The current final-term reader accepts a numeric value with an exact question key, term key and unit. Base keys, exemption lists and recipient identities need an admitted typed binding; do not encode them as arbitrary numeric constants.                                         |
| Legal levels                | `taxPowerEvidenceFor` currently reads the acquired state selective-excise projection. `attachTaxProposal` compares that exact evidence and state jurisdiction. Federal and local admissions need the approved authority contract; adding question rows does not extend this writer. |
| Starting laws               | The resolver currently requires `law.origin === "enacted"`, an enacted proposal and policy. Team1's starting-reference path must deliver an admitted binding before starting taxes use this handler.                                                                                |
| Income and top federal rate | The flat occurrence ratio and allowance do not represent annual progressive brackets, cumulative earnings or filing deductions. An annual threshold in minor units cannot become the occurrence allowance. Preserve existing statutory liabilities and payroll collection.          |
| Payroll                     | Employer match, employee deductions and same-day withholding are not represented by this person-to-public delayed levy. Preserve the sole payroll/statutory writers.                                                                                                                |
| Property and caps           | A saved monetary base alone does not implement an assessed-value history or a growth cap. Root must specify the existing record and law-term binding.                                                                                                                               |
| Sales and exemptions        | The person-only resolver requires an actual monetary occurrence and matching base key. It does not classify goods or infer legal cannabis sales. Different exemption classes need their actual saved classification and admitted binding.                                           |
| Corporate                   | Organization payers are presently refused by the handler, although the underlying tax types can describe them. Do not report corporate activation from a catalog row.                                                                                                               |
| Per-unit charges            | Mileage, bottle deposits and carbon quantities cannot enter this ratio-on-money route as guessed dollar bases. Their legal per-unit terms and actual quantity records need an admitted mechanism.                                                                                   |
| Local series                | Effective-policy lookup uses jurisdiction plus series. Exact municipal identity must remain distinct where governments share a jurisdiction; recipient metadata alone is not proof of distinct policy selection.                                                                    |

## Next dependency and checks

The coordinator publishes catalog keys and the dated legal-term binding. Team6 then consumes those exact rows on its owned tax surfaces. Questionless proposals remain catalog gaps and receive no bypass. Unsupported starting, annual, per-unit, recipient or authority mappings remain explicit for Audit.

Source read: branch `codex/team-6-tax-kind-fixtures`, current main `123f7dc77e80fb1d9abd78e34956f91afceb3e60`.

Main includes the merged tax handler and registry admission. The handler export is `TAX_REGISTRATION`.

Its original merged source is `c5730faf39de4e923af28e0ebff41ca99950dec2`.

This is a documentation-only handoff. Formatting, the report checker and whitespace checks passed. Self-review checked the table against the saved source; no helper was spawned under the coordinator's team limit. Runtime tests, new natural taxable bases, catalog activation and nationwide coverage were not run or claimed. The previously accepted handler proof remains separate.

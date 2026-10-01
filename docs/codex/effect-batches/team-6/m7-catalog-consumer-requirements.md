# Tax questions need terms the existing collector can read

The admitted tax handler can assess an enacted, typed levy against a person's saved taxable occurrence. The catalog must supply the same legal identity and typed terms before that path can run. The coordinator owns the catalog rows and dated term binding. This handoff lists the existing consumer's requirements and its limits; it adds no rates, authority, taxable occurrences or liabilities.

## Existing field and unit requirements

These are existing TypeScript fields. The coordinator has now published the key vocabulary below; dated value binding remains unfinished. Missing terms remain unavailable. An explicit zero rate is distinct from an absent rate.

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

## Published key mapping

The table below reads the coordinator's exact published source in `src/simulation/tax-law-term-keys.ts`. It is preparation for the dated reader, not an implemented mapper or an assessment result.

| Existing consumer field         | Published canonical key      | Published unit or category                      |
| ------------------------------- | ---------------------------- | ----------------------------------------------- |
| `rateNumerator`                 | `tax.rate-numerator`         | `count`: exact nonnegative integer numerator.   |
| `rateDenominator`               | `tax.rate-denominator`       | `count`: exact positive integer denominator.    |
| `allowanceMinorUnits`           | `tax.occurrence-allowance`   | `minor`: USD cents for this occurrence only.    |
| `effectiveDelayDays`            | `tax.effective-delay`        | `days`: prospective enactment delay.            |
| `collectionLagDays`             | `tax.collection-lag`         | `days`: delay from actual taxable occurrence.   |
| `seriesKey`                     | `tax.series`                 | Categorical semantic series key.                |
| `baseKey`                       | `tax.base`                   | Categorical semantic key matching a saved base. |
| `exemptBaseKeys`                | `tax.exempt-bases`           | Categorical list of actual admitted base keys.  |
| Proposal `publicOrganizationId` | `tax.recipient-organization` | Categorical actual saved organization ID.       |
| Local identity `governmentKey`  | `tax.recipient-government`   | Categorical exact saved local-government key.   |

No canonical key is published here for currency, base label, public purpose, assumption note or legal-baseline assumption. The coordinator's binder must supply their actual declared value and provenance, or return an explicit unavailable result. A missing exemption list cannot become an empty list; a missing allowance cannot become zero. Categorical terms need their typed dated representation, not numeric encodings.

The pack names questions as `us-tax-terms:<level>.<family>-tax-terms`. Families are income, sales, property, excise, payroll and corporate; levels are federal, state, county and city where the existing dial emits a row. The published test explicitly excludes a federal property-tax question. Consumers must use the actual emitted question and exact government level rather than synthesizing permission from this naming pattern.

Row parameters currently pair each key with its field name. Those strings identify vocabulary; they are not enacted categorical values, rates or source evidence. The pack supplies no consequence rows. School and special-district routing remains unfinished.

The next consumer input must preserve the actual governing law, question, adopted provision and source record IDs alongside dated term values. A question-power dial cannot replace the proposal's acquired authority evidence, and a recipient category cannot create an account or grant authority. Existing liability and collection histories stay frozen.

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
| Catalog terms               | Canonical keys and units are published as vocabulary. No catalog-to-`TaxTerms` mapper exists in this handler. Root retains dated numeric/category binding and its source IDs. No local key names are assigned here.                                                                 |
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

The coordinator retains the dated legal-term binding. Team6 has matched the published vocabulary to its existing consumer fields and will consume that binding on its owned tax surfaces when delivered. Questionless proposals remain catalog gaps and receive no bypass. Unsupported starting, annual, per-unit, recipient or authority mappings remain explicit for Audit.

Published vocabulary source: [1562](https://github.com/lamontaes/Political-Game-Git/pull/1562), READY head `bffa6f8af61f0cba16f61479c3e072c51306be46`. It was read directly from that fetched Git object; it was not merged into this consumer branch. Root's reported three passing checks and 56 own-level checks were not rerun here.

Consumer branch: `codex/team-6-tax-kind-fixtures`. Current main `9c08465da08be307435e9b2c4f76d9f35f105fab` was received additively; the tax handler, tax types and tax-policy source are unchanged from the accepted consumer source.

Main includes the merged tax handler and registry admission. The handler export is `TAX_REGISTRATION`.

Its original merged source is `c5730faf39de4e923af28e0ebff41ca99950dec2`.

This is a documentation-only handoff. Formatting, the report checker and whitespace checks passed. Self-review checked the table against the saved source; no helper was spawned under the coordinator's team limit. Runtime tests, new natural taxable bases, catalog activation and nationwide coverage were not run or claimed. The previously accepted handler proof remains separate.

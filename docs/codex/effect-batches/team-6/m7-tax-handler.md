# A recorded levy reaches its saved payer

The tax handler applies an already enacted, typed levy to a person's saved taxable occurrence. It records what the person owes, then leaves collection to the existing due-date payment writer. A controlled check assessed Elijah Peterson for $1 and later transferred that dollar from his cash to the law's public account. Save/Continue and repeat calls preserved one assessment and one payment. This prepares a handler for review; it does not enable a catalog tax law or establish natural earnings, legal sales or complete tax coverage.

## Published source

Draft [1552](https://github.com/lamontaes/Political-Game-Git/pull/1552) preserves the existing M7 branch and its federal-terms prototype. The first handler source is `c892dc635c4e3eb5f89caa17c241b69cd12321a0`. Current-main composition is `ddca33824283e9105c448d872271ad23bbcdb0e6`, receiving main `8a02acfa4548185e4f0b5f12a678bf6c822a9128`. No team merge or CTO approval is claimed.

The four handler source paths are listed below. Coordinator-owned registry, engine and catalog files are unchanged. The predecessor's test-only files remain separately identified.

| Path                                          | Scope                                                |
| --------------------------------------------- | ---------------------------------------------------- |
| `src/simulation/law-consequences/tax.ts`      | Dedicated handler and registration export            |
| `src/simulation/law-consequences/tax.test.ts` | Saved-person handler proof                           |
| `src/simulation/tax-policy.ts`                | Optional assessment stamp and collection propagation |
| `src/simulation/tax-types.ts`                 | Optional historical stamp fields                     |

## Saved consequences

HARDWIRED — the controlled signature, test levy and taxable occurrence were explicitly authored. The existing fictional excise terms were reused. They are not a researched cannabis rate or an inference from a yes answer.

HARDWIRED — canonical arithmetic applied those typed terms to the saved base. The assessment was 100 USD minor units, while transferred cash remained zero until its saved due date. On May 6, 2027, the common writer transferred 100 minor units. Elijah's balance changed from 10,000 to 9,900 minor units, and the public account changed from zero to 100 minor units.

The named example is `person_f7f9336dc0144486` in `jurisdiction_7a7ff2336824055b`, seed `legislative-core-alaska-2026`. [The receipt](m7-tax-proof/named-payer.json) preserves its base, assessment, collection and completed transfer, alongside the proposal, policy, levy provision, enactment, flow, due item, recipient and both stamps.

A later explicit zero-rate successor produced a new zero assessment and zero collection. The earlier assessment and payment stayed unchanged. Insufficient funds produced a blocked collection with no public cash receipt. A lawful zero and an unavailable legal binding remain distinct.

## How it joins the existing writers

`TAX_REGISTRATION` exports the capabilities below. Its assessment activity ID must be an actual `TaxBaseRecord.id`; subjects must include that record's actual person payer.

| Capability | Binding                          |
| ---------- | -------------------------------- |
| Selector   | `recorded-tax-base-payer`        |
| Predicate  | `has-operative-typed-tax-policy` |
| Action     | `assess-enacted-tax-base`        |
| Unit       | `minor`                          |

`resolveTaxConsequences` requires an operative typed policy, sourced power and the canonical governing question belonging to the same enacted measure. It delegates arithmetic to `previewTax`.

`applyTaxConsequence` resolves again and calls `assessTaxBase`; forged or stale amounts and references cannot become liabilities. Existing base/series assessments are left frozen, including historical assessments without stamps.

`taxCollectionTransition` remains the sole due-collection writer. Assessment and collection have separate optional law stamps. The collection stamp retains the frozen assessment authority and actual transfer outcome ID. The existing payer-exposure writer saves the consequence on Elijah's record after actual collection.

## Admission and remaining gaps

The default registry refused the fixture row before tax-kind admission. [That failed receipt](m7-tax-proof/team6-m7-tax-final.log) is preserved. Injected registration proves only the handler; the coordinator still owns production registry and catalog admission.

There is no generic catalog numeric-term mapper, starting-law tax mapper or admitted questionless-proposal binding in this piece. Household and organization payers, annual marginal-tax bracket mapping, and naturally earned taxable bases are not claimed. No rate, exemption, allowance, currency, due date or recipient is invented for an unsupported law.

CTO review was requested for the optional assessment/collection stamp fields and the common writer seam. Old saves may omit the fields. Review delivery is not acceptance. The next dependency is coordinator registry review plus Audit resolution of the remaining legal-term/source bindings.

## Checks and limits

The dedicated handler passed eight checks before and after receiving current main. They cover named-payer assessment and actual collection, Save/Continue, repeat calls, blocked/zero outcomes, invalid authority and inputs, prospective effectiveness, frozen prior assessments and an explicit zero-rate successor. The first positive receipt took 22.79 seconds; the two-file current-main run took 46.40 seconds including the predecessor's failed setup.

The preserved `tax-kind-contract.test.ts` initially failed before its three cases ran because the old controlled executive input no longer supplied the production desk's decision. The owned test-only repair then passed all three checks in 48.01 seconds. It records its declared fixture executive action through `recordExecutiveAction`; it does not change production NPC decisions or mock tax arithmetic, authority, assessment or collection. All predecessor assertions remain.

The unchanged main `tax-policy.test.ts` has three passing checks and eight fixture-enactment failures. The same eight failures were reproduced using exact main tax source `2b28298d55c8d5fd88af84b71a12196f31914aac`. Their [main receipt](m7-tax-proof/team6-m7-tax-main.log) is separate from the changed-file receipts. No all-changed-tests claim follows from the dedicated eight checks.

Initial source gates passed: six scoped TypeScript roots, 1,042 traversed files, zero owned diagnostics; changed-source lint, formatting and whitespace checks. Final test-only repair gates are recorded in the accompanying receipt. Release checking found an inherited main CI declaration containing merge bookkeeping. Zero-dice reported zero new findings and five stale removed entries; its allowlist is unchanged. Spelling reported 24 findings after its sandbox retry; each finding is also present in the received main source.

No whole suite, browser, game-year benchmark, nationwide natural behavior run, production catalog tax activation or full M7/A13 completion was tested. Raw failed runs, successful runs and original byte hashes are retained in [the proof folder](m7-tax-proof/).

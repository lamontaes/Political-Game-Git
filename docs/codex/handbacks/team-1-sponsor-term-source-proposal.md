# Sponsors need a saved starting-law term source

The pair removed unsupported state filings but converted none of the forty-one cases into typed laws. The completed Floral year has zero typed enactments out of fourteen. The proposed repair extends the existing opening record with researched legal terms, then lets drafting read those terms without manufacturing an enacted measure. This needs a concrete source/reader decision before implementation.

## 1. Why-chain

The compiler accepts an enacted governing measure with a complete saved draft lineage. A first bill cannot supply that prior measure. The existing starting-law projection supplies only an answer, date and preemption status. Why no amount or rule payload? The starting-law bank and its projection do not model those fields. Terminal: missing structured legal source, not missing treasury cash.

The source must be keyed by legal instrument or program as well as jurisdiction. A question about additional service can have no prior yes answer while the underlying transit program already has law and funding. Requiring a prior enactment of the same catalog direction mistakes aboutness for the source of its terms.

## 2. Research and exact source verification

Runtime `ef64da2c4d932fc78c13203d1ff78c3968d0e0c6` contains byte-identical state producer/test files from PR1215's `a0f68fa44442c04d7656ce2970a5d89fe086c13d`.

Its compiler and both compiler tests are byte-identical to PR1217's `34e1734944c434610f4c3a0712e072288be24d6f`. That is the updated compiler, including beneficiary/fiscal-period rejection; the older first compiler commit is not substituted.

The affected-question counts below come from Team2's exact retained prior-day law queries. This packet supplies no new primary statutory research or monetary values. Sources must be acquired before terms are populated. Existing school tax/service profiles are explicitly fictional and cannot be relabeled as legal baseline terms.

## 3. Proposed saved record, source and reader contract

Extend the existing saved `WorldOpeningRecord` with optional `startingLawTerms`, containing a schema version and immutable term entries.

The record lives in `src/simulation/world-setup/types.ts`. No synthetic enacted measure or invented draft lineage is proposed. Preserve legacy saves without the field; absence means no structured source, not zero or permission.

Each entry identifies the actual law/program with `lawKey`, `jurisdictionId` and `instrumentKey` or `programKey`.

Related `questionKeys` join catalog aboutness without requiring a previous enactment on the same question. Source artifact digest, citation/URL, source date, operative dates and typed coverage are required. Its payload distinguishes appropriation parameters from a specific executable rule. Appropriation entries must carry every required parameter and actual availability/phase terms. Rule entries must name an implemented adapter with its closed typed payload; an arbitrary JSON object or generic yes/no effect tag is insufficient.

Extend the `world-opening` draft inside `ensureWorldStartingConditions` in `src/simulation/world-setup/conditions.ts`. The existing `appendWorldConditions` writer persists the researched snapshot once. Read source entries from an extension to `data/research/laws/starting-law-2026.json`; do not use `drawPublicCashOpeningProfile` or fictional state profiles as inputs. No random term selection is proposed.

Team1's proposed new pure reader is `src/simulation/governing/sponsor-law-terms.ts`, function `currentSponsorLawTerms(world, jurisdictionId, instrumentKey, date)`. It reads the opening snapshot or a genuine effective enacted source; it validates source identity, dates, coverage and complete parameters. Ambiguity is an explicit refusal. It never writes while reading or converts citation prose into numbers.

Team2 retains the `compileAutomaticLawDraft` source-selection and parameter-selection hunks. The proposed hook consumes this reader's discriminated source, allowing an actual starting-law source as well as an enacted source. Existing authority resolution, effect validation and provision writers remain outside the hook. A source's authorization ceiling is not its appropriation, and an appropriation is not cash.

The first positive funding target is the existing rural-transit caller. It needs a sourced current appropriation/program record, its actual service rules, effective period, phase and covered jurisdiction. The starting-law bank has no rural-transit question row. The existing fictional contract price/service schedule cannot fill the missing legal fields.

## 4. Decision and exact proposed ownership

1. Approve the researched opening-term snapshot and instrument/program source key described above, or direct an existing legal-term provider to use. No such provider was verified for the failed transit caller.
2. Assign Team1 only `WorldOpeningRecord.startingLawTerms`, the opening snapshot construction hunk, the new pure reader and its fixtures, and researched bank rows. Related integrity validation requires separately recorded clearance.
3. Team2 wires the reader inside its existing compiler claim and fixes filing opportunities, including existing-yes funding renewals. Preserve constitutional closure and actual expiry/renewal rules.
4. Rule-only questions need an executable adapter, not an appropriation template. The table names their missing payloads; no new reader is claimed as built.
5. This is a source-model/ownership decision packet, not a permission request caused by a skill. No proposed shared hunk has been edited.

## 5. Missing inputs for every affected question

Counts are filings / known starting-law answers / missing law. Every row also needs a cited jurisdiction/instrument identity, real operative dates, transition or phase rules, and typed coverage. An absent date cannot silently use the bank's generic year-2000 sentinel.

| Catalog question suffix                  | Counts    | Missing executable terms beyond answer/date metadata                                                                                                                     |
| ---------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| mandatory-minimum-sentences              | 6 / 0 / 6 | Offense classes, actual minimum terms, exemptions, retroactivity and sentencing/custody reader.                                                                          |
| medicaid-work-requirement                | 4 / 4 / 0 | Required hours/activities, reporting interval, exemptions, eligibility/enforcement transition and enrollment reader.                                                     |
| universal-preschool                      | 4 / 4 / 0 | Eligible ages/residency, funded places or subsidy, appropriation, opening schedule and enrollment/payment reader.                                                        |
| public-funds-for-private-schooling       | 3 / 3 / 0 | Eligible students/providers, actual grant/rule, annual budget, payment schedule and school-payment reader.                                                               |
| paid-family-leave                        | 3 / 3 / 0 | Qualifying leave, duration, wage replacement/cap, waiting period, funding and employer/benefit reader.                                                                   |
| fund-pensions-to-schedule                | 3 / 3 / 0 | Actual pension schedule/liability, contribution or appropriation, payer/beneficiary identity and payment reader.                                                         |
| end-cash-bail                            | 2 / 2 / 0 | Covered offenses, release/detention alternatives, exceptions and pretrial custody reader.                                                                                |
| fix-it-first                             | 2 / 0 / 2 | Existing maintenance program/appropriation, assets, actual prioritization rule and commitment/delivery reader.                                                           |
| fund-behavioral-health-crisis-response   | 2 / 0 / 2 | Funded service, appropriation, operating/eligibility rules and crisis service/payment reader.                                                                            |
| reduce-occupational-licensing            | 2 / 0 / 2 | Occupations, existing requirements/fees, exact removed requirements, grandfathering and licensing reader.                                                                |
| cap-development-incentives               | 2 / 0 / 2 | Existing incentive instruments, monetary/rate cap, recipient/contract exclusions and public expenditure reader.                                                          |
| cap-property-tax-growth                  | 2 / 2 / 0 | Tax or assessment cap distinction, actual rate/index, reassessment/exemptions and tax assessment reader.                                                                 |
| allow-multifamily-in-single-family-zones | 1 / 1 / 0 | Parcel/zoning coverage, allowed building/units, exceptions and permit/building reader.                                                                                   |
| independent-redistricting                | 1 / 1 / 0 | Commission composition/selection, map constraints, effective election cycle and district-map reader.                                                                     |
| rent-stabilization                       | 1 / 1 / 0 | Actual cap/index, covered/exempt units, renewal/phase rule. Existing town-rent has a reader but its universal California cap is a flagged placeholder, not Missouri law. |
| restrict-abortion                        | 1 / 1 / 0 | Actual gestational/procedural limits, exceptions, applicable providers/patients and healthcare reader.                                                                   |
| mileage-fee-replaces-fuel-tax            | 1 / 1 / 0 | Actual mileage charge and replaced fuel levy, covered/exempt vehicles, measurement/collection and tax reader.                                                            |
| by-right-permitting                      | 1 / 0 / 1 | Qualifying parcels/projects, objective standards, review deadlines/exceptions and permit reader.                                                                         |

Full catalog IDs and exact saved answers are preserved in the adjacent Floral JSON's currentMappingChecks field. All eighteen exact question/answer/state directions still lack registered automatic configurations. None of the forty-one original cases became a typed enactment. Known Boolean answers do not establish that a bill is unformable, but they do not supply the missing payload or reader.

## 6. Executed checks and proof limits

Empty source-file diffs verified the exact PR1215 and updated PR1217 pair in the runtime. All fourteen after-run IDs match the original inventory: eleven council bypasses, one local fallback, two authored scenarios. Forty-one registry queries returned no mapping. The completed observer year reached January 5, 2027 with zero typed enactments out of fourteen.

No proposed new source-model code, source acquisition, snapshot validation fixture or sponsor amount decision has been implemented. Save/Continue, browser acceptance and year-speed gate were NOT RUN. The older diagnostic compiler checks do not validate a future snapshot implementation.

## 7. Worked example and next bounded checkpoint

The failed ordinary-state-service-cash caller has a sponsor and authority context, but no governing law, saved lineage or prior transit appropriation. Its introduction returns null; the unchanged baseline passes. Opening resident Frances Khan has no extracted law-linked paycheck, rent or tax consequence in the repeated Floral report. No dollars are invented.

Next checkpoint after the source/ownership decision: acquire the first actual transit program appropriation and complete service/timing/scope terms, store them through the proposed existing opening writer, demonstrate a first supported sponsor draft without synthetic enactment, and rerun the failed caller. If source law lacks a required term, report that exact field and continue a supported rule adapter instead of declaring the entire legislature unformable.

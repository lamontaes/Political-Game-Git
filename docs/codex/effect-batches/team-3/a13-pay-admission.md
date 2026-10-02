# A13 / A38 portable hourly pay admission payload — WIP

Base: `3b7f5c0b07d9bbe1f63ef18d82e558a243d63045`.
Published source donor: `aa548369984f66383cd87c37746ed99cdd5a28c5` (#1575).
Patch: `a13-pay-admission.patch`; Git blob SHA `f7447e87e925edfc8ae9f6e8aeb001897845ab14`; 106,918 UTF-8 bytes.

This commit changes documentation artifacts only. Production changes exist only inside the portable patch. It is a proposed dependency closure for the donor's existing hourly registration, including its saved-hourly/completed-shift arms, rather than a registry-only admission. Do not blanket cherry-pick #1575.

## Ownership and surviving writer

Coordinator owns the live law-consequence-registry.ts import/slot. This patch does not touch it. The existing exported `PAY_REGISTRATION` uses kind `pay`, selector `PAY_SELECTOR`, action `PAY_ACTION` (raise-hourly-floor), units minor/hour, published coverage predicates, resolvePayConsequences, resolveSavedHourlyPayConsequences and applyPayConsequence. Apply delegates to the sole `applyLawPayConsequence` in town-pay.ts. The data-only row module has no runtime writer imports.

Team 3 selected dependencies only. Shared core/type/reader/guard hunks are proposed for coordinator receipt and CTO review, not direct ownership transfers. Existing newer main tax attributes, public-employer profile, childhood records, operative-date logic and tax attribution calls are retained.

## Exact file/hunk list

- `src/simulation/law-consequences/pay.ts` (+606/-0; base blob absent): Existing published dependency module copied unchanged from the donor; no new writer or mechanism.
- `src/simulation/law-consequences/pay-rows.ts` (+69/-0; base blob absent): Existing published dependency module copied unchanged from the donor; no new writer or mechanism.
- `src/simulation/pay-coverage-query.ts` (+333/-0; base blob absent): Existing published dependency module copied unchanged from the donor; no new writer or mechanism.
- `src/simulation/pay-coverage-predicates.ts` (+118/-0; base blob absent): Existing published dependency module copied unchanged from the donor; no new writer or mechanism.
- `src/simulation/pay-coverage-types.ts` (+30/-0; base blob absent): Existing published dependency module copied unchanged from the donor; no new writer or mechanism.
- `src/simulation/completed-hourly-gross.ts` (+29/-0; base blob absent): Existing published dependency module copied unchanged from the donor; no new writer or mechanism.
- `src/simulation/earned-law-pay-integrity.ts` (+484/-0; base blob absent): Existing published dependency module copied unchanged from the donor; no new writer or mechanism.
- `src/simulation/types.ts` (+3/-0; base blob eaaefd7feb61034fd0dfb3cd324d3807ef6af12c): Optional coverage history/type import and EntityKind only; preserve current public-government, childhood and tax fields.
- `src/simulation/law-consequence-types.ts` (+11/-1; base blob d128a80f5aa4c58f3ace702feff3f7f2d410440f): Forward completedShift on context/result and add published saved-hourly-rule arm; preserve current tax attributes.
- `src/simulation/office-pay.ts` (+3/-2; base blob 6a17f81614fb42f4973a4723f1828e1ffe89afd8): paidOfficeOf optional actual historical cutoff forwarding only.
- `src/simulation/law-effect-stamp.ts` (+33/-1; base blob 1d60a967c36a04978c5c8abb17066afc1a0c69a0): Published questionless hourly ruleAuthority propagation and strict validation; preserve standing-service authority.
- `src/simulation/world.ts` (+6/-0; base blob 573e91a49a8182dd28f167d3a56d32f841d7b061): Optional-history enumeration and existing coverage/earned validation with shared ID set; no producer hooks.
- `src/simulation/living-world/town-pay.ts` (+362/-39; base blob 11ea50b84686b110aaed8417c8a569c4c3309849): Sole applyLawPayConsequence hourly/saved-hourly/earned arm, completion validation/context and independently guarded assessment transfer; no A37 monthly logic.
- `src/simulation/enacted-rule-changes.ts` (+10/-5; base blob 028e19e0302a6b3c3a28dfe38eca23c8e80050e3): Optional cutoff propagation/filtering; retain current operativeDateForEnactment and constitutional logic.
- `src/simulation/minimum-wage.ts` (+36/-15; base blob fce737e10a3ae51dfba4ceca03936dd91dc348bb): Narrow state setting cutoff/cache and canonical dated numeric-term read; preserve federal/local/fallback.
- `src/simulation/resources.ts` (+56/-4; base blob eed42743f102d0f3ed7a685fb01921fd05518f1b): Independent optional earned-assessment transfer join, exact lineage/amount guards and canonical pay stamp propagation.
- `src/simulation/resource-integrity.ts` (+29/-1; base blob aaafe9f9f2ccdfbd92d9b4d405602ced94428be6): Same assessment validation on reload; ordinary equality and chronology guards retained.
- `src/simulation/enacted-law-effects.ts` (+5/-0; base blob 801fb96ab626194ebf0548a4e3b177f68904b0ad): Published saved-hourly-rule arm only; preserve current typed-tax and standing-service dispatch.
- `src/simulation/policy-pack-registry.ts` (+7/-3; base blob b3fefaea33d05a9b9e6614d3feaa614097dda05a): Data-only wage-row append by qualified keys; preserve existing service/coverage/tax rows.

## Explicit exclusions

No law-consequence-registry.ts edit. No A37 monthly-work-pay query, monthly accounting/legacy coverage, local-economy consumer, opening/hire coverage producers, annual-office action, starting-law JSON/rates or old-stack wholesale copy. Legacy direct floor copies remain on the base; their A38 retirement follows successful admission. No playtest changes.

## Checks and unresolved dependencies

Executed: in-memory Myers unified-diff generation and exact old/candidate reconstruction for all 19 files, 19/19. This is a mechanical text check, not native git apply or semantic proof.

NOT RUN: native git apply, scoped TypeScript, changed tests, lint/format and official Claude gate. Executor startup failed with 'failed to query executor configuration capabilities'. Local source/dirty bytes remain preserved. No runtime or READY claim.

Remaining work: apply/check the patch against the exact base; review shared cutoff, nullable-rule stamp and integrity hooks; coordinator admits the one pay registry slot only after the actual source contract is accepted. Current starting-law data and exceptional AS/NY/OR scope must remain strict; this payload adds no guessed rate or jurisdiction and makes no all-56 numeric coverage claim. It adds no canonical opening/hire coverage producer and no annual office authority migration.

Receiving command, on an exact base checkout: `git apply --check docs/codex/effect-batches/team-3/a13-pay-admission.patch`, then apply on the authorized composition. Native results must name their final source pin; donor receipts do not certify this patch.

Replaces: dependency selection from the broad #1367/#1575 stack with a portable hourly-only proposal; retains the existing pay writer and independent transfer validation rather than creating a second payroll system.

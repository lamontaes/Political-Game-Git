# One law path, shared consequence handlers

Laws will declare who they reach, what changes and how the amount is computed. Starting laws and enacted laws will use the existing enactment-effects module and the same kind handlers. A completed payment, coverage change or legal determination remains the evidence that a person was reached. This is the proposed build contract for CTO review, not a claim that the engine is implemented.

## Shared data contract

Each catalog question gains an optional `consequences` list. Each row has a stable `id`, `kind`, `when`, `who`, `what`, `amount`, `conditions`, `lag`, `onRepeal`, `evidence` and optional `onward` rows. Direct consequences and onward links use this same row shape; an onward row reads recorded outputs of its parent instead of a binary law flag.

- `kind`: pay, tax, price-cost, coverage-eligibility, right-permission, service-delivered, legal-outcome or institution-rule. These are fixed handler kinds, not law names.
- `when`: legal effective transition or the existing relevant activity, such as payroll, assessment, renewal or completed service. Enactment cannot pay every future paycheck immediately.
- `who`: a declarative selector over existing people, households, firms or places, with jurisdiction and saved-record predicates. Selection preserves real IDs and excludes unsupported or missing facts.
- `what`: an allowlisted field or action supported by the kind handler. No arbitrary object path or JavaScript execution.
- `amount`: a unit-checked expression over saved law terms and actual subject/activity inputs. Initial operations are term, record, sum, difference, product, ratio, minimum and maximum. Constants require declared units and source or explicit legal terms. No sampling operation or default invented coefficient.
- `conditions` and `lag`: predicates over actual dates, eligibility, exposure and capacity. Study timing and legal effective dates are separate. An unserved child is not an exposed child.
- `onRepeal`: end future eligibility, recompute a prospective rule, or preserve completed consequences. Repeal never deletes an earned wage, paid transfer, delivered service or diploma. Existing contracts and legally protected terms remain binding.
- `evidence`: source identity, population, units, uncertainty, scope and why-chain. Sampling uncertainty is not a place-to-place distribution.
- `onward`: the same consequence rows consuming saved parent records. Existing links.json keys remain stable references. No parallel multiplier engine or independent second application of the same link.

A mod adds a row using registered selectors and kinds. Unsupported selectors, actions or units fail validation with the exact missing capability. A genuinely new kind requires engine development; adding another law using supported kinds does not.

## Runtime contract and ownership

Coordinator owns `enacted-law-effects.ts` orchestration, the companion `law-consequence-types.ts` schema, catalog admission/validation and shared link conversion. Existing `applyEnactedLawEffects` remains the enactment entry point. It resolves operative catalog rows through the existing law reader and dispatches to the shared application function. Starting-law initialization and ordinary activity calls enter that same function with the same resolved contract. Audit/Systems will name their exact current divergence before wiring.

Proposed shared API:

```ts
applyLawConsequences(world, context): World
// context: date, activity kind, actual activity IDs, affected subject IDs
// and optional governing-law restriction for an effective transition.

applyLawPayConsequence(world, resolved): World
// resolved: row ID, operative LawInForce, person/work/pay-flow IDs,
// evaluated amount with units, effective date and source-record IDs.
```

Team2 owns the pay-kind adapter and its focused tests. Its production seam is a narrow generic export in existing `living-world/town-pay.ts`; it must reuse existing pay-term and transfer writers. Exact Team3 overlap release is required before edits. Team2 may prepare its test cases now. Coordinator owns the shared input type, so no second schema is created.

The pay handler changes prospective pay terms when legally required. The existing payday transfer records actual money and carries attribution. Minimum-wage and teacher-floor rows use the same handler with different selectors/terms. No simultaneous execution of old per-law logic and the migrated row is allowed. Enable each converted row only when its old path delegates to the shared handler or is disabled for that row.

## Saved evidence and repeat application

Every changed record carries the existing law stamp and actual cause IDs. Idempotence uses the stable row, governing-law revision, subject, activity and effective date against existing saved consequences. Repeat settlement and Save/Continue must neither pay twice nor duplicate events. Null research remains an explicit unsupported calculation, not zero, eligibility or a fabricated observation.

The same named-person records feed noticing and any aggregate calculation. Aggregates must reconcile to the covered population and actual units; a government budget row alone cannot count as a rider, patient, pupil or paid worker. Onward effects run only after their recorded exposure exists.

## First pay proof by 5:00

1. One starting-law wage row and one enacted-law wage row reach the same handler.
2. The legal term and the actual job/pay period determine the amount; named worker terms and completed payments retain the law.
3. An amended term affects the proper future period. Repeal preserves earned and paid history and follows the prospective legal rule.
4. Repeat application and canonical Save/Continue preserve IDs and produce no duplicate payment.
5. A modded additional wage row works without TypeScript edits. No other law is claimed migrated by this test.

## Remaining decisions and evidence

Audit/Systems supplies the 92-law kind map, starting/enacted divergence, selector bases and existing effect-map writer contracts. New per-law month/index claims are stopped by CTO3:19. Existing stamp batches can finish as the first handler version. Team3 tax integration1300 remains a preserved attribution candidate; it does not establish the new shared engine.

Source read: current fetched main, existing applyEnactedLawEffects and town-pay writers. No new runtime checks or implementation acceptance is claimed by this design. CTO design review is due3:45; first pay-kind execution is due5:00.

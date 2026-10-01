# Replacement and removal ledger

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`.
Written September 30, 2026, 6:43 p.m. Eastern after executing `date`.
Read-only audit recommendation, not authorization to edit or a claim that migration checks passed.

The order below follows dependencies. Do not delete a file because its name resembles another. Retain record identities and old saved history; change future producers after their consumers have been transferred.

## 1. Financial account reconciliation

**Replace:** independent government cash arithmetic in `src/simulation/public-budgets/month.ts:701–720` and the separate federal settlement dispatch at `src/simulation/public-budgets/index.ts:167–171` (`settleFederalTreasuryMonth`).

**Retain:** resource positions, flows, obligations and transfer outcomes; the distinction between budget authorization and cash. Shared writer entry points include `src/simulation/resources.ts:275` (`createResourceFlow`) and `src/simulation/resources.ts:442` (`recordResourceTransferOutcome`). Retain budget classifications and useful reports as consumers.

**Before removal:** reconcile each government's existing budget balance with its actual account without summing both as independent money. Give opening discrepancies an explicit migration record. Make budget cash derive from the authoritative transactions. Prove that tax collection, partial program payments and federal-to-local transfers each affect the correct accounts once. Only then remove the superseded cash writer; retain planned spending as plans.

## 2. Repair the payment-to-budget bridge

**Replace:** the incremental temporary flow map and completed-only filter in `src/simulation/public-budgets/month.ts:161–189` (`readMonthFlows`). Excerpts: mapping only newly seen flows and `outcome.status !== "completed"`.

**Retain:** stable flow and outcome IDs and their cursor semantics.

**Before removal:** use the authoritative flow lookup for every newly seen outcome; include actual amounts of partial transfers. Check two outcomes on one old flow across successive reads and a partial payout. These are required future checks, not tests executed during this audit.

## 3. One payroll/obligation settlement

**Replace:** each producer's private gross-pay, withholding, period and affordability choices after all callers use shared settlement. The blanket full-payment construction in `src/simulation/local-economy.ts:692–700` is one specific removal target: `status: "completed"` with `transferredAmount: terms.amount`.

**Retain:** compensation terms and effective periods in `src/simulation/resources.ts:645–726`, actual work records, source-account overdraw protection at lines 571–589, and the shared minimum-wage resolver. Do not delete weekly and shift interfaces merely because their cadence differs.

**Before removal:** compare the same person's gross entitlement, legal wage floor, withholding, net payment and employer cash across supported work cadences. A source shortage must produce a recorded partial/blocked result rather than assumed success. Transfer every known payroll caller before retiring its private computation.

## 4. One loan servicing path

**Replace:** the private player mortgage loop `src/simulation/home-purchase.ts:620` (`settleMortgages`) after contracts use shared loan servicing.

**Retain:** home ownership, collateral, accepted purchase terms, outstanding principal and payment history. Do not invent retroactive interest on old zero-interest contracts.

**Before removal:** convert one existing mortgage's original terms explicitly, settle future installments exactly once, and route default to the lawful shared case/foreclosure process. Remove the private loop only after all its call sites delegate to the common servicer. The audit found two servicing paths; it did not prove a double debit.

## 5. One law consequence entry

**Replace:** special-case and drawn legal readers one consequence kind at a time. The central dispatch at `src/simulation/enacted-law-effects.ts:245–272` already exists and should be extended, not duplicated. Its `isPinnedTransitMeasure` branch at lines 267–268 is a concrete special-case target.

**Retain:** enactment, law identity, authority, effective dates, amendment lineage, saved duties and eligibility records. Opening laws and passed laws must supply the same consequence contract.

**Before removal:** trace terms into the affected person's entitlement, payment or permission and into the authoritative government account when money is involved. Compare initial and newly enacted instances of equivalent legal terms. Transfer every consumer of the old reader; then retire its outcome calculation, leaving source evidence and read-only legacy interpretation intact.

## 6. Remove fictional authority substitutes

**Replace:** production use of `buildProfile` in `src/simulation/world-setup/state-tax-service-profiles.ts:61–137`, including the drawn tax rate and generic repair unit. `src/presentation/tax-work.ts:34–50` currently uses this when sourced tax power is absent.

**Retain:** exact jurisdiction binding, digest validation and the underlying filing and appropriation writers.

**Before removal:** populate actual authority and legal terms for the jurisdictions claimed supported. Give real service assets measured quantities and costs. Keep historical fictional profiles labeled in old saves. A coverage inventory must distinguish real law, explicit fictional scenario and unsupported jurisdiction. Remove the fallback only when consumers handle those distinctions.

## 7. One proposal and sponsor decision

**Replace:** `fileLegislatureMeasure`'s private choice producer at `src/simulation/governing/legislative-clock.ts:1615–1664`: `rng.pick(authored)`, random sponsor, and sponsor manufacture. Also replace the drawn amount and option choices in `src/simulation/governing/automatic-legislation.ts:475–522`.

**Retain:** session legality, duplicate-intake guards, draft compiler, typed terms, measure numbering, actual member authority and `introduceMeasure`.

**Before removal:** route each incoming agenda through a real member's proposal with recorded reasons and requested terms. Map existing pending measures without refiling them. Stop the old producer for that route before enabling its replacement, so the same intake cannot introduce two measures.

## 8. One governing result

**Replace:** synthetic `budgetOutcome` at `src/simulation/governing/state-governing.ts:2233–2268` and `implementationOutcome` at lines 2191–2229 once their consumers read real results.

**Retain:** executive requests, follow-up identities, actual enacted appropriations and service records.

**Before removal:** bind every follow-up to a measure/program and distinguish requested, enacted, funded, paid and delivered. Transfer the consumers of old funded/progress tags first. Then remove the party/skill shortcut and staff-score success calculation. Preserve earlier tags as historical records rather than rewriting them as verified delivery.

## 9. One appointment and committee record

**Replace:** the committee shuffle in `src/simulation/governing/committee-assignment.ts:110–116` and Chief Justice legacy random nomination at `src/simulation/governing/chief-justice-vacancy.ts:232–235`. Remove confirmation without a vote at lines 395–438.

**Retain:** actual membership queries, appointment/confirmation decisions, tenure, rejection retries, vacancies and roll calls.

**Before removal:** model the authorized appointing actor and applicable institution's rules. An absent Senate or unresolved choice must leave a vacancy pending. Transfer committee-report consumers to saved appointments before removing the shuffle. Verify that a rejected appointment does not write tenure.

## 10. One decision engine with a real undecided state

**Replace:** random close-choice adjustment at `src/simulation/decisions.ts:176–188` and alphabetical selection at lines 199–203. Also replace private stance generation at `src/simulation/living-world/party-evolution.ts:199–211` rather than assuming `randomness: "none"` fixes seeded inputs.

**Retain:** canonical reasons, evidence snapshots, constraints, durable choices and existing person records.

**Before removal:** change callers to understand unresolved alternatives before changing the evaluator. Check veto, plea, invitation, hiring, appointment and other consumers individually for defaults that turn null into yes/no/success. The ledger does not authorize a global search-and-replace.

## 11. One date-advance orchestration and office lifecycle

**Replace:** duplicated post-advance composition at `src/simulation/world.ts:1425–1461` and `src/simulation/time-work.ts:1987–2029` with one invoked composition. Then transfer office adapters by operation rather than deleting six files wholesale.

**Retain:** future due items, legal dates, term/vacancy identities, stable history and both ordinary time-advance interfaces.

**Before removal:** compare one large time step with smaller steps across an election, death, vacancy and enactment. Each expected record must appear once. Consolidate common operations first; keep office-specific legal profiles as data. Delete an adapter only after no supported route depends on its unique operation.

## 12. One physical damage result; narrative reads it

**Replace:** separate dwelling/household damage draws at `src/simulation/crisis/disaster.ts:392–409` and downstream rolled deaths/injuries at lines 417–450.

**Retain:** real dwellings, occupancies, health/death records, repair obligations, office continuity and notices.

**Before removal:** record an evidenced hazard/exposure at the physical asset, derive occupants' consequences from that mechanism, and prevent household and dwelling rows from representing the same repair twice. Repair progress must follow actual work/capacity and spending. Do not replace dice with invented deterministic damage curves.

## 13. Presentation consumes facts and actual presence

**Replace:** school project facts created by `src/presentation/run-b-conversation-progress.ts:289–295` without an assignment and room membership inferred from shared enrollment or home jurisdiction at `src/presentation/formative-play.ts:580–613` and `src/presentation/ordinary-life.ts:759–780`.

**Retain:** existing people, conversation history, explicit player choices, actual meeting activity gates and shared commit writers.

**Before removal:** provide recorded project/deadline and current presence inputs. Hide unavailable topics instead of supplying fictional facts. Keep harmless sentence variation distinct from any function choosing a consequence. Only after all room consumers use actual presence should the inferred-presence builder be retired.

## What this does not establish

No migration was implemented or executed. Source comparisons establish the listed risks and boundaries, not that any proposed deletion is currently safe. The number of laws unlocked per change remains unmeasured. See the verification supplement for excerpts, qualifications and further findings.

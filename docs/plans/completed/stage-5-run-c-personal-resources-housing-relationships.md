# Stage 5 Run C — Personal Resources, Housing, and Relationship Integration

Status: **COMPLETED 2026-08-23**

## Goal and boundary

Complete Stage 5 by composing exact personal/household resource movement, work compensation, major obligations, dwellings/occupancy/tenure, care/support costs, and meaningful relationship effort into the canonical sequence-aware life graph. Preserve Runs A/B identities, subjective provenance, deterministic persistence, and one played/quick/authored history-production path.

This run does not implement consumer banking, credit scoring, property markets, campaign/organization/government finance, Stage 6 generalized events or macroeconomy, Stage 7 law or territory content, foreign-government simulation, or polished/player-facing UI.

## Authority and approved research gate

- [x] Verify clean `main` at audited Run B checkpoint `8b2f8b4b7600eeccd7f545a6edc9ff7bcd5afdfe` with no configured remote.
- [x] Read the repository authority hierarchy, D-031 through D-039, completed Stage 5 plans, affected system contracts, roadmap/dependency contracts, acceptance specification, and relevant simulation/persistence architecture.
- [x] Treat the Run C brief's product/reality conclusions as the approved research gate; perform no duplicate broad web research.
- [x] Re-run the permanent Architecture Integrity Audit over all affected Stage 1–5 boundaries.

## Architecture to implement

- [x] Add exact integer-minor-unit money with validated currency identity and typed person/household/organization flow endpoints.
- [x] Add effective expected resource-flow arrangements and separate committed transfer outcomes, preserving partial/missed/blocked results and date-plus-sequence availability.
- [x] Add effective work-compensation terms that attach to canonical work identity and explicitly resolve pay periods through the shared flow/outcome vocabulary.
- [x] Add canonical opening resource positions and derive historical liquid position without arbitrary balance mutation or double-counting.
- [x] Add durable major obligations/debt terms and state distinct from actual payment outcomes, plus structured affordability/capacity queries.
- [x] Add stable dwellings, occupancy, and tenure/ownership/lease/assigned-housing histories while preserving household identity and existing multi-residence semantics.
- [x] Link care/support costs and cross-household support through ordinary obligations/flows without inferring structural relationships.
- [x] Add meaningful contact/support/missed-opportunity/reconnection helpers that compose time, events, interactions, and optional subjective records without a maintenance meter.
- [x] Extend typed life sources and Stage 4 evidence for actor-relevant resource/housing records with effective-date plus exclusive-sequence safety.
- [x] Extend `CharacterHistoryPlan` so played, generated, and authored resource/housing transitions use the same canonical writers.
- [x] Advance world/generator/snapshot versions consistently; preserve nondiegetic materialization and exact JSON/Node-only SQLite persistence.

## Semantic acceptance

- [x] Prove salary outcomes, historical raises, concurrent jobs, and unpaid work boundaries.
- [x] Prove same salary can yield different practical capacity because obligations/support/housing differ.
- [x] Prove cross-household support and care costs without structural relationship inference.
- [x] Prove expected versus completed/partial/missed/blocked outcomes and reconciled positions.
- [x] Prove structured available/strained/blocked affordability and debt constraint without a credit model.
- [x] Prove rent → move → ownership for one household, resident without tenure, owner without occupancy, assigned housing, and existing multiple residence compatibility.
- [x] Prove relationship contact, missed opportunity, and years-later reconnection through ordinary history rather than decay/upkeep points.
- [x] Prove explicit resource pressure produces Stage 4 knowledge/appraisal/temporary/decision evidence without a universal stress score.
- [x] Prove typed source and backdated append cutoffs, open-set validation, no duplicate truth, nondiegetic materialization, and exact persistence.
- [x] Prove one continuous Stage 5 life across formative, education, work, family/care, compensation/resources/obligations, housing, and reconnection history.
- [x] Retain all 137 pre-Run-C tests without weakening assertions.

## Completion gate

- [x] Update Architecture, Roadmap, System Dependencies, Acceptance Tests, Decision Log D-040, Architecture Integrity Audit, and affected/new system documents.
- [x] Run format, lint, typecheck, all tests, build, deterministic demo, JSON/SQLite verification, dependency-boundary checks, `git diff --check`, and the available npm security audit.
- [x] Inspect the final diff for Stage 6/7/UI or campaign/government-finance leakage and generated/local artifacts.
- [x] Move this plan to completed with exact validation evidence, create one clean Run C checkpoint, verify status, and stop before Stage 6.

## Completion record

- Starting HEAD was clean `main` at `8b2f8b4b7600eeccd7f545a6edc9ff7bcd5afdfe`, directly after accepted Run B, with no configured remote.
- `npm run validate` passed: Prettier, ESLint, TypeScript, 16 Vitest files / 150 tests, production Vite build, and deterministic `validation-seed` demo.
- The demo reported `reproducible: true`, world `world_7e643cba59d12c45`, snapshot `snapshot_6f18c1e76d7fb495`, six people, eleven events, one organization, two work relationships, two households, and one care responsibility.
- `stage-5-run-c.test.ts` contains 12 behavior tests covering salary/raises/concurrent and unpaid/future work, actual outcome distinctions and exact reconciliation, unequal capacity and bounded debt, cross-household care/support separation, housing movement/tenure cases, relationship history/reconnection, Stage 4 pressure evidence, backdated source safety, open taxonomies/corruption, history-plan convergence/materialization neutrality, and continuous Stage 5 life.
- `sqlite-world-repository.test.ts` adds exact Run C save/load/list/replace coverage for every new identity/state/outcome family and typed source. The complete suite retains all 137 Run B tests; boundary tests prohibit React/UI/SQLite imports from production simulation.
- World schema is 9, generator is `demo-world-v9`, snapshot format is 8, and person materializer remains version 4. Older unsupported versions remain rejected; no migration or fabricated `PersonFact` sequence was added.
- `git diff --check` passed and the online `npm audit --audit-level=high` reported zero vulnerabilities. The final commit hash and clean status are reported outside this self-referential commit record.
- The audit records one contained retroactive D-039 correction: resolver-only `*StableKey` fields are now stripped before canonical writer input. It also records the one-obligation-per-flow and debt-overpayment integrity boundaries discovered during Run C.
- Stage 5 is **COMPLETE**. Campaign/organization/government finance, generalized Stage 6 events/economy, Stage 7 law/territory content, foreign-government simulation, banking/credit/property-market depth, and polished UI remain deferred. Stage 6 is the next candidate and was not started.

## Post-completion corrective audit follow-up

- The external audit found three contained D-040 semantic defects: affordability added incomparable cadence amounts, one flow could accept overlapping settlement periods, and settlement selected terms by later occurrence date.
- D-041 corrects the semantics without revising Run C history: affordability now retains exact cadence buckets and requires an explicit exact comparison bucket; outcomes are unique over each flow's inclusive settlement interval; and terms resolve at period start while an intra-period change is rejected pending proration.
- The focused semantic coverage now includes different weekly/monthly buckets, comparable monthly constrained versus unconstrained capacity, duplicate/overlap writer rejection, corrupted deserialized duplicate-period integrity failure, general and work-compensation late settlement after a raise, and an explicit unprorated-boundary rejection. The continuous Stage 5 test now also carries a missed housing outcome through cutoff safety and the full Stage 4 resource-pressure evidence/decision path before exact JSON round-trip. Existing SQLite coverage remains the complete Run C persistence gate.

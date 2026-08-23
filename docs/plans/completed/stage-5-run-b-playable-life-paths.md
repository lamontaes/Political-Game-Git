# Stage 5 Run B — Playable Life Paths and Character History

Status: **COMPLETED 2026-08-23**

## Goal and boundary

Implement a headless, bounded Run B composition layer over the accepted Run A life-history primitives. Played, deterministic quick-generated, and manual/authored histories use one canonical transition boundary. Formative life resolves in sparse intervals/scenes; adult paths compose education, work, participation, households, relationships, and time demand.

This run does not implement personal resources or compensation accounting, debt/liquidity, dwellings/property, relationship maintenance, generalized event chains, mutable law/institutions, territory content, foreign-government simulation, organization hierarchy, population-scale rosters, or player-facing UI.

## Completed implementation

- [x] Added `CharacterHistoryPlan` and a typed applicator that delegates to existing canonical writers for every persistent transition. Plans are orchestration only and create no biography blob or alternate event/history store.
- [x] Added closed, auditable `generated` life provenance for deterministic pre-play construction while retaining authored and simulated-event meaning.
- [x] Added explicit bounded context-person construction; peers, teachers, mentors, caregivers, and coworkers are ordinary stable people. Teacher/school and peer/school context uses existing work/enrollment organization identity.
- [x] Added 0–7, 8–12, and 13–17 interval bands calibrated to a detailed 18–30 anchor budget, plus a small life-situation catalog covering household/school, peer, teacher, activity, civic, teen-work, and future-preparation context.
- [x] Routed situation outcomes through the same plan applicator into ordinary events, interactions, knowledge, memories, appraisals, temporary context, event-backed life transitions, and non-applying repeated-history development proposals.
- [x] Added deterministic quick history construction with six anchors and canonical household/care/authority, school transfer, participation, peer/teacher context, teen work, and subjective records.
- [x] Added compositional apprenticeship, Guard/Reserve activation/return, and PCS/OCONUS household-relocation plan helpers. Completion uses the existing enrollment completion state; no credential database was added.
- [x] Added Run B semantic tests and SQLite coverage; bumped world schema to 8, generator to `demo-world-v8`, and snapshot format to 7. Person materializer remains version 4.

## Semantic acceptance evidence

- [x] `stage-5-run-b.test.ts` covers compressed and 18-anchor detailed formative history, all three production modes, decades-long subjective peer continuity/conflict, teacher context, lunch-table choice and subjective records, repeated-history development evidence, manually authored guardian/school/activity history, injected teen-work eligibility, apprenticeship, Guard/Reserve coexistence, OCONUS relocation, quick-generation determinism, materialization neutrality, and JSON round-tripping.
- [x] `sqlite-world-repository.test.ts` preserves generated Run B provenance, context people, canonical records, append sequence, and save/load/list behavior exactly.
- [x] Existing Run A tests retain transfer/rename, date-plus-sequence, `PersonFact` compatibility, typed life-source, open-taxonomy, materialization, and integrity coverage. The complete suite retains all prior tests without weakened assertions.

## Audit and validation

- [x] Updated Architecture, Roadmap, System Dependencies, Acceptance Tests, Decision Log D-039, Architecture Integrity Audit, and affected life/history/characters/relationships/events/mind/time/institutions contracts.
- [x] Re-audited D-031 through D-038, progressive materialization, append sequence, canonical-first `PersonFact`, stable organizations/schools, separated life relationships, subjective history, development agency, eligibility injection, open taxonomies, deterministic generation, persistence, jurisdiction openness, and all deferred-stage boundaries.
- [x] `npm run validate` passed: Prettier, ESLint, TypeScript, 15 Vitest files / 137 tests, production build, and deterministic `validation-seed` demo.
- [x] The demo reported `reproducible: true`, world `world_d9229fd2e1b4c89e`, snapshot `snapshot_295d9781b760729f`, six people, eleven events, one organization, two work relationships, two households, and one care responsibility.
- [x] `npm audit --audit-level=high` completed online with zero vulnerabilities.
- [x] `git diff --check` passed before the checkpoint; final commit and clean status are reported outside this self-referential commit record.

## Next boundary

Stage 5 remains **IN PROGRESS**. Run C — personal resources, housing, and relationship integration — is the next bounded candidate and was not started.

# Incident response consumer

Authority: BUILD-OUT7 shared execution and section E, issued 2026-09-09, plus the current user assignment. This extends accepted incident semantics through existing writers. It does not reopen the Stage 6 evaluator, introduce a new World/store, or implement a declaration, hazard-rate or damage engine.

The consumer in `src/simulation/incident-response.ts` uses ordinary events and causal source links for reports, requests, decisions and follow-ups; `recordEventKnowledge` for explicit awareness; current work relationships for internal supervisory responsibility; canonical Work and scheduled activities for effort and attendance; and resource flows/terms/settlements for authored internal allocations. All persist through the existing integrity-checked snapshot codec.

Occurrence, report, declaration, affected area, authorization, delivery and personal experience remain distinct. A communication event records that a report was made. No report automatically certifies personal injury, money lost or intervention effectiveness. Reads create none of these records. Authorization requires an explicit request decision and delivery requires the same report's actual follow-up, current responsibility, active flow terms and sufficient funds. A settled flow cannot deliver twice.

The existing NEWS publisher owns publication. The feature consumes its pinned published interface without copying a publisher or adding source registries. Public visibility and actual publication are different: a reader needs a dated publication before this adapter grants knowledge. Private work and internal reports are never silently disclosed.

## Architecture audit and LEARN

- Constitution 3/13/22/25: canonical history, actor knowledge and real-source context stay separate and dated.
- D-002/D-006/D-045: pure TypeScript, JSON-safe canonical stores, existing incident evaluation unchanged.
- Time/resources: canonical minutes and exact money; no parallel allocator or wallet. Busy assignment is refused locally; baseline cross-writer capacity limitation is disclosed in the handoff.
- Ownership: only feature-local modules/tests/docs. UI root integration is an unapplied patch. No registry/barrel mutation, artwork, release promotion or merge.
- Integrity lesson: event-to-event links belong in causal-source records; `involvedEntityIds` does not accept every history-record family. Work provenance likewise has its own accepted entity families. Use each writer's contract instead of bypassing validation or changing shared entity registries for convenience.

See `docs/integration/incident-response7.md` for exact pins, source scope, tests and outstanding adoption. No claim of full public emergency management or normal-play acceptance is made.

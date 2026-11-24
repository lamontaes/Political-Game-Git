# Stage 6 Run E Vitality, Capacity, and Evidence

## Status

Completed — final bounded Stage 6 integration run. Stage 6.5 UI and Stage 7
institutions/law were not started. The conceptual Stage 6 implementation
milestone remains pending external repository audit.

## Scope

Add a versioned exact age-based mortality catalog; explicit materialized-person
birthday plans through the existing future-due mechanism; deterministic keyed
mortality results; durable death and functional-capacity histories; the common
actor-availability gate; objective evidence artifacts; explicit one-person
discovery/event/knowledge history; cutoff-safe queries; exact JSON/SQLite
persistence; and the final continuous Stage 5→6 integration gate.

Do not add population-wide mortality, daily rolls, health/disease state,
estates/inheritance, investigation/legal process, media/public opinion,
institutions/law, administration/budgets, or player-facing UI.

## Pre-implementation cross-system audit

### Vitality and time seam

- `Person.birthDate` is immutable and `detailLevel === "materialized"` is the
  only existing reconstructible relevance boundary. Mortality scheduling will
  be explicit and limited to materialized people; neither materialization nor
  time advancement will scan or schedule people automatically.
- `dateAtAge()` already uses February 28 as the non-leap-year birthday for a
  February 29 birth, while `ageOnDate()` currently disagrees on that day. Run E
  will correct and test that generic date-helper inconsistency.
- Run A's `FutureDueItem` remains the sole scheduler. A mortality due item will
  reference exactly one earlier plan, and domain integrity will reconstruct
  its person/year/date/table/probability meaning at its creation sequence.
- Ordinary `HistoricalEvent` remains writable about deceased people. Death and
  actor-capacity restrictions belong in vitality-aware domain writers, never a
  blanket event ban.

### Evidence and information seam

- `HistoricalEvent` is objective occurrence truth; `EventKnowledgeRecord`,
  memories, claims, appraisals, and perceptions remain subjective and separate.
- Incident and policy identities are canonical sources but grant no knowledge.
  An evidence artifact will likewise exist independently of discovery.
- Discovery will compose one ordinary `evidence.discovered` event, one durable
  discovery record, and one explicit direct event-knowledge record for exactly
  the discovering person. It will not teach related source events or anyone
  else.
- Every artifact/source and discovery/event/knowledge link will be validated at
  its own date plus exclusive global-sequence frontier.

### Whole-system and persistence seam

- New catalogs and history families must join `World`, `HistoryStore`, the
  contiguous global sequence, stable-ID collision checks, canonical entity
  availability, JSON snapshot validation, and Node-only SQLite payload
  round-trips.
- The serialized-shape boundary will advance to world schema 14, generator
  `demo-world-v14`, snapshot format 13, and vitality catalog v1. Incident v1,
  metric v2, causal v1, and person materializer v4 remain unchanged.
- The permanent maximum-current scenario is the existing continuous Stage 5
  through Run D integration test; Run E will extend it rather than create a
  disconnected mortality-only gate. The deterministic demo remains explicit
  and will not gain automatic mortality scheduling.

### Scope and leakage seam

- Stage 6.5 UI; Stage 7 institutions, law, authority, succession; Stage 8 media
  and public opinion; Stage 10/11 governing, budgets, administration, and staff;
  and Stage 16 investigations/legal process remain deferred.
- Death will not delete people or relationships, end work, mutate population
  metrics, transfer resources/property, or create estate/probate/inheritance.
  Later estate systems can consume the existing explicit resource-flow and
  transfer-outcome seams.
- Evidence access classification is objective metadata only, not an ACL,
  discovery probability, search process, chain of custody, subpoena, warrant,
  FOIA, newsroom, or court system.

## Integrity strategy

- Reconstruct catalog rate, birthday, age, mortality RNG, result, death, event,
  and due semantics independently from persisted records.
- Validate plans and due items at their own append frontier; preserve a
  once-valid item that later death makes obsolete and terminally cancel it at
  the due frontier.
- Permit only the reconstructible, idempotently resumable handler checkpoint
  needed to append one same-table next-year plan after a survival result before
  Run A appends the current due terminal state.
- Enforce one plan per person/check year, one due item and one result per plan,
  one death per person, linear capacity supersession, and one discovery per
  person/artifact.
- Apply occurrence/effective date plus exclusive sequence to every new query so
  later-recorded backfill cannot leak into an earlier view.

## Checklist

- [x] Audit accepted contracts, implementation seams, persistence, and scope.
- [x] Add vitality catalog, mortality/death/capacity histories, queries, and due handler.
- [x] Integrate the common vitality/capacity actor-availability gate.
- [x] Add evidence artifact/discovery histories, queries, and exact knowledge linkage.
- [x] Extend global integrity, entity availability, versions, JSON, and SQLite.
- [x] Extend focused and permanent maximum-current integration coverage.
- [x] Record D-046 and update architecture/system/roadmap/acceptance documents.
- [x] Run the complete validation/security gate, archive, commit once, and stop.

## Validation disposition

- Fourteen focused vitality/capacity tests and seven focused evidence tests pass.
- The final full suite passes 243 tests across 22 files, preserving the prior
  222-test baseline.
- Formatting, ESLint, TypeScript, architecture/boundary tests, permanent
  maximum-current integration, JSON/SQLite persistence, production build,
  deterministic validation-seed replay, diff checking, and the high-severity
  dependency audit pass.
- The adversarial Run E review closed with no open high- or medium-severity
  correctness defect.

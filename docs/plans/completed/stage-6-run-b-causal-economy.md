# Stage 6 Run B — Causal Mechanisms, Lightweight Economy, and Fiscal Continuity

Status: **COMPLETED 2026-08-24**

## Goal and boundary

Add one append-oriented causal provenance graph, one typed effect-mechanism catalog and activation history, exact contribution evaluation, and a deliberately small aggregate economy/fiscal query layer over Stage 6 Run A metrics. Preserve Stage 5 personal-resource truth, Run A observation/knowledge and due-frontier contracts, global append order, deterministic persistence, and the permanent current-maximum integration gate.

This run does not implement policy operations/baselines, generalized incidents or event selection, mortality/incapacity/evidence, mutable law/institutions, population-scale agents, media ecology, recurrence, or player-facing UI.

The named `14_STAGE_6_RESEARCH_AND_ARCHITECTURE_GATE.md` was not present in the repository. The complete approved implementation brief, D-031 through D-042, and the corrected Run A repository contracts supplied the binding gate; no web research or invented substitute document was used.

## Implementation record

- [x] Verified `main` at `9ec7af37f60e2dce0bf955141dee5bbad449b28c`, preserved the existing untracked source ZIP, inspected D-031–D-042 plus corrected Run A contracts, and confirmed no remote is configured.
- [x] Added exact rational scaling/division helpers required by typed mechanism evaluation and derived economy queries, including whole-minor-unit enforcement for money.
- [x] Added stable causal identity, parent/root ancestry, typed mechanism definitions, effect activation history, exact response curves, cutoff-safe evaluation, and anti-double-counting root queries.
- [x] Expanded the metric catalog minimally and added coherent labor, nominal/cost purchasing-power, aggregate proxy, fiscal-balance, and explicit metric-evaluation APIs.
- [x] Integrated IDs, chronology, global sequence, persistence, world versions, ordinary event references, and corruption validation.
- [x] Added focused behavioral tests, SQLite coverage, and extended the permanent maximum-current scenario without weakening the 173-test accepted Run A baseline.
- [x] Added D-043 and aligned Architecture, Roadmap, System Dependencies, Acceptance Tests, system contracts, and the permanent Architecture Integrity Audit.
- [x] Ran every required gate, reviewed scope/artifacts, prepared one bounded checkpoint, and stopped before Run C.

## Semantic evidence

- `stage-6-run-b.test.ts` contains 13 behavioral tests covering root fan-out, independent and downstream ancestry, root deduplication, graph corruption, backfilled sequence safety, exact linear and bounded nonlinear response, onset/ramp/maturity/expiry, thresholds and bounds, fractional-money rejection, metric compatibility, explicit evaluation/writing, same-date order, labor identities, purchasing power, aggregate proxies, fiscal derivation, non-omniscience, versions, and JSON round-trip.
- The continuous `stage-5-run-c.test.ts` scenario preserves the full formative/adult/resource/housing/relationship/Stage 4 and Run A path, then adds an ordinary causal source, correlated fan-out, an independent root, exact aggregate output evaluation, a differing observation and explicit person knowledge, historical cutoffs, exactly-once due resolution, and exact JSON round-trip.
- `sqlite-world-repository.test.ts` adds one Run B test preserving the causal catalog, root, activation, exact evaluated metric state, references, save/load/list, and replacement behavior through the Node-only adapter.
- `boundary.test.ts` and `architecture-integrity.test.ts` continue to reject React/DOM/browser, SQLite/persistence, network-runtime, and ambient-entropy leakage from the pure simulation package while checking global identity, chronology, references, and contiguous append sequence.

## Post-completion corrective evidence — 2026-08-24

The externally rejected `922e1f8c97577a50e89969485e7a535ca24a0d52` candidate retained the intended Run B architecture but left one generic effect ambiguity. This contained correction preserves the same schema generation and all existing causal/economy boundaries.

- Every activation now persists `magnitudeBasis`: a point metric uses `point-at-target`; an interval metric uses `interval-total` with one exact calibrated interval. A bare interval amount cannot silently mean a different month, quarter, or year, and there is no inferred cadence conversion.
- Contribution phase now derives from the target point, or the earlier inclusive midpoint of the exact target interval, rather than the later `evaluatedAt` frontier. The frontier remains cutoff-safe and must not precede the target period's end. The midpoint rule makes pre-onset/post-expiry intervals zero and makes onset/ramp/maturity/expiry overlap deterministic without adding a continuous economy model.
- Writer and persisted-world integrity reject missing, malformed, and target-incompatible bases. Direct incompatible evaluation rejects; aggregate evaluation filters to period-compatible activations, and the canonical result preserves only the baseline plus actual contributing activation IDs.
- `stage-6-run-b.test.ts` now extends the original focused suite with January point-retroactivity, point onset/ramp/maturity/expiry, interval midpoint, cross-duration incompatibility, aggregate-provenance, JSON corruption, and exact JSON-basis coverage. The existing bounded nonlinear, threshold/bound, append-order, cutoff, and arithmetic cases now use valid target periods.
- The permanent maximum-current `stage-5-run-c.test.ts` scenario and Run B SQLite fixture now supply durable valid bases, proving the existing life/resource/knowledge/future-transition path and Node-only persistence continue to compose with corrected effects.

## Validation record

- `npm run format` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- Focused Run B + maximum-current + SQLite gate passed: 3 files / 34 tests.
- Full `npm run test` passed: 18 files / 187 tests, preserving all 173 accepted Run A tests and adding 14 Run B tests.
- Explicit simulation boundary/integrity gate passed: 2 files / 4 tests.
- `npm run build` passed; Vite transformed 59 modules and produced the static diagnostic build.
- `npm run demo -- validation-seed` reported `reproducible: true`, world `world_9b708235c4469e26`, snapshot `snapshot_c138228e8cfa3810`, date `2026-01-26`, six people, eleven events, one organization, two work relationships, two households, and one care responsibility.
- Deterministic JSON and Node-only SQLite round trips passed in the full/focused suites.
- `git diff --check` passed.
- Online `npm audit --audit-level=high` completed with zero vulnerabilities.
- Final artifact/scope review found no generated junk, secret, duplicate repository, local-machine file, Run C–E implementation, Stage 7+ implementation, population-scale economy, second scheduler, recurrence/formula language, or UI change. The pre-existing untracked `Political-Game-5f1f230-source.zip` remains untouched and excluded.

## Version and checkpoint record

World schema is 11, generator is `demo-world-v11`, snapshot format is 10, world-metric catalog is `world-metric-catalog-v2`, causal-mechanism catalog is `causal-mechanism-catalog-v1`, and person materializer remains version 4. Unsupported older snapshots remain explicit rejection; no migration, fabricated history sequence, or automatic economy history was added.

The bounded checkpoint uses the message `Implement Stage 6 Run B causal economy foundation`. Its exact final hash and clean/expected status are reported in the completion report because a commit cannot contain its own content-derived hash.

Stage 6 remains **IN PROGRESS**. Run C is only the next candidate and was not started.

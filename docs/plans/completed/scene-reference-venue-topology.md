# Section A — scene reference and venue topology

Authorized source: 01_CURRENT_IMPLEMENTATION_PROMPTS — 2026-09-05, Section A
(Drive `1mnN8JXMsenaDMOXBr59FIqJlYGW5fpSlK1kOsNGm8Qo`).
Base: `8733190609c5620c40ed424686d43fb72fb78d0c`.
Branch: `codex/scene-reference-venue-topology`.
Workspace: `/Users/lamontae/Documents/Political-Game-Venue-Topology`.

## Scope and boundaries

Add a headless, JSON-safe reference catalog and deterministic date/topology
resolver under `src/environment/reference/`. Consume 18J and 43A, preserving
newer corrections, evidence classes, unknowns and render-blocking discrepancies.
Keep physical identities separate from institutions and dated uses. Seed the ten
requested states and six congressional office-building families. No world writes,
travel costs, personalization content, scene art or runtime integration.

PR #103 owns scene specs, scenes, surface bindings/projections, player components,
scene gallery, related CSS/tests and `docs/systems/scene-and-person-presentation.md`.
Do not edit any of those paths. Source workspace remains read-only.

## Steps

1. Verify preflight/base/ownership and consume research and technical contracts.
2. Define validated identities, claims, geometry, dated use and availability.
3. Encode bounded sourced corpus; preserve missing sheet provenance and ambiguous
   geometry rather than claiming primary drawings were acquired.
4. Implement/test resolution, topology, fail-closed rendering, serialization,
   stable ordering and boundary isolation.
5. Document architecture audit, coverage/exclusions and LEARN findings.
6. Run full relevant validation plus art validation/inventory/QA. Re-fetch heads,
   commit/push and open a new draft PR. Do not merge.

## Initial evidence

Remote main matches the exact base. Clean new worktree passes agent preflight;
new branch has no upstream until first push. Original workspace is detached at
`d241d543e1ec878880b621f75d41c475480c978c` with two modified evidence images;
neither is touched. #103 file list verified at
`e8a9569d71aa50103e84fcc9f188ed277cc83745`.

## Implementation and review findings

Implemented isolated types, strict JSON shape and semantic validation, immutable
research corpus, pure dated candidate resolution, topology and deterministic
serialization. The corpus has 30 buildings, 49 named rooms, 82 venues, 84 availability
eras and 95 scene-use references; geometry records preserve the 18J class and
unresolved primary-evidence status. Focused suite: 29 tests passed. Typecheck passed.

The full `npm run validate` passed format/lint/typecheck, then stopped at two
existing 5000 ms test timeouts (Run D-Lite continuation and source-corpus digest):
119 files, 1898 tests, 1896 passed. A two-worker full rerun was started without
changing tests or deadlines. Art inventory and QA both passed and regenerated no
tracked differences. A source-row comparison proves encoded chamber values match
the preserved research, independent of the implementation's numeric arrays.

No player-facing changes, so browser pointer/keyboard and human visual review
are not applicable to this implementation lane. Exact-art evidence and subsequent
runtime integration remain explicit separate gates, documented in
`docs/systems/venue-reference-topology.md` along with the Architecture Integrity
Audit and the small LEARN pass. PR #103 ownership overlap is empty.

## Final validation and delivery

- `npm run agent:preflight`: passed in isolated branch; new upstream established at publish.
- Focused reference suite: **29 passed**.
- `npm run typecheck`: passed after correcting a new shape-validator narrowing error.
- `npm run validate`: format/lint/typecheck passed, then **1896/1898** tests
  passed; two existing 5000 ms timeouts stopped the command. No semantic assertion
  failures occurred.
- `npm run test -- --maxWorkers=2`: **1897/1898** passed; the original two failures
  passed, but the existing character-component regeneration test timed out at
  5058 ms.
- `npm run test -- tests/character-components-validation.test.ts --maxWorkers=1`:
  **8/8 passed**, file completed in 2.87 seconds. All 1898 tests passed across
  the full runs/retry. Neither tests nor deadlines were changed; there is no claim
  of a single clean `npm run validate` invocation.
- Remaining gates run explicitly: `npm run source:validate` (10 domains, zero
  errors), `npm run source:replay` (byte-identical), `npm run build`,
  `npm run demo -- validation-seed`, `npm run validate:art`: **passed**.
- `npm run inventory:art` and `npm run qa:art`: **passed**, no tracked output drift.
- Final changed-file formatting/lint and `git diff --check`: required before commit.

Implementation complete; draft PR delivery only, no merge. Remaining limitations
are intentional evidence/art/integration gates described in the system document,
plus the observed machine-load test-timeout flakiness. Independent acceptance is
pending. Final exact head, remote state and PR URL are recorded in the delivery
response and PR body rather than an impossible self-referential commit field.

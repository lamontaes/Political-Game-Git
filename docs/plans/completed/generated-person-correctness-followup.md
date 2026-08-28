# Generated-person current-main correctness repair

Status: Implementation and local verification complete. One writer; bounded correctness only.

PR: [#19](https://github.com/lamontaes/Political-Game-Git/pull/19), open/unmerged against main.

## Starting gate and workspace

- Fetched origin; starting main: `e8a84a315a4385268f87251cb38efbb85919f5e9`.
- Accepted PR #18 head `9b429567de99377d9d310c7fa643a4f07e8ac128` is an ancestor (exit 0).
- Fresh worktree: `/Users/lamontae/Documents/Political-Game-Generated-Person-Correctness`.
- Branch: `codex/generated-person-correctness-followup`.
- Initial `npm run agent:preflight` passed; no upstream yet, as expected.
- No writes to PR #13, Antigravity, Jules, or other worktrees.

## Repairs and proof

1. Normalize DOB components before constructing a calendar date, then reconcile
   the birth year against unchanged canonical `ageOnDate`. Preserve RNG draws,
   person-v5/names-v1, valid existing output, and explicit leap-birthday coverage.
2. Extend existing person tests with adversarial selected-age invariants across
   leap/non-leap February boundaries and year boundaries, tens of thousands of
   deterministic cases, bounds, valid dates, and exact replay.
3. Resolve Run B/C/D-Lite role-dependent prose through canonical Person IDs and
   existing fixture roles, including DOM labels and recorded authored summaries.
   Preserve default legacy text; keep existing semantic keys, not a new name map.
4. Select legacy generation only when the seed argument is absent. An explicit
   legacy-named seed must select person-v5/names-v1 on the normal player route.
5. Protect PR #18 generic construction, Synthetic Tidal Basin, alternate home
   jurisdiction, replay, JSON/SQLite continuation, and existing golden hashes.
   Investigate any changed hash before considering an update.
6. Run focused suites, high-volume DOB proof, `npm run validate`, CI Playwright,
   both 100x100 stress profiles, art validation/inventory/QA, diff check, and
   final preflight. Verify default, alpha, beta, alpha replay, and explicit
   `stage-6-5-run-a` browser flows.
7. Correct only directly stale documentation, record audit/LEARN and evidence,
   publish one normal branch and PR against current main, verify exact-head CI,
   and leave the PR open/unmerged.

## Scope and overlap guard

No Stage 6 calendar changes, new political systems, demographics, art/catalog,
pose/chair work, visual redesign, PR #13 convergence, or Slice E. PR #13's file
list was read from GitHub solely to check overlap. The seed adapter and existing
player prose components may require minimal semantic overlap; report exact
paths. No visual changes are authorized. Documentation overlap is limited to
the explicitly requested current status/behavior corrections.

## Results

### Executable repairs

- `people.ts` bounds the requested day before creating a date, then corrects the
  birth year using canonical age minus selected age. No `dates.ts`, RNG, person
  version, corpus, appearance, or schema changes. Stress leap-birth selection
  remains intact; copied impossible anniversaries normalize to February 28.
- Run B room context now carries canonical briefing-lead and verifier IDs,
  including when the verifier is not physically present. Prose reads World
  through those IDs. Run C/D-Lite and the player components resolve names through
  existing author/player/work-role IDs. Stable legacy-named keys are retained.
- Fixture routing uses argument presence, not seed equality; `PlayerOffice`
  preserves null-versus-empty query semantics. An absent seed stays legacy;
  explicit seeds, even the legacy constant, use person-v5/names-v1.

### Local verification

- `npm run validate`: passed, 527 tests / 32 files; format, lint, typecheck,
  build, headless replay, and art validation passed.
- Focused Run A/B/C/D-Lite + person foundation: 151 tests / 5 files passed.
- Explicit high-volume DOB command: `npx vitest run
src/simulation/person-foundation.test.ts -t 'DOB invariant matrix'`: passed.
  39,000 cases per profile, 78,000 total, each generated twice for exact replay
  (156,000 Person creations). Four additional pinned cases cover the audit's
  three invalid birth-year patterns and selected age 73.
- The matrix failed on starting main: production selected 53 but canonical age
  was 54, and stress attempted `1979-02-29`. Pinned reproduction seeds also
  exercise attempted `1958-02-29`, `1999-02-29`, `2001-02-29`, and selected age 73
  with old `1951-02-28` (canonical 74), now `1952-02-28` (canonical 73).
- An independent before/after comparison over the same 78,000 cases found
  75,777 byte-identical people, 2,214 previously invalid leap dates, and 9
  previously age-inconsistent people. Every changed valid Person differs only
  in DOB and its established birth-date/birthplace fact copies; names, IDs,
  appearance, residence, generation versions, and RNG draws remain unchanged.
- `npm run stress:persons -- --profile production --seeds 100 --per-seed 100`:
  passed, 10,000 people, ages 21–75, 10,000 unique appearance seeds.
- Same command with `--profile stress`: passed, 10,000 people, ages 18–88,
  1,700 leap birthdays, 10,000 unique appearance seeds.
- Explicit portability/persistence run (`world.test.ts`,
  `person-stress-harness.test.ts`, `sqlite-world-repository.test.ts`): 44 tests
  passed, including generic required context, Synthetic Tidal Basin, alternate
  home/birth/residence references, deterministic seed replay, both profiles,
  chronology, and JSON/SQLite continuation.
- Player-seed browser file: 6 tests passed without retries, including default,
  alpha, beta, exact alpha replay, generated legacy-named seed, and developer
  parity. Pointer/keyboard conversation, history, annotation, analysis,
  provision discussion, delegation, and calendar copy were exercised.
- Full `CI=1 npm run test:e2e`: successful exit; 35 passed plus 1 flaky pass on
  retry (36 total). The unchanged `run-c.spec.ts:10` compact-navigation-area
  assertion needed retry in three full runs. An untouched starting-main archive passed
  that test 5/5 in isolation and the full 34-test baseline. No geometry or test
  threshold change is included. Final publication CI is reported separately.
- `npm run validate:art`, `npm run inventory:art`, and `npm run qa:art`: passed.
  Inventory/QA regenerated only formatting in three tracked reports; those
  generated changes were inspected and restored. No art files are in the diff.
- `git diff --check` and `npm run agent:preflight`: passed before publication.

### Baseline protection

No golden hash was updated. All five PR #18 primary serialized baselines pass
unchanged. Default D-Lite remains
`6de3e4b5d785f84f1aa3f6fa8894aa2c8d11a418cb75d482305b8e92464621a2`.
Synthetic Tidal Basin's initial snapshot remains
`f8f9caea6af050306c5b34fad661dbd6f38dae13bc96614e8c91e1cfaf73f045`.
These baseline populations do not exercise a corrected invalid/mismatched DOB.
A before/after default-flow comparison also proved exact equality for Run B
openings/options/each initial intent, Run C document/review/discussion/revision,
and D-Lite delegation, including their canonical histories.

### Architecture Integrity Audit disposition

| Concern                                       | Disposition                                                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Actor / date / role context                   | Corrected: valid DOB matches selected age; display names resolve canonical IDs.                                                        |
| Primitive reuse / calendar                    | Confirmed: unchanged `ageOnDate`, date primitives, clock, and time/work writers.                                                       |
| Identity / history / RNG / progressive detail | Confirmed: stable keys and appearance unchanged; no Person rewriting or saved-history migration; valid generation bytes preserved.     |
| Jurisdiction / provenance                     | Confirmed: PR #18 constructor and alternate jurisdiction intact; no corpus, provenance, rights, or sourced-fact changes.               |
| Open sets / schema / headless boundary        | Confirmed: no taxonomy, persistent schema, external API, React dependency in simulation, or general framework added.                   |
| Fallback / supersession                       | Corrected: only absent override means legacy; explicit empty input keeps the prior fallback seed text but selects generated semantics. |
| Adversarial / semantic proof                  | Confirmed: selected-age oracle, 78,000-case replay matrix, canonical role tests, and normal-route browser journey.                     |
| Stage leakage / future rules                  | Confirmed: no art, visual integration, new jurisdiction framework, demographics, New Game UI, political systems, or Slice E.           |

### Direct documentation corrections

Updated ACTIVE-HANDOFF's stale PR #16 open/unmerged/defect-free claims, documented
merged generated-person behavior in `characters.md`, added the actual regression
acceptance contract, and corrected the directly encountered current world/snapshot
version statements (15/14) in Architecture and Acceptance Tests. Historical stage
records and broader documentation were not rewritten.

### PR #13 path overlap and limits

The GitHub PR #13 file list overlaps exactly these executable files:
`src/presentation/run-a-fixture.ts` (seed-presence condition),
`src/player/PlayerOffice.tsx` (null-preserving seed input and delegation name),
`src/player/WorkingDocumentWorkspace.tsx` (three dynamic person labels and their
props). Documentation overlap is `ARCHITECTURE.md`, `docs/ACCEPTANCE-TESTS.md`,
and `docs/agent/ACTIVE-HANDOFF.md`, all directly requested corrections. No PR #13
branch or visual worktree was used or modified; no layout, style, art, geometry,
asset, manifest, or PR #13 convergence code changed.

Remaining limits: existing persisted people/history are not migrated; the
starter name corpus and bounded authored scenario remain unchanged. The full
browser suite's unmodified Run C geometry assertion has exhibited retry
behavior as recorded above. `npm ci` / `npm audit` also report an existing high
`image-size` development dependency advisory with no offered fix; dependency
and art tooling changes are outside this correctness scope. No human visual
acceptance or merge is claimed.

Publication: PR #19 is open against current main. Executable repair commit:
`743b6ec2395cb18f840d1bfd9416f77b4f8f2a0e`. Direct documentation corrections
are separate. The exact final documentation-inclusive head and completed GitHub
Actions run IDs/URLs are recorded in the PR verification comment and completion
report; this document does not pre-claim a CI outcome. Do not merge.

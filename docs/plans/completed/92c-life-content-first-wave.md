# 92C life-content first wave

Status: completed — implementation complete; independent content/architecture audit pending

Authority: Drive task `R5 — RUN NOW — 92C LIFE CONTENT FIRST IMPLEMENTATION WAVE AFTER PR99`, the 92C research packet and companion scenario bank, and accepted PR #99 prose boundaries.

## Scope

- Implement exactly 16 researched kernels: eight age-true early-childhood kernels and eight adult-transition, ordinary-social, relationship, or civic kernels.
- Use existing episode, history, relationship, education, work, organization, incident, commitment, and selection mechanics.
- Keep #85 player/campaign surfaces and #79 bargaining surfaces untouched.
- Store one fact packet, accepted writer output, and fail-closed reviewer verdict for every player-facing scene.

## Implementation

- Add declarative 92C stages and provenance in a dedicated content module.
- Extend accepted same-domain families for independent school, household, and civic moments instead of inventing false answer-dependent continuations.
- Add only the missing younger-role eligibility mirror needed to avoid casting an older household peer as a small child.
- Verify exact age bounds, child agency, role/fact fail-closure, non-college adult paths, deterministic selection, grounded long-tail callbacks, existing canonical writes, and zero runtime model calls.

## Completion gates

- Focused 92C and episode tests.
- Typecheck, lint, build, full test suite, and repository validation.
- Required art validation/inventory/QA commands without committing generated churn.
- Re-fetch and reconcile live `main` immediately before the final push.
- Draft PR only; independent content/architecture audit remains outstanding.

## Implemented kernel set

Early-childhood (8):

- `early.school.cubby-space`
- `early.school.partner-pairing`
- `early.school.recess-race`
- `early.school.tattle-boundary`
- `early.home.chore-resistance`
- `early.home.parent-exhaustion`
- `early.home.sibling-toy-snatch`
- `early.peer.best-friend-pact`

Adult-transition, ordinary-social, relationship, and civic (8):

- `rel.encounter.dormant-callback-reunion`
- `adult.trans.shift-call-in`
- `adult.trans.coworker-cover-shift`
- `adult.trans.tip-pooling-dispute`
- `adult.trans.commuter-strain`
- `rel.encounter.study-group-freeloader`
- `adult.trans.family-business-obligation`
- `civic.encounter.flooding-sandbag-effort`

## Mechanics used

- Canonical age, school enrollment, paid-work, shared-household, kin,
  relationship, organization-participation, commitment, incident, event,
  memory, and relationship-interaction records.
- Existing episode stage/choice/days-since-stage prerequisites, deterministic
  instance identity and story selection, and existing commitment writes.
- One contained eligibility mirror, `role-age-below`, pairs with the accepted
  `role-age-at-least` requirement and selects the same qualifying person for
  eligibility and prose composition.

No canonical record family, runtime model, occurrence probability, global
clock change, player/campaign surface, bargaining surface, law/institution
engine, or new UI was added.

## Prose record

Twenty scene fact packets produced twenty accepted static writer outputs and
twenty separate clean `GROUNDING: PASS` reviewer verdicts. Tests bind each
stage's lines, labels, descriptions, and memories to its own output. Three
packet-only continuation drafts recovered from the interrupted session were
removed because they never received writer output or reviewer approval.

## Remaining 62-kernel coverage

| Research track              |  Total | Implemented | Remaining |
| --------------------------- | -----: | ----------: | --------: |
| Ages 5–7                    |     30 |           8 |        22 |
| Adult transition            |     20 |           5 |        15 |
| Relationship encounters     |      6 |           2 |         4 |
| Civic/historical encounters |      6 |           1 |         5 |
| **Total**                   | **62** |      **16** |    **46** |

The 46 remaining kernels are deferred by the first-wave cap, not silently
counted as implemented. Known current-mechanic blockers among them include:

- education-program choice/state and linked apprenticeship sponsorship;
- financial-aid/application, injury/health, medical-debt, vehicle, loan,
  overdraft, lease, eviction, utility-split, and temporary-housing facts;
- institution/event context for courthouse, school-board, zoning, union, and
  historical-commemoration encounters;
- campaign-canvass content, which remains outside this lane under the #85
  ownership exclusion.

Other remaining ordinary kernels may map to current mechanics, but were not
pulled past the authorized sixteen-kernel ceiling.

## Validation and LEARN record

- Focused 92C, episode-bank, adapter, narrative, and character-context suites:
  200 tests passed.
- Every file implicated by the resource-constrained full-suite run was rerun
  serially: 156 tests passed. The exact parallel suite recorded 2,300 passing
  tests and eight unrelated five-second timeouts; no assertion remained
  failing after the stage-role test correction.
- Formatting, lint, typecheck, source validation/replay, production build,
  deterministic demo, prose-review verification, and all three required art
  gates passed.
- LEARN: independently hosted stages need stage-local authority, and a
  role-qualified eligibility rule must also control binding so the character
  proved eligible is the character rendered in prose. Those constraints now
  live in the stage contract and focused regression tests rather than only in
  this plan.

This branch remains draft and unmerged. Human independent content/architecture
audit and owner play remain outstanding acceptance gates.

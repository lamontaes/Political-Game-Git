# 92C life-content first wave

Status: active

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

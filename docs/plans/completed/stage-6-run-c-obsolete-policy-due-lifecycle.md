# Stage 6 Run C Obsolete Policy Due Lifecycle Correction

## Status

Completed 2026-08-24 — contained final lifecycle correction for valid policy
realization due items that become obsolete before their due frontier; awaiting
external re-audit.

## Scope

Keep scheduling and direct realization strict. At execution only, terminally
cancel a due item whose estimate was superseded or whose alternative was
already effect-producing realized, without substituting an estimate or creating
new policy/cause/effect history. Do not change the generic scheduler or start
Run D.

## Checklist

- [x] Inspect the corrected Run C candidate and generic due lifecycle.
- [x] Add domain-handler applicability cancellation without weakening writers.
- [x] Prove superseded and already-implemented obsolete schedules, JSON, and
      deterministic replay behavior.
- [x] Update focused/persistence evidence, validate, commit, archive, and stop
      before Run D.

## Validation evidence

- Focused lifecycle/integration/persistence/architecture gate: 5 files / 43
  tests passed.
- Full Vitest suite: 19 files / 207 tests passed.
- Prettier, ESLint, TypeScript, production build, deterministic headless demo,
  and `git diff --check` passed.
- Online audit could not reach `registry.npmjs.org`; cached offline
  `npm audit --offline --audit-level=high` reported 0 vulnerabilities, and
  `npm ls --all --omit=optional` completed.

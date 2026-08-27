# Stage 6.5 Run D-Lite — Canonical Time, Calendar, and Work/Pending

Status: **COMPLETE — EXTERNAL AUDIT AND HUMAN PLAY REVIEW PENDING**

Starting executable truth: `59e255288ccf8346d281698037b28a3030316b20`

Branch: `codex/stage-6-5-run-d-lite-time-work`

## Bounded objective

Add the smallest reusable canonical minute-level time, scheduled-activity, and
work-assignment substrate needed for one scene-native week calendar and one
epistemic Work/Pending surface. Preserve Runs A–C and keep campaigns,
elections, institutions, law, and later Lexington slices out of scope.

## Implementation sequence

1. Add a canonical zoned simulation moment to `World`, advance schema and
   snapshot versions, validate date/moment consistency, and preserve whole-day
   advancement.
2. Add append-oriented scheduled-activity and work-item identities/states with
   deterministic IDs, interval conflict/travel constraints, assignment,
   rescheduling, completion, and exact-time advancement.
3. Build one deterministic Run D-Lite fixture over the accepted Run C world,
   including a real fixed conflict, travel interval, flexible block, player
   work, waiting dependency, staff work, and hidden non-player state.
4. Project only controlled-player-accessible agenda/work state into a vertical
   desktop week and a denser Work/Pending surface.
5. Prove valid/invalid rescheduling, inspectorial time neutrality, activity
   time cost, staff parallel work, serialization, midnight/date-level due
   handling, non-leakage, deterministic replay, and Runs A–C compatibility.
6. Update architecture, system, UX, acceptance, roadmap/dependency, and
   append-only decision documentation; run the full repository and browser
   gates before moving this plan to `completed/`.

## Stop conditions

- No Stage 7/8/9 or Lexington Slice E behavior.
- No recurrence, routing, traffic, invitation, notification, generalized staff
  productivity, user-created projects, pin redesign, or generic end-turn UI.
- `FutureDueItem`, history sequence, and `World.actionSequence` do not become
  clocks or appointment stores.
- The PR remains open and unmerged for independent acceptance.

## Completion evidence

- World schema 15, generator `demo-world-v15`, and snapshot format 14 preserve
  the canonical zoned minute, exact activity, and work histories.
- Twenty-two focused D-Lite tests plus focused Runs A–C and the full 429-test
  Vitest suite pass.
- The complete 26-test Playwright suite and live 1440×900 browser inspection
  prove Calendar, Work/Pending, time advance, delegation, parallel staff work,
  privacy, and accepted return paths.
- Formatting, ESLint, TypeScript, production build, deterministic demo replay,
  art validation/inventory/QA, and `git diff --check` pass.
- Production dependencies audit cleanly. The full development audit retains one
  no-fix high-severity `image-size` parser advisory in art tooling.
- D-050 and the architecture/time/history/presentation/roadmap/dependency/UX/
  acceptance documents record the actual boundary. Stage 7/8/9 and Lexington
  Slice E were not started.

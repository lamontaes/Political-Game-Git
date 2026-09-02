# Legislative Gameplay Core

## Status

Completed — implemented and validated on `claude/legislative-gameplay-core`
for independent PR review. Human product review remains required on the open
unmerged PR.

## Baseline and scope

- Started from accepted `origin/main` at
  `514a6f979247f7162aeca26b26f1392535e32443`.
- Recorded D-056: rule-driven legislative procedure and member-record voting.
- Added the runtime institutional rule contract
  (`src/simulation/legislature-rules.ts`) and three sourced rule packs
  (`legislature-rule-packs.ts`) for Kentucky, Nebraska, and Alaska.
- Added canonical records and the procedural engine (`legislation.ts`),
  integrity (`legislation-integrity.ts`), and playable scenarios
  (`legislation-scenarios.ts`).
- Added the player-facing projection and session driver
  (`src/presentation/legislation-projection.ts`, `legislation-session.ts`) and
  the workspace at `?view=legislation`, reachable from the office shell.
- Wired the new record families into world integrity, entity availability,
  future-due availability, and the public simulation surface.

## Research consumed

`~/Documents/Political-Game-Research/legislative-institutions-50-state/`:
`README.md` (schema and epistemic rules), `CROSS_STATE_TAXONOMY.md` (mechanic
families), `HIGH_VALUE_GAMEPLAY_MECHANICS.md` (which differences are
consequential), and the `mechanics.jsonl` records for KY, NE, and AK with their
official citations. `MASTER_STATUS.md` confirmed 50 states and 750 records.
`research-validation/` was reviewed for status only; no unvalidated claim was
encoded.

## Verification

- Full Vitest: 41 files and 681 tests, including 22 legislative engine tests and
  5 player-language and projection tests.
- Playwright: the legislation suite proves all three jurisdictions end to end,
  save and reload, plain language, and the shell entry point.
- `npm run validate` (format, lint, typecheck, tests, build, deterministic
  demo, art validation) passed; `git diff --check` clean.
- The accepted world-byte baselines are untouched: the new record families stay
  optional and absent until first written.

## Deliberately unimplemented

Conference committees, concurrence after second-chamber amendment, calendars
and deadlines as live constraints, line-item and amendatory vetoes,
confirmations, interest-group lobbying, party caucus behaviour, public-opinion
effects, campaign consequences, appropriations and budgeting, judicial review,
federal procedure, and the other forty-seven states.

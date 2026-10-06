# P1 opening Congress member intake evidence

Source code head: `d2f97bc10abf4337a5c5d43691d9a54e8d6ed6a7` (PR #2459, draft). The setup uses the same Columbus, Ohio opening and seed `timing-columbus-0925`; only sync/async generation mode changes.

## Canonical principle producer and opening roster seam

`opening-life.ts` prepares Congress through `ensureOfficeholderPrinciples`, which delegates to `formPrinciplesFromLife`. Saved records use the canonical `life-principles/v1:` stable-key namespace (`src/simulation/principles-from-life.ts`); `officeholder-principles/v1:` is the legacy draw prefix. The life writer intentionally creates principles from a person's recorded life and does not invent a view from party membership alone.

The opening Congress roster in `living-world/opening.ts` already had seated people, terms, party affiliations and residence, but current member records did not persist elected public service in the work ledger. The versioned opening now writes each member's existing public service through `createWorkRelationships`, using the seated member's term and the chamber organization. The opening life flow calls this only when the current member-name version is present; legacy replay calls remain on their prior route. The federal legislature organization classification is now recognized by the life writer as a public employer. No principle rows are inserted directly and no minimum per-member quantity is imposed.

On the same fixture, current head `d2f97bc10abf4337a5c5d43691d9a54e8d6ed6a7` produces:

- Sync: 535 seated Congress members; 540 saved life-principle rows among those members; 369 members have at least one; 0 rows use `officeholder-principles/v1:`; 6,245 ms.
- Async: 535 seated Congress members; 540 saved life-principle rows among those members; 369 members have at least one; 0 rows use `officeholder-principles/v1:`; 7,133 ms.
- Both paths report Congress principle preparation complete at 535/535. Full-ledger row count is 540 in both modes.

Exact base `f88508186b78f526ecf89a420b5fb584171e039a`, run with the same setup in both modes, produced 342 total principle rows and 0 rows with the legacy draw prefix. The pre-repair candidate at `3186f2d0c2add2182290b1b73686a7b65d453520` likewise produced 342 total rows and 0 legacy-prefix rows in sync and async. These source comparisons establish that the `>3,500` assertion's zero is not introduced by P1 calendar seeding. The original assertion at `src/presentation/opening-life.test.ts:135` is unchanged; no row count threshold was removed or relaxed.

The full `opening-life.test.ts` run on `d2f97bc10abf4337a5c5d43691d9a54e8d6ed6a7` reports 6 passing and 2 failing tests. `prepares Congress principles in Begin...` fails at the existing assertion: expected `> 3,500` `officeholder-principles/v1:` rows, observed `0`. A separate age-12 case times out at its existing 10-second limit. The exact source-comparison diagnostics and current test log are preserved under `/tmp/session53-base-{sync,async}-principles.json`, `/tmp/session53-candidate-{async,work-roster}-principles.json`, `/tmp/session53-opening-test.log`, and `/tmp/session53-opening-life-current.log` in this workspace. PR #2459 remains draft pending the contract question.

## One actual dated Congress filing

A bounded diagnostic generated the same opening and consumed only its scheduled Feb. 1, 2026 Congress intake through `congressIntakeHandler` / `fileMemberAgendaBills` (one due row; no daily clock loop). At source head `d2f97bc10abf4337a5c5d43691d9a54e8d6ed6a7`, the result is:

| Chamber | Filed | Committee admitted | Floor passages | Failed | Enacted |
| --- | ---: | ---: | ---: | ---: | ---: |
| House | 1 | 0 | 0 | 0 | 0 |
| Senate | 0 | 0 | 0 | 0 | 0 |

The House filing is H.R. 6, 119th Congress (`legislative-measure_6c12bfebec80fd39`), sponsored by Emma Mendoza (`person_8c2991a1399213e2`), introduced Feb. 1, 2026. It is nonterminal at this single intake, so it has no passage or policy consequence yet. This is a filing-path diagnostic, not an all-due chronological acceptance run or proof of congressional enactment.

Machine-readable compact counts and bill row are in `p1-opening-principles.json`. Full current diagnostics are preserved at `/tmp/session53-opening-work-final.json`, `/tmp/session53-opening-work-final-async.json`, and `/tmp/session53-congress-first-intake-final.json`.

## Session-end instrumentation boundary

The separate bounded all-due April 30 artifact remains `/tmp/session53-all-due-apr30-sessionends.json`, source head `3186f2d0c2add2182290b1b73686a7b65d453520`. Its instrumentation recorded `sessionAdjournments: []`: no actual end record was reached/captured by that cutoff. Its 2,353 due rows, 77 batches, 90 measures, 85 state filings, and 14 state enactments are progress only. It does not establish own-session-end coverage. No annual/daily-world restart or heap increase was made.

## Checks

- `npm run typecheck`: pass.
- `npx vitest run --config /tmp/session53-vitest.config.mjs`: 69 tests pass across calendar and member-agenda suites.
- `npx vitest run --config /tmp/session53-vitest-opening-member.config.mjs -t 'records public legislative work'`: 1 targeted test passes.
- Full opening suite: 6 pass, 2 fail as described above. Existing assertion retained.
- `git diff --check`: pass.

## Why the calendar artifact recorded no session adjournments

Source inspection after the bounded run located the recording path. `considerSessionAdjournment` in `src/simulation/governing/leaders-adjourn.ts` is called only from legislative measure steps in `src/simulation/governing/legislative-clock.ts`. It requires a same-year appropriation measure that has passed both chambers or become law, a seated leader set, and no unresolved bill carried by those leaders. The source comment explicitly states the game does not file general appropriations acts; state budgets currently land through the public-budgets store instead. `sessionLegalLimit` / `sessionClosesOn` provide a legal or sourced date for bill handling, but do not write a `SessionAdjournmentRecord`. Thus `sessionAdjournments: []` is an actual empty record ledger through Apr. 30, not proof the jurisdictions' regular sessions had not ended. Missing contract to resolve for acceptance: whether the acceptance report should use the source-backed legal/recorded end-date table independently of leader-decision records, or a named owner supplies the canonical dated session-end event/record writer for jurisdictions whose sessions end by their own limit. No synthetic session-end rows were added.

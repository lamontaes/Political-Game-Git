# Engines can own tables, dates, and voter groups

Before: Engines cannot register indexed tables or keyed institutional work. Voter groups have no shared row contract.

After: Three additions give ports these boundaries while preserving the player clock. Accounts remain owned by SOL-1258.

## Baseline evidence

Inferred: At Sol's baseline, the facade had fixed state writers and a one-event callback writer, without registered table or voter-group methods. Module registration installs handlers and providers. See [the baseline facade](https://github.com/lamontaes/Political-Game-Git/blob/f6701d45bdade9604cffb7f1469b687c1097520d/src/core2/types.ts#L885) and [baseline module registration](https://github.com/lamontaes/Political-Game-Git/blob/f6701d45bdade9604cffb7f1469b687c1097520d/src/core2/state.ts#L436).

## Contract and plan

1. Register module tables with a positive schema version, immutable rows, named indexes, write-time validation, and explicit snapshot/restore checks. Test isolation, index replacement, rejected writes, and schema mismatch.
2. Register keyed institutional dates, dispatch only the current date's bucket, and route module stop points through the existing player stop API. Test duplicate keys, cancellation, dated conditions from module state, and earliest-stop/resume behavior.
3. Store deterministic voter-group rows with place, age band, lean, turnout, and size. Index by place and age band. Compare aggregates with sourced spreads without drawing or rewriting outcomes. Test validation, weighting, and unchanged rows after checks.
4. Keep additions behind the versioned facade. Commit changes to shared core files separately for Sol's review. Preserve core2-part1b-v1.
5. Run focused contracts and existing player regressions, scoped types/lint/format, release and no-dice checks. Compare a generated game year against Sol's exact head in exclusive host windows; reject a slowdown over 20%.
6. Fetch Sol regularly, rebase before publishing new branch work, and keep one draft PR stacked on pool/P8-part-1. Hand off to the finisher after all three contracts pass. M0-09 stays pending until accounts and M1-port proof also pass.

## Ownership and endpoint

Owned: new module state, module calendar, voter-group contracts and tests; facade/registration/calendar dispatch seams only.

Excluded: money and finance files, people files, src/director, src/rules, and screens. LAND/finisher retains review and merge authority.

Base at start: f6701d45bdade9604cffb7f1469b687c1097520d. Model: GPT-6 Codex (session-provided); effort: high, as specified for M0 Part 3. Started October 10, 2026, 9:38 p.m. Eastern. Elapsed time will be recorded at handoff. No implementation helpers planned.

## Builder handoff

Measured: All 20 new piece contracts and 43 existing player/module regressions passed. The final focused run covered six files and 63 tests. [Execution receipt](../../../src/core2/receipts/m0-core-pieces-checks-20261010.json). Scoped types, lint, release declaration, and no-dice checks passed. [Piece contracts](../../../src/core2/module-state.test.ts), [calendar contracts](../../../src/core2/module-calendar.test.ts), and [voter contracts](../../../src/core2/voter-groups.test.ts).

Measured: Three paired generated years passed the 20% budget against the unchanged Sol head. Median total time rose from 78.50 seconds to 80.32 seconds, or 2.32%. Each pair stayed below 120%; the highest ratio was 113.54%. [Paired receipt](../../../src/core2/receipts/m0-core-pieces-20261010.json).

Inferred: Shared facade and clock changes are isolated in commit e54e824652 for Sol's review. The API handoff explains schema restoration, calendar failure and retention, player stops, and sourced spread checks. M0-09 remains pending for accounts and actual M1-port proof. [Interface handoff](../../../src/core2/core-pieces-v1.md).

Measured: Two finance-test version pins still expect v9 and must be updated by Sol when integrating v10. Those files remain outside this lane. Four payroll-fixture failures also reproduce on the exact clean Sol core. [Compatibility receipt](../../../src/core2/receipts/m0-core-pieces-checks-20261010.json).

Model and effort at handoff: GPT-6 Codex (session-provided), high. Recorded through October 10, 2026, 10:04 PM Eastern; 25 minutes elapsed. Only the required read-only civic-report reviewer helper was used.

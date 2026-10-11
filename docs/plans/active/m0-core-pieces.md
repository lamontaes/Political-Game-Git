# Engines can own tables, dates, and voter groups

Before: Engines cannot register indexed tables or keyed institutional work. Voter groups have no shared row contract.

After: Three additions will give ports these boundaries while preserving the player clock. Accounts remain owned by SOL-1258.

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

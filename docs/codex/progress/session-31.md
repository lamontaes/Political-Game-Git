# Session 31 progress

## LW-17

- Cash-bail and mandatory-minimum person landings are on draft PR #2504, based on current main.
- Focused local tests passed (55/55 across seven suites); typecheck and test-import checks passed; Prettier and ESLint passed for the LW-17 files.
- Owner question on #2424 asks for canonical named-person source records for civilian oversight and concealed-carry permits.
- Not done: current-main CI and a random-place new-game proof. Keep PR #2504 in draft until both are complete and the missing source contracts are resolved or expressly excluded.

## Preserved b04 work

The shared local `work` branch still contains uncommitted b04-p1 through b04-p5 work. Do not reset, stash, or clean it. It must be split into one PR per numbered part.

## Next steps

1. Re-read the latest POOL and Fable allocation on issue #2424.
2. Fetch/rebase the preserved work on current main without dropping existing edits.
3. For LW-17, run current-main checks and build a random-place new-game trace; inspect #2424 for source-contract answers.
4. Resume the remaining assigned items in queue priority order.

Exact next local command: `git status --short && git diff --check`.

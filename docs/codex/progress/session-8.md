# Session 8 resume marker

## P6 / BG-12 — stale place/status and empty scene after Run a day

- Claim: #2424 comment #6015697577.
- Checkout: `/workspace/Political-Game-Git`, branch `codex/session8-bg12`.
- Starting/current source head: `e591ffc637d1f6db84d2ff920e8662ce123202ed`.
- LW-04 trace remains preserved separately on `codex/session8-lw04`; Session 9 owns its shared tax binder. No LW-04 source changes were made.
- Source trace: `PlayerGame.tsx` resolves current scenes from same-instant completed attendance/current-day arrival; `openingWorkLocation` ignores arrivals from prior days. This is not sufficient to conclude the player-visible defect is fixed or reproduced.
- No code edits yet. Do not claim BG-12 fixed until a new random-place game reproduces or disproves the stale-place/empty-scene behavior and the required regression proof is captured.
- Browser gate: guarded Playwright startup refused `e2e-capture` because it requires 2.0 GiB and only 1.3 GiB is available after the 25 GiB reserve. `/workspace/.ocd-dev/reservations.json` was empty. Do not bypass source identity or storage guards.
- Next: rerun the guarded random-place browser route once the storage preflight can reserve the required space; capture the behavior, then make the smallest source/test change supported by that observation. Keep any player proof distinct from source tests.

## Parallel item

- T9-self-confidence helper owns the isolated trait worktree `/workspace/Political-Game-Git-t9-self-confidence` on `codex/t9-self-confidence`; do not edit its trait or loader paths.

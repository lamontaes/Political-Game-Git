---
id: world-transfer-needs-two-accounts-boiling-spring-lakes
title: "A played year stops with 'A transfer needs two different accounts' in Boiling Spring Lakes, North Carolina (seed 1dea1556…)"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/transfer-two-accounts
pr: #5795
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T10:04:25.272Z
---

**What.** Found Oct 21 by candidacy-calibration.test.ts: buildBenchWorld in Boiling Spring Lakes, North Carolina (3706760), seed 1dea15565d7e31d0fc767e3f58ca9b3ad3fb1f79ee62890d8909e5acd71841d2, a 400-day run from the game start, throws 'A transfer needs two different accounts.' Find which caller transfers from an account to itself (a payer that is also the payee) and make it skip the self-payment or name the right payee.

**Rules.** Every dollar balances; no dice; wire to the world: the caller is fixed at its cause, not by catching the error.

**Done when.** The same place and seed run 400 days from the game start in buildBenchWorld without the error, and a test names the place, the seed and the account ids of the payer that was also the payee.

**Files.** src/core2/accounts.ts

**Notes.** Oct 21 (claude, claude/transfer-two-accounts): not reproduced. buildBenchWorld("1dea15565d7e31d0fc767e3f58ca9b3ad3fb1f79ee62890d8909e5acd71841d2", gameStartDate(), { twoLevel: true, placeKey: "3706760" }) with bookkeeping off ran 400 days to 2026-02-24 without the error on main at 6af1b97ede, on main at d7dbde1df9 (when this was filed) and on origin/claude/pool-elections-local-races-too-uncontested at 623c440efd. candidacy-calibration.test.ts builds several drawn worlds in one process before this one, so module state left by an earlier world may be the cause; the run's GOLDEN_PATH_SEED (the draw base, not the place seed) is needed to reproduce it and is not recorded here or on PR #5592.

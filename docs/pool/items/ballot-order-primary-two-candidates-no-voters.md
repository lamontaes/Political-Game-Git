---
id: ballot-order-primary-two-candidates-no-voters
title: "ballot-order test: a primary between two candidates counts no voters (Winnett, Montana, seed 9cc9a291e9264b809336a856fddf141339c9acffe4ba35b0c900e4db647a09cb)"
area: gov
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/ballot-order-no-voters
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:57:10.145Z
---

**What.** src/core2/ballot-order.test.ts, 'a primary between two candidates nothing else separates counts the party's voters across the race', fails for contest seat:US-MT:us-senate:1:2026-11-03 in Winnett, Montana: the race counted 0 voters. It fails the same on clean main with that seed (GOLDEN_PATH_SEED).

**Rules.** Find why the senate contest has no counted voters for the primary and fix it at the cause, not the test. No dice; the seed and place stay named in the failure message.

**Done when.** The test passes for Winnett, Montana with seed 9cc9a291e9264b809336a856fddf141339c9acffe4ba35b0c900e4db647a09cb and for a random place; the fix names the record that held the voters.

**Files.** src/core2/ballot-order.test.ts, src/core2/modules/voting.ts

**Notes.** TODO

Checked Oct 20: the same seed (GOLDEN_PATH_SEED=9cc9a291e9264b809336a856fddf141339c9acffe4ba35b0c900e4db647a09cb) fails at different assertions on different runs: one run at `votes[f.personId] > 0` for the rotation rule ("expected 0 to be greater than 0", contest seat:US-MT:us-senate:1), another at `total > namedVotes` ("expected 61 to be greater than 61"). A debug print on the failing run showed both candidates with votes (60 and 1). So the same seed gives different counted primaries across runs: the engine (or the test's setup) is not deterministic for a seed. Start by running the test three times with that seed and diffing the votes and the candidates' recorded reasons; look for Map or Set order, an unseeded draw or a wall-clock read in `holdPrimary`/`countedField` (src/core2/modules/voting.ts).

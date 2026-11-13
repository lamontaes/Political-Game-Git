---
id: tests-record-rival-ad-cited-by-draw
title: "The broken-promise case finds no ballot that cites the rival's attack ad in a drawn place (5462764)"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: Red desk, Nov 13 (the filing sweep of tests-filing-fixed-date-thirteen-files, PR #8976)
---

**What.** src/core2/record.test.ts, "an incumbent's broken promise changes specific voters' choices, with reasons, and feeds the rival's attack ad", fails on clean main 0fe39561 at GOLDEN_PATH_SEED=2c89147eae23b180 in place 5462764: "no ballot cites the rival's attack ad (21 reached)". The ad was bought and reached 21 voters, and none of their ballots names it among its reasons. The other two cases of the file pass at that seed, and the case passes at f26db0f13c6bffec4a68430111c0bdb5. Seen: a voter who saw the attack ad and changed their vote says the ad was part of why.

**Cause.** Measured: `GOLDEN_PATH_SEED=2c89147eae23b180 npx vitest run src/core2/record.test.ts` on clean main 0fe39561 and on PR #8976's branch, the same failure at the check after line 296 of the test. Not found: whether the 21 reached voters are ones whose ballots weigh the incumbent's record at all, or whether the ad's reason is recorded under a kind the check does not read. The items `tests-record-attack-ad-checks-nothing` and `release-red-record-broken-promise-voters` (both done) fixed earlier causes of the same case.

**Fix.** Needs cause. Read the 21 reached voters' `recordReasons` in that world first.

**Time box.** 2 hours

**Rules.** Ask why: every ballot's reasons name the record that moved it. One rule, all 56 places: the case draws its place and names it.

**Done when.** A second session runs record.test.ts on main at GOLDEN_PATH_SEED=2c89147eae23b180 and at a fresh seed, each naming its drawn place, and all three cases pass, with at least one ballot the ad reached naming it among its reasons by record id.

**Waits on.** Nothing.

**Files.** src/core2/record.test.ts, src/core2/modules/record.ts

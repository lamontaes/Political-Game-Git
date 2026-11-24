---
id: tests-m0-13-tiny-town-without-renters
title: "M0-13 fails in a three-home town where every home is owned: the check wants a renter the place's records need not have (Portage Creek, Alaska)"
area: world
lead: m0-m2
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/m013-renters
pr: #6343
blocked-on:
source: laws-and-effects lead, Oct 27 (golden-path-year on PR #6257)
claimed-at: 2026-10-27T15:53:32.008Z
---

**What.** The `golden-path-year` check failed on PR #6257 (job 122147212463) at M0-13, "homes have values and rents", in Portage Creek, Alaska (0262285), seed 1c57f150e0b820f7e96c7299801afa5f4ec0c9bc016e1625974539f89f723ff0. It reproduces on clean main (9555303c10) with `GOLDEN_PATH_SEED=1c57f150e0b820f7e96c7299801afa5f4ec0c9bc016e1625974539f89f723ff0 GOLDEN_PATH_PLACE_KEY=0262285 node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts`: "0 of 3 homes have no value or rent, and 0 are rented". Every home is priced; the check (`tests/golden-path/played-world.node-test.ts:835`) also requires at least one rented home, and all three of the town's homes are owned. The runner draws the place from the commit hash, so the check fails only on commits whose draw lands on a town this small, and PRs that touch no housing code go red.

**Rules.** One rule, all 56 places: a check holds a place to what its own records say, so a town whose records allow no renter is not failed for having none. Never skip, disable or quarantine the check; estimate, never UNKNOWN.

**Done when.** The check requires a rented home only where the place's housing records expect at least one renter household (or a counted renter group), it passes in Portage Creek, Alaska on the seed above and in three drawn places on fresh seeds named in the PR body, and it still fails in a place whose records expect renters when no home is rented.

**Time box.** 1 hour, any fixer or the m0-m2 lead.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/housing.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27. Not the same cause as `world-housing-sold-and-removed-dwelling-rows-unpriced` (done): here every home is priced.

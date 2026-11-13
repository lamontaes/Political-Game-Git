---
id: tests-budgets-public-pay-alega-has-a-public-employer
title: "budgets-public-pay.test.ts: Alega, American Samoa now opens with one public employer where the test records zero"
area: core
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: R1 (Fable A's builder)
pr: #8883
after:
blocked-on:
lead: speed
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
merged-at: 2026-11-12T13:32:04.194Z
---

**What.** src/core2/budgets-public-pay.test.ts fails on Alega, American Samoa (territory:AS:alega), seed f3d402dc6d11da2e, world ad3959435a1c42548b1075f66f283170c11ebe50252346569878542c186cd4d6: 'opening public employers (zero is the recorded case): expected 1 to be +0'. It fails the same on main's own vite.config.ts with NODE_OPTIONS=--max-old-space-size=5120, so it is not a heap failure. Found while running the ten budgets runs of tests-world-tests-outgrow-worker-heap (budgets.test.ts itself passed ten of ten, at two workers, seed 109a7b3b1d5c1715d738e7b8ca9deec614910239). Guards: the public employer and pay the player's budget screen shows for a drawn place, which the test keeps matching the opening world's records.

**Cause.** Found in code: the opening now seats a state office in Alega. src/core2/town-workplaces.ts lists a `state-office` workplace (line 477, classification `sector:state-government-office`, roles a state caseworker, an office clerk and a highway maintenance worker), and Alega's opening holds one: organization_cfb8ee9fbc7ff656, 'American Samoa State Offices in Alega', with public pay authority opening-public-pay:b2b0b3e0db893b3b and one work commitment, sourced to the BLS OEWS state ownership estimates (measured on main b957363c with the test's own `play` route: `drawPlace("f3d402dc6d11da2e", "budgets-public-pay")`, world ad3959435a…). The opening is right; the test's pinned negative case (src/core2/budgets-public-pay.test.ts line 177, `EMPTY_SEED`) recorded a place that had no public employer before state offices were seated, and that record is stale.

**Fix.** Replace the pinned empty case in src/core2/budgets-public-pay.test.ts (lines 175 to 183 and `EMPTY_SEED`, line 17) with a check that holds in any drawn world, since a place with no public employer may no longer exist: in the world the positive test already draws, every organization holding a `publicPayAuthority` is a public employer of the opening (not the outside market) and is linked to a treasury by `publicPayTreasuries`, and `publicPayTreasuries` links no authority that no organization holds. Say in the test's comment that the empty case was dropped because the opening now seats state offices everywhere it has state jobs (src/core2/town-workplaces.ts), and name Alega's employer as the example.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the test draws its place from all 56 and names the place and seed, no roll picks whether the opening holds a public employer, and nothing is skipped or quarantined. Replace, never layer: the stale pinned case is removed in the same change that adds the check that replaces it.

**Done when.** A second session runs src/core2/budgets-public-pay.test.ts alone with no NODE_OPTIONS on two fresh seeds (places and seeds named) and sees both tests pass, and reads in the test that no place is pinned for an empty case.

**Waits on.** Nothing

**Files.** src/core2/budgets-public-pay.test.ts, src/core2/town-workplaces.ts, src/core2/public-work-pay.ts

**Notes.** Cause found (Nov 11, 2026, cause finder for Fable B): built Alega's world through the test's own route on main b957363c and listed the organizations holding a public pay authority: the one is the state office above. The test is stale, not the opening.

**Notes (Nov 12, R1).** Built the Fix on branch claude/pool-tests-budgets-public-pay-alega-has-a-public-employer. A bisect of Alega's world (seed f3d402dc6d11da2e) from the commit that pinned the empty case (7210819d2b) to main 8a68ab2bd4 found it opens with zero public employers at some later commits and one at others (4dde32a74c, b2be97ea25 and f882a12a81 held zero; f5e2d54710, Oct 28, "sector mix ... drawn from its seed", is the first that held one). Whether a small place opens with a state office is drawn from its world's seed, so no pinned seed could have kept the empty case; the check in every drawn world replaces it.

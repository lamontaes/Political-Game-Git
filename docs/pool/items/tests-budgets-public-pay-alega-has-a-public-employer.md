---
id: tests-budgets-public-pay-alega-has-a-public-employer
title: "budgets-public-pay.test.ts: Alega, American Samoa now opens with one public employer where the test records zero"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** src/core2/budgets-public-pay.test.ts fails on Alega, American Samoa (territory:AS:alega), seed f3d402dc6d11da2e, world ad3959435a1c42548b1075f66f283170c11ebe50252346569878542c186cd4d6: 'opening public employers (zero is the recorded case): expected 1 to be +0'. It fails the same on main's own vite.config.ts with NODE_OPTIONS=--max-old-space-size=5120, so it is not a heap failure. Found while running the ten budgets runs of tests-world-tests-outgrow-worker-heap (budgets.test.ts itself passed ten of ten, at two workers, seed 109a7b3b1d5c1715d738e7b8ca9deec614910239). Guards: the public employer and pay the player's budget screen shows for a drawn place, which the test keeps matching the opening world's records.

**Cause.** Needs cause. The failing check is the test's own opening-public-employers count; why Alega's opening world now holds one has not been traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours

**Rules.** No dice: the test keeps its pinned place and seed, is never skipped or quarantined, and no roll picks whether the opening holds a public employer.

**Done when.** A second session runs the test src/core2/budgets-public-pay.test.ts alone with no NODE_OPTIONS in Alega, American Samoa, seed f3d402dc6d11da2e, and sees it pass, then names the place and seed it drew in one more run that also passes.

**Waits on.** Nothing

**Files.** src/core2/budgets-public-pay.test.ts

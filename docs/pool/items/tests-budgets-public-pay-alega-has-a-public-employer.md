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

**What.** src/core2/budgets-public-pay.test.ts fails on Alega, American Samoa (territory:AS:alega), seed f3d402dc6d11da2e, world ad3959435a1c42548b1075f66f283170c11ebe50252346569878542c186cd4d6: 'opening public employers (zero is the recorded case): expected 1 to be +0'. It fails the same on main's own vite.config.ts with NODE_OPTIONS=--max-old-space-size=5120, so it is not a heap failure. Found while running the ten budgets runs of tests-world-tests-outgrow-worker-heap (budgets.test.ts itself passed ten of ten, at two workers, seed 109a7b3b1d5c1715d738e7b8ca9deec614910239).

**Cause.** Needs cause. The failing check is the test's own opening-public-employers count; why Alega's opening world now holds one has not been traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours

**Rules.** Never skip or quarantine the test; keep the pinned place and seed; no dice.

**Done when.** A second session runs the test alone with no NODE_OPTIONS and it passes, with the place and seed named.

**Waits on.** Nothing

**Files.** src/core2/budgets-public-pay.test.ts

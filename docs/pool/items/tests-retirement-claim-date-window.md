---
id: tests-retirement-claim-date-window
title: "The retirement-claim test cannot place a generated claimant within its date window"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/retirement-claim-window
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T03:05:09.095Z
---

**What.** The existing monthly-award case in src/core2/retirement-claims.test.ts fails at line 97 on clean main 768fa518cf973a8ed60c1391d23fee283f52858c. With GOLDEN_PATH_SEED=2ef350736d8ff61f6bcb649626df419a, the drawn Sun Valley, Arizona world finds its nearest constructed claim date 79 days from the target and asserts less than 31. This is the same baseline failure reported while reviewing PR #5224; determine whether the fixture search or claim-date calculation is wrong before changing either.

**Rules.** No dice: a claim date follows the recorded birth date, law, resources and reasons, never a convenient seed. Wire to the world: identify the generated person and trace the birth, claim-age and award records. Replace, never layer: repair the root cause in the existing date setup or calculation, never skip the assertion or loosen its limit merely to pass.

**Done when.** The exact seeded monthly-award test passes with the claimant id, calculated claim date and reason for the prior 79-day gap in the PR body. The retirement-claims test file also passes in a fresh drawn place, without early returns, and the counted retirement award regression remains green. The changed-file gate passes or names separately reproduced main-only failures.

**Files.** src/core2/retirement-claims.test.ts, src/core2/retirement-claim.ts, src/core2/modules/retirement-claims.ts

**Notes.** Merger 0 reproduced the exact 79-versus-31 assertion on clean main while reviewing PR #5224, 2026-10-23 EDT. Solo case took 46.23 seconds; root seed 2ef350736d8ff61f6bcb649626df419a. The concurrent baseline attempt exited before an assertion and is not evidence.

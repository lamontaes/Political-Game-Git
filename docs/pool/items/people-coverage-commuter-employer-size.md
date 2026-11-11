---
id: people-coverage-commuter-employer-size
title: "Employer health coverage ranks a commuter's outside employer by its commuters in town, so a spouse's new commuter job takes the household's policy"
area: people
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** holdersToday in src/core2/modules/coverage.ts ranks every working adult by the staff of their employer, then pay. A commuter's employer is the town's outside-market organization, whose staff count is the town's commuters, not the size of the firm they work for. So a spouse's new commuter job at a small count can take the household's policy from a worker at a larger employer. The ranking should use an estimate of the outside employer's size.

**Cause.** Measured: Gallina, New Mexico (place 3528180, seed aa11bb22cc33dd44, src/core2/health-coverage-counted.test.ts): a household's policyholder worked for the public schools (staff 5); on July 1, 2025 the spouse started job:commuter:person_f93e020db38b6634:2025-07-01 at outside-market (staff 10, a third of the pay), and the review moved the policy to the spouse. Code: holdersToday (src/core2/modules/coverage.ts line 164) ranks by staffOf (line 129).

**Fix.** Rank a commuter by an estimated size for the outside employer (a sourced firm-size distribution for the commute's destination, per place, with its spread) instead of the town's commuter count.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: counted and full workers are ranked by the same rule. No dice: who holds a plan comes from the employer and pay, not a draw. Sliding scales and causes: an employer's size is what the records say, not a fixed number. Estimate, never UNKNOWN: an outside employer's size starts from a sourced average with a spread.

**Done when.** A second session replays Gallina, New Mexico (seed aa11bb22cc33dd44) and three fresh drawn places named in the PR body, and sees in Gallina by record whose policy it is on July 1, 2025: the household keeps the policy with the larger real employer. src/core2/health-coverage-counted.test.ts and src/core2/health-coverage.test.ts pass in all four places.

**Waits on.** Nothing.

**Files.** src/core2/modules/coverage.ts, src/core2/health-coverage-counted.test.ts

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have ranked a commuter's outside employer by its real size for the household's policy; the item says nothing on screen reads it.

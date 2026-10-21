---
id: world-public-hire-joins-pay-authority
title: "A hire at a public employer joins its public pay authority (the year stopped at the first payday)"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #4891
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** One drawn town's year stopped on January 14, 2027 with "Public pay does not match its actual owned work obligation". A staffing law made a school district or another public employer hire someone, and the hire was not on the employer's public pay authority, so the first payday found pay that matched no authority. Pull request 4891 joins the hire to the authority when the job starts.

**Rules.** Wire to the world: a public hire is paid through its employer's pay authority from the first payday. Every dollar balances. No dice.

**Done when.** In the played world (`buildBenchWorld`, a drawn place with a staffing law) a hire at a public employer is paid after 45 days, shown by job and authority ids; `src/core2/public-hire-authority.test.ts` fails without the fix.

**Files.** src/core2/job-lifecycle.ts, src/core2/public-hire-authority.test.ts

**Notes.** Body repaired Oct 17 (claude) from the pull request's description; the fix is in that pull request.

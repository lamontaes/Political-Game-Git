---
id: world-public-hire-joins-pay-authority
title: "A hire at a public employer joins its public pay authority (the year stopped at the first payday)"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #4891
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4891 (branch claude/public-hire-pay-authority-s5): Morning check: the fix spans the Core job-start contract (src/core2/job-lifecycle.ts) and Government staffing-law engine (src/core2/law-reach/group-a-staffing.ts), with no owning-area agreement recorded on the PR. Record agreement from both owning areas, or split the Core contract change and its Government caller into their owning-area PRs. Preserve the public-pay authority invariant and the new regression test.; finish on that branch, merge main into it first.

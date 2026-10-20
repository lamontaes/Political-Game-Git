---
id: gov-community-project-inclusion-rule
title: "Replace the community project inclusion rule with the officials' reads"
area: gov
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: "post-merge audit Oct 19 evening, item 7 (PR #5170)"
---

**What.** PR #5170 includes a community project in a bill only when the project's sponsor is on the same side or sits on the committee. That is a fixed rule with no stopgap row. Replace it with the officials' reads, so a project is included because the officials who can act on it want it, and the rule stops deciding the outcome.

**Rules.** No dice: bodies act from members' reasons and the calendar, not a roll. Wire to the world: the inclusion must move the bill and the grant in a generated world.

**Done when.** A drawn-place world from buildBenchWorld, seed named in the PR body, shows a community project included or left out by the officials' reads, with the bill line and grant recorded. The legislature test in `src/core2/legislature.test.ts` covers both outcomes.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature.test.ts

**Notes.** Found in the post-merge audit of Oct 19 evening. Leave PR #5170 as merged.

Built: `appropriationsWithProjects` reads each request through `positionOn` (the sponsor and the budget-line committee seats, requester as sponsor) or a back-their-item deal that flips the requester's own vote; reasons `officials-favor|officials-oppose` and `requester-vote-won|requester-vote-unchanged`. Tests: src/core2/legislature.test.ts (both outcomes, place and seed in messages). The old majority/committee rule is deleted.

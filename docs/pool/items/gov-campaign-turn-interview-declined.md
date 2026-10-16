---
id: gov-campaign-turn-interview-declined
title: "campaign-turn.test.ts fails on main: a reporter's interview is declined where the test expects an invitation (Admire, Kansas)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** campaign-turn.test.ts fails on main: a reporter's interview is declined where the test expects an invitation (Admire, Kansas). The test turns the campaign over to a day where a reporter should invite the candidate, but the press engine now declines the request. Decide from the records whether the decline is right, which means the test is stale, or wrong, which means the press engine is refusing a request it should accept.

**Rules.** Ask why: the interview's decision cites the reporter's and the candidate's recorded reasons, and the PR body names which side was wrong and why. No dice: the outcome comes from their traits, ties and the outlet's lean, never a roll or a fixed percentage.

**Done when.** The test in src/core2/campaign-turn.test.ts passes on clean main in a drawn place and a seed the builder did not choose, and a played world (buildBenchWorld) shows the interview decision for a named reporter and candidate by interview record id with its reasons.

**Files.** src/core2/campaign-turn.test.ts, src/core2/modules/press.ts, src/core2/modules/campaigns.ts

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).

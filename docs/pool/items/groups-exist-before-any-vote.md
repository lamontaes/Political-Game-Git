---
id: groups-exist-before-any-vote
title: "A town's organized groups exist before any bill is voted on, so they can back candidates"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (CTO ruling Oct 29 22:19: register the gap)
lead: governing
---

**What.** Interest groups in interest-groups.ts form only inside a legislature's beforeVote hook for a pending bill, so in a town where no bill has come to a vote there are no resident groups to endorse a council candidate or send volunteers. Real towns have standing groups (neighborhood associations, unions, advocacy chapters) before any race. The campaign's group endorsements (PR 6872) read interest groups, drives cause groups and party chapters through one view, and only the last two exist at the start.

**Rules.** Simulate it, don't ask: the town's standing groups are seeded at the opening from its people's own drives and ties, calibrated against the number of civic groups per resident, never invented to make a race winnable. One engine per mechanic: groups stay in interest-groups.ts; the campaign keeps reading them through its one view.

**Done when.** In a buildBenchWorld drawn place with its seed printed, interest-group rows exist on the opening day before any bill vote, each with members and a speaker by person id, and the campaign's endorsement step can read at least one of them.

**Files.** src/core2/modules/interest-groups.ts

**Notes.** TODO

---
id: groups-exist-before-any-vote
title: "A town's organized groups exist before any bill is voted on, so they can back candidates"
area: elections
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: governing lead, Oct 30 (CTO ruling Oct 29 22:19: register the gap)
lead: governing
checked: fable 2026-11-10
---

**What.** Interest groups form only inside a legislature's before-the-vote step for a pending bill, so in a town where no bill has come to a vote there are no resident groups to endorse a council candidate or send volunteers. Real towns have standing groups (neighborhood associations, unions, advocacy chapters) before any race. The campaign's group endorsements read interest groups, drives cause groups and party chapters through one view, and only the last two exist at the start. Seed the town's standing groups at the opening so the campaign can use them. Feeds: campaign-like-real-races; the Campaigns screen showing a standing group endorse you or send volunteers.

**Cause.** Found in code: src/core2/modules/interest-groups.ts registers `beforeVote: { name: "interest-organize", run: organize }` (line 156), and `organize` (line 208) is the only place groups form, so a town with no bill vote has none.

**Fix.** Seed the town's standing groups at the opening in the same module, from its people's drives and ties, calibrated to a sourced rate of civic groups per resident, with members and a speaker by person id. Keep the groups in interest-groups.ts so the campaign still reads them through its one view.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Simulate it, don't ask: the town's standing groups are seeded from its people's own drives and ties, calibrated against the number of civic groups per resident, never invented to make a race winnable. One engine per mechanic: groups stay in interest-groups.ts. Research before building: the number of groups per resident comes from a sourced rate with its citation, never a guess.

**Done when.** A second session, not the builder, draws a place with `buildBenchWorld` (seed printed) and finds interest-group rows on the opening day before any bill vote, each with members and a speaker by person id. The campaign's endorsement step reads at least one of them, named by record id. The groups-per-resident figure is reported next to its source.

**Waits on.** Nothing.

**Files.** src/core2/modules/interest-groups.ts

**Notes.** TODO

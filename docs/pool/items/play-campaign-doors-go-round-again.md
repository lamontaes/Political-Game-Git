---
id: play-campaign-doors-go-round-again
title: "Knock on doors goes round again once every door in town is knocked, and a grayed campaign action says why"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/play-stop-25-door-count
pr: #6065
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T23:50:41.528Z
---

**What.** A campaign's canvass walked only doors it had never knocked, so once every household in town had been knocked the door count stopped and Knock on doors grayed out with no reason. In Anson, Texas with the playtest's seed, a player knocking every week reached all 1,136 households by the end of June 2025, then the button stayed gray to election day. The other grayed campaign actions (Hold an event, Ask for an interview, Call donors) never said why either. This is the bounded fix for play-stop-25-door-count-stops-growing, proven on the bench.

**Rules.** Wire to the world: each knock reaches named voters through the campaign engine's own reach, and the count is every door knocked. Ask why: a grayed action shows its reason from the records. One rule, all 56 places: world candidates walk their doors by the same rule.

**Done when.** On the bench's play screen, a new life in a town drawn from all 56 (place and seed named) files for a local seat and knocks on doors every week for a year: the Campaigns door count grows every week past the town's households, and a grayed campaign action shows its reason, with screenshots in the PR; src/core2/campaign-day.test.ts's second-pass test passes in a random draw and fails on main.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Filed Oct 25 by the speed lead, bounded fix for play-stop-25 (as Merger 1 suggested for play-stop-09 on lamontaes/Political-Game-Git#6037); branch claude/play-stop-25-door-count.

Sent back 2026-10-25 from PR #6065 (branch claude/play-stop-25-door-count): primary play-stop reached-count acceptance remains unmet as detailed in Merger 1 comment 6403413717; finish on that branch, merge main into it first.

Merger 1, 2026-10-25 23:28 UTC: PR #6065 corrective reached-count fix passes own integrated static gates, six campaign tests, 97.0→100.3 s sequential speed and affected-control browser check. Linked primary remains open for declared owner full-window screenshot approval and automatic approval review rejection of the plain PR integration push (comment 6404880707); no merge or done flip, no renewed allegation of the repaired reached-count defect.

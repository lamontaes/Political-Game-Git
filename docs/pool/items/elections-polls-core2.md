---
id: elections-polls-core2
title: Polls on core2
area: elections
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: acting CTO ruling, Oct 19; replaces the old-core poll work in PRs #5091 and #5081
---

**What.** Polls on core2, replacing the old-core poll work in #5091 and #5081, which were closed because nothing new is added to `src/simulation`. Lift whatever is useful from those PRs into a core2 module.

**Rules.** No dice; a poll samples the views people actually hold, read from their records. One rule, all 56 places.

**Done when.** A drawn place in the played world runs a poll before an election whose result is read from the sampled residents' records, with a test naming the place and seed.

**Files.** `src/core2/modules/`.

**Notes.** Closed PRs #5091 and #5081 hold the old-core attempt.

Checked Oct 19 (claude), nothing built: this is already on main. `commissionPoll` in src/core2/modules/campaigns.ts calls adults in the town in a fixed order from a frame of full people and counted residents (read from their packed traits), records what each said (undecided, no opinion, or a candidate), charges the campaign per completed interview and reports a margin of error; true support is never shown. `src/core2/campaigns.test.ts` ("M2-05 and M2-06", features.json M2-06 passes:true) runs it in a random drawn place. The one piece of the closed PRs #5091 and #5081 the core lacks is the poll-interview-price research file (data/research/money/poll-interview-prices.json, ESTIMATED $36 to $80 an interview); see elections-poll-sampling. The CTO can mark this item done.

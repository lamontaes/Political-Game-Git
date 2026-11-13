---
id: elections-polls-core2
title: Polls on core2
area: elections
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr: #5815
after:
blocked-on:
milestone:
source: acting CTO ruling, Oct 19; replaces the old-core poll work in PRs #5091 and #5081
claimed-at:
lead: elections
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
checked: fable 2026-11-10
branch: claude/pool-elections-polls-core2
---

**What.** Polls on core2 exist, and a world campaign now commissions them, but no test proves it in the played world. This item began as the replacement for old-core poll work in PRs #5091 and #5081, which were closed because nothing new is added to the deleted old core. `commissionPoll` and `pollMargin` in `src/core2/modules/campaigns.ts` already sample the town's residents from their records and pay the pollster from campaign money. The Oct 19 measurement found no world-campaign poll in six drawn places over 420 days because statewide campaigns raised too little from the town alone; what remains is the proof in a played world that a non-player campaign buys a poll before its election.

**Cause.** Found in code: `src/core2/modules/campaigns.ts` `commissionPoll` (line 5322) is called for non-player campaigns at line 6481 once `pollFundMinor` reaches the minimum interviews; no test on main drives a world campaign's poll (the closed PR #5815's test never reached main).

**Fix.** Add a played-world test (`buildBenchWorld`, a drawn place and a random seed printed) that a non-player campaign buys a poll before its election: every respondent id is a real record on the poll date, the answers add up to the contacted count, the campaign record exists and belongs to a non-player candidate, and the poll is dated before the contest.

**Time box.** 3 hours for one sonnet session.

**Rules.** No dice; a poll samples the views people actually hold, read from their records. One rule, all 56 places. Wire to the world: the test uses the ordinary generated world and existing producers, not a hand-built fixture. Do not waive missing respondent records with a ratio floor (the Oct 21 send-back): check every sampled person at the poll date.

**Done when.** A second session runs the new test in a drawn place and seed (named in the PR) and sees a non-player campaign's poll rows dated before the contest, every respondent a real record on the poll date, and answers adding up to contacted. In the running game the campaign screen shows that poll with its margin.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaigns.test.ts, src/core2/world-campaign-poll.test.ts (new), src/bench/campaign.ts

**Notes.** Closed PRs #5091 and #5081 hold the old-core attempt.

Looked at Oct 19 (claude, claude/polls-core2), released. Polls on core2 already exist: `commissionPoll` and `pollMargin` in `src/core2/modules/campaigns.ts`, the `polls` table, the bench campaign screen (`src/bench/campaign.ts`), and `campaigns.test.ts` (M2-06) and `campaign-calibration.test.ts` cover a poll of real residents with a margin of error. What the done-when still lacks is a poll run by a world campaign in the played world: six drawn places over 420 days (seed prefix 01e3ca3c, Oak Grove, Mississippi first) produced none. Cause measured in a New Mexico town 60 days in: the U.S. House, Senate and governor campaigns raised $25,000 to $55,000 from the town's residents alone, and a poll costs at least 200 interviews at $45 ($9,000) from a fraction of what is raised, so none is ever bought. The fix is filed as `gov-campaign-statewide-money-town-only`; this item closes with a played-world test once that lands (the test: a world campaign's poll rows, answers adding up to contacted, a margin, respondent ids that are real records).

**Checked Oct 19 (claude/polls-core2):** already built. `commissionPoll` in `src/core2/modules/campaigns.ts` (M2-06) is a core2 module: the pollster calls adults in the town from a sampling frame of full people and counted residents, each answers from their own recorded views, the pollster is paid per interview from the campaign's money, and the result carries a computed margin of error (`pollMargin`). `src/core2/campaigns.test.ts` runs it in a random place on a named seed and passes. Nothing in `src/simulation` is touched. The CTO can set this item done.

Sent back 2026-10-20 from PR #5171 (branch claude/note-polls-core2): The item Done when requires a poll run in the ordinary played world, with its sampled residents and a named place/seed. Its current Notes explicitly report no world-campaign poll in six 420-day draws and defer that missing path to gov-campaign-statewide-money-town-only. The M2-06 fixture proves the API, not that missing generated-world producer. Supply the positive world-campaign poll/answer record proof before marking this item done, or track this completed API-finding note separately.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5815 (branch claude/foreclosure-outside-lender): The positive ordinary-world poll producer is useful, and the test defaults to a random seed; the pinned reproduction run is not the objection. The remaining proof does not meet elections-polls-core2 Done when: src/core2/world-campaign-poll.test.ts permits 20 percent of respondent IDs to resolve to no record, without proving those people actually died or left after the poll. A count ratio cannot distinguish that history from invalid respondents. Verify every sampled person at the poll date (capture the poll when produced), or follow an actual death/exit record for each no-longer-present respondent; do not waive the missing records with an arbitrary 0.8 floor. Also assert the selected poll date is before its contest election and require the campaign record to exist and belong to a non-player candidate: the current optional campaign lookup treats an orphan poll as non-player. Keep the self-lender foreclosure repair, with a focused regression showing its settlement balances without a self-transfer, alongside the drawn producer case. No local standard gate pass or merge is claimed for this source review.; finish on that branch, merge main into it first.
Stale 2026-10-26: PR #5815 closed (no push for five days, sent back); the work is on branch claude/foreclosure-outside-lender; claim the item and merge main into that branch.

Released (2026-11-11): Could not be proved on main 250e39494b: a played-world test (buildBenchWorld, 420 days) in six places drawn with GOLDEN_PATH_SEED=poll-a found no poll bought by any campaign: Goff, Kansas [2026775]; Hilger, Montana [3036325]; Charlotte Amalie East, U.S. Virgin Islands; Tekamah, Nebraska [3148515]; Guilford, Maine [2330060]; Pleasant Valley, Alaska [0261120] (draw poll-a:0 to :5, each 'no poll in 420 days'). This matches the item's own Oct 19 measurement: world campaigns raise too little from the town for commissionPoll (campaigns.ts:5322, called at 6481 once pollFundMinor reaches the minimum interviews) to fire. The test cannot pass until a world campaign actually buys a poll, so the item needs a cause for why none does (the poll fund threshold against what a world campaign raises) before a test is added; no test was committed. Continue on branch claude/pool-elections-polls-core2 and pull request #5815.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:18 UTC) on branch claude/pool-elections-polls-core2.

Released (2026-11-11): Not built: the item's own Fix is a test that a non-player campaign buys a poll in a played world, and the earlier release (six drawn places, 420 days, GOLDEN_PATH_SEED=poll-a, main 250e39494b) and the Oct 19 measurement both found no such poll, so the test cannot pass; needs a decision on why world campaigns raise too little for commissionPoll's minimum (campaigns.ts line 5322/6481), not another replay. Continue on branch claude/pool-elections-polls-core2 and pull request #5815.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:19 UTC) on branch claude/pool-elections-polls-core2.

Released by next (2026-11-13): no push to claude/pool-elections-polls-core2 since 2026-11-11 06:19 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-elections-polls-core2 and pull request #5815.

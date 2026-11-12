---
id: elections-exit-poll-counted-voters
title: "Counted voters answer the exit poll by the same rule as named voters, so the exit poll tally counts the whole electorate"
area: elections
kind: wiring
priority: 3
size: S
status: merged
standard: 2
claimed-by: claude/pool-elections-exit-poll-counted-voters
pr: #8660
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:38:47.289Z
merged-at: 2026-11-12T20:17:15.879Z
---

**What.** The election's exit poll tally (exitPoll in src/core2/modules/voting.ts holdElection) counts only named voters: the counted residents vote in their own loop and never weigh voting.exit-poll, so a town where most voters are counted reports an exit poll of a few dozen people. The rule One model, two tiers says a counted group is read by every engine with the same rule as a full person, times its count. A counted voter's engagement is its survey cell's (engagementOf) and its interest is the turnout decision's, so the same case and lean apply.

**Cause.** Found in code: `holdElection` in `src/core2/modules/voting.ts` builds `exitPoll` (line 2945) in the named-voter loop only and returns `exitPoll: named.exitPoll`; counted residents vote in their own loop and never weigh voting.exit-poll, while the named voters' rule is `pollsterCase` (line 2409).

**Fix.** Have a counted voter weigh voting.exit-poll by the same case and trait lean as `pollsterCase`, and add its answer to the tally weighted by its turnout share. Check it in `src/core2/modules/voting.traits.test.ts`.

**Time box.** 4 hours for one Sonnet session.

**Rules.** One model, two tiers: the counted voter weighs telling by the same case and trait lean as a named voter, and its answer counts at the share of people like it who turn out. No dice.

**Done when.** A second session plays one election window of buildBenchWorld in a drawn place (name and seed written down) and finds the exit poll tally including counted voters' answers weighted by their turnout share, by record id. It reports the share who tell among counted voters beside the named voters' share, and `src/core2/modules/voting.traits.test.ts` checks a counted voter's answer against its case and lean. In the running game on election night the exit poll is no longer a few dozen people in a town where most voters are counted.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/voting.traits.test.ts

**Notes.** Found Oct 25 by the traits lead while fitting the exit poll's case (traits-exit-poll-reasons); the named voters' rule is pollsterCase in voting.ts.

Deferred Oct 25: nothing on screen reads it yet.

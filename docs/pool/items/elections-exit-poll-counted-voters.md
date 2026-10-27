---
id: elections-exit-poll-counted-voters
title: "Counted voters answer the exit poll by the same rule as named voters, so the exit poll tally counts the whole electorate"
area: elections
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The election's exit poll tally (exitPoll in src/core2/modules/voting.ts holdElection) counts only named voters: the counted residents vote in their own loop and never weigh voting.exit-poll, so a town where most voters are counted reports an exit poll of a few dozen people. The rule One model, two tiers says a counted group is read by every engine with the same rule as a full person, times its count. A counted voter's engagement is its survey cell's (engagementOf) and its interest is the turnout decision's, so the same case and lean apply.

**Rules.** One model, two tiers: the counted voter weighs telling by the same case and trait lean as a named voter, and its answer counts at the share of people like it who turn out. No dice.

**Done when.** In one played election window of buildBenchWorld in a drawn place, seed named, the exit poll tally includes counted voters' answers weighted by their turnout share, the share who tell among counted voters is within 10 points of the named voters' share, and src/core2/modules/voting.traits.test.ts checks a counted voter's answer against its case and lean.

**Files.** src/core2/modules/voting.ts, src/core2/modules/voting.traits.test.ts

**Notes.** Found Oct 25 by the traits lead while fitting the exit poll's case (traits-exit-poll-reasons); the named voters' rule is pollsterCase in voting.ts.

Deferred Oct 25: nothing on screen reads it yet.

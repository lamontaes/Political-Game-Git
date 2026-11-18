---
id: gov-running-mate-agrees-and-is-replaced
title: "A running mate agrees or declines from their own record, and one who leaves is replaced when it happens"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after: gov-governor-running-mates
blocked-on:
lead: governing
source: Account lead review of #9080 (T44), Nov 14 02:20Z
standard: 2
model: opus
effort: medium
root: none
---

**What.** In a joint-ticket state, the person a governor candidate names (the world's pick, or the player's pick on the Campaign board) agrees or declines from their own record. A running mate who withdraws, moves out of the state or dies before the count is replaced the day it happens, not at the count (today a mate named at the count is a stranger nobody saw before the vote). Seen: the Campaign board's "Your running mate" section, where a pick who declines is not seated and the list is offered again; the ballot at the polls, which names the replacement before election morning; and a news or journal line when a running mate leaves the ticket.

**Cause.** Design: docs/pool/items/gov-governor-running-mates.md (owner decision cards, Nov 13 23:51Z and Nov 14 00:07Z) and the Account lead review of #9080, Nov 14 02:20Z. On #9080, `nameRunningMate` (src/core2/modules/voting.ts) files the person `officialCandidate` ranks first (src/core2/modules/officials.ts `rankCandidates`), or the player's pick, with no agreement step; the only check is "already a candidate this year". `ballot()` (src/core2/modules/elections.ts) drops a dead running mate, and `decideTicket` calls `formTickets(..., "election")` first, so a new mate is named only at the count. A mate's own withdrawal or move is not modeled.

**Fix.** Agreement from the record: the officials' own reasons that `rankCandidates` already weighs (ambition against the cost to their seat: a holder up for their own seat that year, a seat they would give up), read when the pick is made. A person whose reasons fall below what running costs them declines, and the next person in the same ranking is asked. Replacement on the event: the death, move and withdrawal events already announced by the people and elections engines call `formTickets` for the ticket that lost its mate, the same day. The player's ticket opens the choice again instead of naming for them.

**Time box.** 6 hours for one opus session.

**Rules.** No dice: agreement comes from the person's reasons, never a chance. One rule, all 56 places: the stage is still the research row `ticketJoins`. Replace, never layer: the count-time naming in `decideTicket` stays only as the last guard, with a stopgap if it ever fires.

**Done when.** A second session runs a played world in a drawn joint-ticket state through a governor election, with a seed it did not choose. It sees by record id at least one pick who declined (with the reasons recorded) and the next person asked. A running mate who dies or leaves before the count is replaced within a day, and the new running mate is on the ballot at the polls before election morning. Playing as a governor candidate, a declined pick shows on the Campaign board and the list is offered again.

**Waits on.** gov-governor-running-mates (#9080) on the train.

**Files.** src/core2/modules/voting.ts, src/core2/modules/officials.ts, src/core2/modules/elections.ts, src/bench/campaign.ts, src/bench/play.mjs, src/core2/governor-running-mates.test.ts

**Notes.**

- Nov 14 2026, S6 (brief J): the player's half is built on branch claude/project-thread-d5qa0q: the player's pick answers from their record in a scene (serve-asks engine), a no is kept with its reason and date and may be asked again after 30 days or when its ground changes, and "Choose for me" names someone willing. The world's picks reading the same willingness is item world-picks-read-serve-willingness; replacement on death, move or withdrawal is still open here.

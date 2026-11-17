---
id: history-officials-drawn-around-century-parties
title: "Members of Congress and the legislatures are drawn around where their party's own history put it"
area: elections
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/history-officials-parties
pr:
after: history-officials-leans-from-the-century
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: CTO lines 6935508228 and 6936902133 on #9747 (family 9, pin officials-roster.ts:224); History's family 9 plan (comment 6947526428)
checked:
---

**What.** Every state and federal official is drawn around the 119th Congress's party means, so in every world each party's members stand where 2025's do, whatever the world's own history did to the parties.
Seen: `src/core2/officials-roster.ts` `drawOfficial` reads `partySpread`, the 119th Congress's means (data/officials/officials.json).

**Cause.** Found in code: `src/core2/officials-roster.ts:224` `drawOfficial` takes each party's mean from `partySpread`, the Voteview 119th Congress row, for every world.

**Fix.**

1. `partySpread` and `drawOfficial` take the parties' positions by side; with them, a party's mean is its position (a legislature's scaled by `stateMeanScale`, as `expectedIdeal` already does), and its spread stays the published one.
2. `modules/officials.ts` passes the century parties' day-one positions when seating and when weighing candidates, in a century world. "Today" keeps the 119th Congress.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice; one stance rule (`partyMeanAt` is shared by `expectedIdeal` and `drawOfficial`).

**Done when.** A second session starts a new game at a drawn place it writes down with its seed, turns dev mode on, opens Politics, Metrics, reads the parties' day-one positions in "The parties", and sees each party's members of Congress stand around that position on average. At drawn worlds each party's House and Senate members' mean is within four standard errors of the century party's position, and src/core2/officials-century-parties.test.ts passes.

**Waits on.** history-officials-leans-from-the-century (#9966), which this branch is stacked on.

**Files.** src/core2/officials-roster.ts, src/core2/modules/officials.ts, src/core2/officials-century-parties.test.ts (new)

**Notes.** Filed by the History lane, Nov 17, 2026.

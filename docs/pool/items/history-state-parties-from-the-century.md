---
id: history-state-parties-from-the-century
title: "Each state's parties in play are the century's, at their shares of its last century count"
area: elections
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/history-state-parties
pr: "#9962"
after: history-parties-from-the-century
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: CTO lines 6935508228 and 6936902133 on #9747 (family 9, pin parties.ts:163); History's family 9 plan (comment 6947526428), PR 9c part 1
checked:
---

**What.** Every world's state parties are the 2024 presidential ballot's labels at their 2024 totals moved by one swing, so every world's party list is the real 2024 one.
Seen: `src/core2/modules/parties.ts` `stateParties` reads `presidentialByState` from the 2024 calibration corpus.

**Cause.** Found in code: `src/core2/modules/parties.ts:163` `stateParties` builds each party from the 2024 ballot's `rawLabels` and `totalsByParty`.

**Fix.**

1. In a century world, `stateParties` returns the century's parties, each at its share of the state's last presidential count in the century (`centuryStateVote`), citing that race.
2. A place with no presidential vote (a territory) keeps the published path until the century counts it; "today" keeps the published path.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice; replace, never layer: the 2024 ballot is read only under "today" and where the century has no count.

**Done when.** A second session starts a new game at a drawn place it writes down with its seed, opens Politics, Parties, and sees the century's parties (not the 2024 ballot's third parties); at drawn worlds `stateParties` equals the century's parties at the century's state shares, and src/core2/electorate-century-parties.test.ts passes.

**Waits on.** history-parties-from-the-century (#9958), which this branch is stacked on.

**Files.** src/core2/modules/parties.ts, src/core2/electorate-century.ts, src/core2/electorate-century-parties.test.ts

**Notes.** Filed by the History lane, Nov 17, 2026. Party ties from views, who runs and the challenger's chance are the rest of PR 9c.

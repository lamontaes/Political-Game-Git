---
id: history-parties-from-the-century
title: "The century's parties stand where the members they hold stand, each with its record"
area: elections
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/history-parties
pr:
after: history-laws-from-the-century
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: owner's parties ruling, Nov 17, 2026 (CTO lines 6935508228 and 6935528569 on #9747); History's family 9 plan (comment 6947526428), PR 9a
checked:
---

**What.** Every world's parties are the 119th Congress's: the century's members vote at its party means, and no record says where a party has stood, what it stands for or whom it elected.
Seen: `src/core2/officials-roster.ts` `expectedIdeal` reads `partySpread(...).mean`, the 119th Congress's House and Senate means, for every century member.

**Cause.** Found in code: `src/core2/officials-roster.ts` `partySpread` returns the Voteview HS119 party means, and the century kept no party record of its own.

**Fix.**

1. The century keeps a party record per side: who exists in 1925 (the two national parties, founded before it) and its position after each even November.
2. A party's position is where the members it holds in Congress stand: the mean of their seats' leans, put on the members' scale by `centuryPartyLeanScale` (fitted once to the 2024 House). A party that wins moderate seats moderates; one left with its safest seats moves out. Never a target.
3. The century's sessions put each member at their party's position plus their own seat's pull (`expectedIdeal`'s `partyPosition`), so the laws follow where the parties stand.
4. Each party's record carries its key issues (`partyKeyIssues`) and its presidencies; dev mode's "How this world opened" shows them.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: a party's position is its members' seats, never a roll or a target. Build the system, not the examples (CTO line 6935528569).

**Done when.** A second session starts a new game at a drawn place it writes down with its seed, opens dev mode's "How this world opened" and sees "The parties": each party's position now and in 1926, its key issues and its presidencies; at drawn worlds the positions move over the century and differ between worlds, and src/core2/electorate-century-parties.test.ts passes.

**Waits on.** history-laws-from-the-century (#9919), which this branch is stacked on.

**Files.** src/core2/electorate-century.ts, src/core2/electorate-century-laws.ts, src/core2/officials-roster.ts, src/core2/modules/elections.ts, src/core2/data/history/century.json, src/bench/dev-views/opening.ts, src/bench/dev-views/opening-sources.json, src/core2/electorate-century-parties.test.ts (new)

**Notes.** Filed by the History lane, Nov 17, 2026. Parties founded, split, merged and renamed are PR 9b; play reading the century's parties (stateParties, party ties, who runs) is PR 9c.

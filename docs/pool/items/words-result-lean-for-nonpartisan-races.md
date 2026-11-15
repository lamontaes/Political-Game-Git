---
id: words-result-lean-for-nonpartisan-races
title: "Neighbors only feel something about a party race's result, never a town or county race's"
area: words
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead on #9279 at 75f702e1 (Nov 14, ruling-part1-round2.md); Account lead's routing
---

**What.** After a count, nearly every neighbor who says how a result sits with them is talking about the U.S. House or Senate race: 232 of 244 such tellers in three places. Almost nobody is glad or sorry about who won the council seat or the sheriff's race. Seen: talking to neighbors in the week after a November count, the town's own races are told flat or not at all.

**Cause.** Found in code: `resultLean` in src/director/bring-it-up.ts reads only the winner's party (`partyLean` on the winner's filing) against the teller's `voterLean`, overruled by their ballot. A nonpartisan race's winner has no party, so nobody has a lean on it unless their ballot is read. Measured: Sheridan, Wyoming (5669845), Arkadelphia, Arkansas (0501870) and Astoria, Oregon (4103150), worlds opened Oct 27, 2026 and run to Nov 10 (/mnt/project-files/words-lead/8831/part1-lines.md).

**Fix.** Do not add a second lean for local races. Read the stance #9307 put on the train: each person's view of a question built from their own life (`openingStance` and `ownOpeningStance` in src/core2/modules/views.ts, with `lifeShift`), on the questions the candidates ran on (their platforms in src/core2/campaign-stances.ts). A teller's lean on a race is where they stand on what the winner and loser ran on, and whether they know the winner or the loser (their tie), with party as one reason among them. `resultLean` stays the one reader; its inputs widen.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** No dice: the lean comes from the teller's own stance and ties, never a roll. One model, two tiers: the same rule a counted voter's views use. Ask why: each lean names the record behind it (the stance, the tie or the party).

**Done when.** A second session, on main, talks to neighbors in a drawn place in the week after a count and hears at least one say how a town or county race's result sits with them, with the place, seed and the record behind the lean named.

**Waits on.** Nothing.

**Files.** src/director/bring-it-up.ts, src/core2/modules/views.ts, src/core2/campaign-stances.ts

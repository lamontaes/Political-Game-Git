---
id: history-congress-from-the-century
title: "Day one's Congress is the one the century since 1925 elected, not the real roster"
area: elections
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by: claude/history-congress
pr:
after:
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: owner's answers to the calibration audit, Nov 17, 2026 (CTO line 6935086070 on #9747, "who holds every office, party control"); History lane plan on #9747, PR 2
checked:
---

**What.** Every world opens on the real 2026 roster of Congress, flipped seat by seat only where one swing carries a seat's 2024 vote across even. The owner ruled that day one is what a history from 1925 produced.
Seen: every drawn world on main seats Congress from data/research/offices/legislature-party-counts-2026.json.

**Cause.** Found in code: src/core2/offices-state.ts lines 492 and 539 seat each senator and House member in the party of `legislature-party-counts-2026.json`, and src/core2/electorate-places.ts `worldRoster` and `heldInWorld` keep that roster unless the world's swing flips a seat's 2024 share; every engine's Congress (legislature.ts `congressMembers`, officials, parties, the President's desk) reads `worldRoster`.

**Fix.**

1. src/core2/electorate-century.ts counts every House seat each even year and the Senate by class from 1926, on the one path play's world races use (electorate.ts `countParties`, split out of voting.ts `decide`).
2. Each member's career is drawn once when they first win; they run again until it ends, and the count decides.
3. `worldParties` in offices.ts seats the century's members with their careers and past races; `worldRoster` returns the century's Congress, so every engine reads it.
4. Dev mode's "How this world opened" shows Congress on day one and every Congress of the century.

**Time box.** 6 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: each seat goes to the side the one count gives it from the place's lean, the candidates and the year's tide, never a roll. Replace, never layer: the real roster is read only under the "today" setting.

**Done when.** A second session starts a new game at 1440x900 in a drawn place it writes down with its seed, opens dev mode's "How this world opened" and sees Congress on day one with each chamber's seats by party and the century's Congresses; the town's senators and House member hold the century's seats, and src/core2/electorate-century-congress.test.ts passes.

**Waits on.** history-president-from-the-century (#9820), which this branch is stacked on.

**Files.** src/core2/electorate-century.ts, src/core2/electorate.ts, src/core2/modules/voting.ts, src/core2/electorate-places.ts, src/core2/modules/offices.ts, src/core2/modules/elections.ts, src/core2/past-elections.ts, src/bench/dev-views/opening.ts, src/core2/electorate-century-congress.test.ts (new)

**Notes.** Filed by the History lane, Nov 17, 2026.

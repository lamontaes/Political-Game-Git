---
id: history-state-places-from-the-century
title: "Every state's counted places stand where the century's last count left the state"
area: elections
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/history-state-places
pr:
after: history-officials-drawn-around-century-parties
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: CTO lines 6935086070 and 6936902133 on #9747 (family 8, pins electorate-places.ts makePlace and worldSwing); History's family 8 plan (comment 6943530405), PR 8a part 1
checked:
---

**What.** Every county and state counted in play's races stands at its 2024 share plus one world swing, so the first statewide race and the first presidential count in play read 2024's map, whatever the century before day one left.
Seen: `src/core2/electorate-places.ts` `statePlaces` builds every place with `makePlace` from the 2024 presidential vote.

**Cause.** Found in code: `src/core2/electorate-places.ts:251` `makePlace` sets each place's lean from the 2024 vote and `worldSwing`; `statePlaces` returns those to every count (voting.ts, race-places.ts).

**Fix.**

1. Add `centuryStateShare(seed, usps)` to `electorate-century.ts`: a state's last century presidential count, or a territory's last delegate race.
2. In a century world, `statePlaces` moves all of a state's places by the one shift that puts the state's vote-weighted lean on that share, so each county keeps how it differs from the others. The century sizes its voters from `publishedStatePlaces`, so it never reads itself.
3. "Today" keeps the published path.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice; one rule for all 56 places; replace, never layer.

**Done when.** A second session starts a new game at a drawn place it writes down with its seed, turns dev mode on, opens Politics, Metrics, and sees "Your state on day one" equal the century's last count in the state. At drawn worlds every state's vote-weighted lean in `statePlaces` equals the century's, and src/core2/electorate-century-state-places.test.ts passes.

**Waits on.** history-officials-drawn-around-century-parties (#9968), which this branch is stacked on.

**Files.** src/core2/electorate-places.ts, src/core2/electorate-century.ts, src/core2/electorate-century-state-places.test.ts (new)

**Notes.** Filed by the History lane, Nov 17, 2026. Counties' own century results (each county carrying its own count) are the rest of 8a, after World B's #9862 and a speed reading.

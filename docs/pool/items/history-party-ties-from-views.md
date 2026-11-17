---
id: history-party-ties-from-views
title: "Each adult takes the party their own lean reaches toward, not a fixed 56% and 7%"
area: elections
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/history-party-ties
pr:
after: history-territory-legislatures-from-the-century
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: CTO lines 6935508228 and 6936902133 on #9747 (family 9, pins parties.ts:301, :340, :865); History's family 9 plan (comment 6947526428), PR 9c
checked:
---

**What.** In every world exactly round(adults × 0.56) take a party and round(adults × 0.07) none, by quota, however far the world's parties stand from its people.
Seen: `src/core2/modules/parties.ts` `openParties` and `buildTieRule` cut the adults at `partyIdentifierShare` and `noPartyShare`.

**Cause.** Found in code: `src/core2/modules/parties.ts:301` (the opening quota), `:340` (the no-party quota) and `:865` (`buildTieRule`, the same cuts each monthly meeting).

**Fix.**

1. In a century world, an adult takes their side's party when their own lean (`personLean`) reaches `partyIdentityReach` of the way to where that party stands on the voters' scale (the century party's day-one position, `stanceLean`).
2. An adult with no party is "no party" at or under `noPartyReach` on `noPartyScore`, otherwise independent.
3. The monthly re-tie (`buildTieRule`) uses the same rule. "Today" keeps the published shares.
4. Both strengths are TUNABLE, checked against Gallup's 56% and Pew's 7% at four drawn worlds.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice, no quota; real figures set only the strength.

**Done when.** A second session starts a new game at a drawn place it writes down with its seed, turns dev mode on, opens Politics, Metrics, and reads "The town's party ties on day one" (a share that follows the world's parties, not 56%). At drawn worlds every adult's tie follows the rule and the share differs between worlds, and src/core2/electorate-century-parties.test.ts passes.

**Waits on.** history-territory-legislatures-from-the-century (#9976), which this branch is stacked on.

**Files.** src/core2/modules/parties.ts, src/core2/data/campaigns/parameters.json, src/core2/electorate-century-parties.test.ts, src/bench/dev-views/opening.ts, src/bench/dev-views/opening-sources.json

**Notes.** Filed by the History lane, Nov 17, 2026. World B was asked at 14:09Z whether anything reads `ties` in a way this breaks.

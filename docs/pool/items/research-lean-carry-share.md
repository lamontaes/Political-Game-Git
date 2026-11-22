---
id: research-lean-carry-share
title: "How much of a county's own swing stays to the next election: a source for leanCarryShare"
area: elections
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: World B, Nov 17, 2026, building gov-counted-places-leans-carry-forward
standard: 2
model: sonnet
effort: medium
root: none
lead: researcher
after:
---

**What.** A counted place's lean moves by `leanCarryShare` times the part of its last result that was its own, and that share is TUNABLE at 0.5 with a spread of 0 to 1. Find how well one election's county swing against the nation predicts that county's position at the next election, from county presidential and House returns across several cycles, with its source and spread, so the share becomes a sourced strength.
Feeds: gov-counted-places-leans-carry-forward

**Cause.** Found in code: `leanCarryShare` in src/core2/data/electorate/parameters.json is tagged TUNABLE, and `carryCount` in src/core2/modules/voting.ts passes it to `carryLeans` as the strength.

**Fix.** Replace the row's value, tag and source in src/core2/data/electorate/parameters.json with the researched share and its spread, from pages fetched and quoted (skill `researcher`). It sets how strongly one result moves the next, never a level; the player sees it only as how fast the map outside the town changes.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what was found with its sources and stop.

**Rules.** Research before building: real data sets the strength of a relationship and never a level. Estimate, never unknown: the row keeps a spread and its source.

**Done when.** A second session reads the parameter's source, opens the pages it quotes and finds the figure there; and in a drawn place, the place `LEANS_PLAYED_SEED` draws for src/core2/place-leans-played.test.ts, that test still passes with the new value.

**Waits on.** gov-counted-places-leans-carry-forward (the parameter is added there).

**Files.** src/core2/data/electorate/parameters.json

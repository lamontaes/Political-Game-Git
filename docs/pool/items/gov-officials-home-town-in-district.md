---
id: gov-officials-home-town-in-district
title: "Every official filled in has a home town in the district they serve, not just their state"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: gov-governor-running-mates
blocked-on:
lead: governing
source: Account lead review of #9080 (T44), Nov 14 03:09Z, design choice (b)
standard: 2
model: opus
effort: medium
root: none
---

**What.** A state or territory official filled in by the officials engine (legislators, executives, newcomers who run) lives in a town inside the district their seat serves, drawn from the world's seed among that district's towns by population. Today their home is the state itself, so every officeholder offered as a running mate reads "Name, senator, Guam", and the card cannot say where they are from. Seen: the Campaign board's "Your running mate" list, where each officeholder's row names their home town; and the person card's line on where they live.

**Cause.** Design: docs/pool/items/gov-governor-running-mates.md and the Account lead's choice on #9080 (Nov 14 03:09Z): rows read by seat for now (a), and this item builds (b). Found in code: `officialCandidate` and the officials' fill-in (src/core2/modules/officials.ts) call `fillInIdentity` with `placeId: facts.stateKey`. `offerNewcomer` (src/core2/modules/voting.ts) already draws a home town for a newcomer among the state's towns by population.

**Fix.** Use the same draw as `offerNewcomer`, but limited to the towns in the seat's district (statewide seats draw from the state). Run it in the one place officials are filled in, and give the household a dwelling through the housing rule that housing-filled-in-officials-have-no-home builds.

**Time box.** 5 hours for one opus session.

**Rules.** One rule, all 56 places: districts and towns come from data. Seeded generation of who exists only, with no dice. Replace, never layer: the state as a home is removed, not kept beside.

**Done when.** A second session builds a drawn place on main, naming place and seed, and opens the cards of three state legislators from different districts. Each card names a home town in its district. The running mate list on the Campaign board names officeholders' home towns.

**Waits on.** housing-filled-in-officials-have-no-home for the dwelling.

**Files.** src/core2/modules/officials.ts, src/core2/modules/voting.ts, src/core2/state.ts

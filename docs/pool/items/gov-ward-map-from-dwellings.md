---
id: gov-ward-map-from-dwellings
title: "Council districts are drawn from the town's dwellings, not from household order"
area: gov
kind: stopgap
priority: 3
size: M
status: dropped
standard: 2
claimed-by: claude/ward-map
pr: #5106
after: gov-council-election-method
blocked-on: world-dwelling-position
lead: governing
model: opus
effort: medium
root: rc9-place-facts-one-default
milestone:
source: "stopgap SG-GOV-ward-map, added by gov-council-election-method"
claimed-at: 2026-10-19T19:07:44.446Z
checked: fable 2026-11-10
---

**What.** A council seat chosen by part of town counts the voters of its part. Today the part of town is a run of households in the town's recorded order, cut to near equal adults, because the world holds no street map. Draw the parts from the town's dwellings (the council or a commission draws them to near equal population, as the charter says) and place each household and each sitting member by their dwelling. The old drawing rules file is gone with the old core, so the rules are written fresh: a council draws near equal population keeping each sitting member in their own part, a commission draws equal parts, and the courts' allowed deviation comes from the data.

**Cause.** Found in code: `wardMap` in src/core2/modules/voting.ts (line 2739) cuts households in recorded order; the registered stopgap SG-GOV-ward-map is in src/core2/data/stopgaps/gov.json. A dwelling holds no position inside the town: src/core2/modules/housing.ts keeps `dwelling:<householdId>` rows with a tenure and a value and no street, block or tract, so drawing from dwellings would order the same households by the same ids.

**Fix.** Once dwellings carry a position (world-dwelling-position), draw the parts from the dwellings to near equal population within the deviation the data allows, and place households and sitting members by dwelling. Delete the household-order map and mark SG-GOV-ward-map resolved with a note on what replaced it. The drawing rules can be written and tested on any ordering first, but the stopgap closes only with positions.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the household-order map is deleted, and the stopgap row SG-GOV-ward-map stays in the file as resolved with a note on what replaced it. One rule, all 56 places: whether a place uses wards, and how many, come from its records (owner, Oct 15: "wards" only where a place's records use it). No dice: the parts follow positions and population, never a draw. An effect is a read, not a record: the election reads the part a household lives in.

**Done when.** A second session, not the builder, plays a drawn place with a council elected by part of town (place and seed named). A ward seat's voters are the households in its drawn part, by dwelling record id; the parts' populations stay within the deviation the data allows, shown by a test; and the stopgap row SG-GOV-ward-map is resolved in src/core2/data/stopgaps/gov.json with a note on what replaced it.

**Waits on.** world-dwelling-position (a position on each dwelling).

**Files.** src/core2/modules/voting.ts, src/core2/gov-rules/council-election-method.ts, src/core2/data/stopgaps/gov.json, src/core2/modules/housing.ts

**Notes.** Interpretation to confirm: the owner ruled (Oct 15) that "wards" is used only where a place's records use it; the method reader carries `seatTerm` for the screens.

Looked at Oct 19 (claude/ward-map), nothing built: a dwelling in the core holds no place inside the town. `src/core2/modules/housing.ts` keeps dwellings as `dwelling:<householdId>` rows with a tenure and a value, and no street, block or tract; drawing wards "from the dwellings" would order the same households by the same ids, which is what voting.ts `wardMap` does now (the old engine's town-wards.ts says the same: households in recorded order stand in for streets). The drawing rules worth porting from town-wards.ts (council draws near equal population keeping each sitting member in their own ward; a commission draws equal wards; the courts' allowed deviation) can be built on any ordering, but the stopgap's real replacement needs a dwelling position first. Filed world-dwelling-position for that and made this item wait on it. The drawing rules themselves can go in without it: split out as gov-ward-map-drawing-rules if the Government area wants them first.

Deferred Oct 25: nothing on screen reads it yet.

Oct 25 audit: blocked-on re-pointed to world-dwelling-position (world-dwelling-locations was its duplicate).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have drawn council wards from dwelling positions, which means tracking where each home sits; the wards from household order stay.

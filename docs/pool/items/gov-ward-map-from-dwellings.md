---
id: gov-ward-map-from-dwellings
title: "Council districts are drawn from the town's dwellings, not from household order"
area: gov
kind: stopgap
priority: 2
size: M
status: blocked
claimed-by: claude/ward-map
pr: #5106
after: gov-council-election-method
blocked-on: world-dwelling-locations
milestone:
source: "stopgap SG-GOV-ward-map, added by gov-council-election-method"
claimed-at: 2026-10-19T19:07:44.446Z
---

**What.** A council seat chosen by part of town counts the voters of its part. Today the part of town is a run of households in the town's recorded order, cut to near equal adults, because the world holds no street map. Draw the parts from the town's dwellings (the council or a commission draws them to near equal population, as the charter says) and place each household and each sitting member by their dwelling. The old engine's `living-world/town-wards.ts` holds the drawing rules (council versus commission, the courts' allowed deviation); port only what the golden path uses.

**Rules.** Replace, never layer (the household-order map is deleted and the stopgap row SG-GOV-ward-map is kept in the file as resolved, with a note on what replaced it); one rule, all 56 places; no dice; an effect is a read.

**Done when.** In a drawn place with a council elected by part of town, a ward seat's voters are the households in its drawn part, by dwelling record id; the stopgap row SG-GOV-ward-map stays in `stopgaps.json` with status resolved and a note on what replaced it; a test shows the parts within the deviation the data allows.

**Files.** src/core2/modules/voting.ts, src/core2/gov-rules/council-election-method.ts, src/core2/data/stopgaps.json

**Notes.** Interpretation to confirm: the owner ruled (Oct 15) that "wards" is used only where a place's records use it; the method reader carries `seatTerm` for the screens.

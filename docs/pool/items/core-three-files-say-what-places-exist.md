---
id: core-three-files-say-what-places-exist
title: "Three files in the core each say what places exist: place-lookup.ts, places.ts and place-map.ts, the last of which calls itself the one place map"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: cto
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, "Duplicate systems worth merging", item 8)
---

**What.** Read in code by the audit on Nov 9, not measured in play: "Three files that each say what places exist (checked by me). `place-lookup.ts`, `places.ts` and `place-map.ts` in `src/core2`; the last calls itself 'the one place map.'" Confirmed on main, Nov 10. `src/core2/place-lookup.ts` (about 24,000 bytes) opens "The core's own place lookup" and answers a place by key or jurisdiction id, the state identities and the place search (`corePlaceByKey`, line 400; `searchCorePlaces`, line 657) from the Gazetteer lists, the territory list and `data/places/place-lookup.json`. `src/core2/places.ts` opens "The core's own place listing: the 56 jurisdictions and every locality in each" (`placeStateKeys`, line 59; `placeLocalities`, line 128) from the same localities and territory files plus `states.json`. `src/core2/place-map.ts` opens "The one place map and its one reader... Every system reads where a place is... through this module, never a lookup of its own" (`allPlaces`, line 60; `placeRow`, line 65) from `data/places/place-map.json`, and itself imports three functions from `place-lookup.ts`. By a search of `src`, `scripts` and `tests`, 212 files import the first, 62 the second and 63 the third. Fix with no behavior change: one module and one data file answer what places exist and where each sits, the other two are folded into it and deleted, and every importer reads the one.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the two files folded in are deleted with their data files and their tests moved, not left re-exporting, and the PR body counts the files and exports removed. One rule, all 56 places: the one reader answers every state, D.C. and territory, including the four territories the Gazetteer omits, from data, and no place is named in logic. AGENTS.md, one engine per mechanic (owner, Oct 27): "A second engine or a per-level code path is a duplicate to delete." The slim-down skill's traps apply (import cycles when a hand-typed module name is replaced; validated against plain helpers).

**Done when.** A search of `src/core2` finds one module that lists places and no file named `place-lookup.ts` or `places.ts` (or whichever two are folded in; the PR says which one is kept and why). A test compares, for every one of the 56 jurisdictions and every locality the old three answered, the old answers with the new one's and fails on any difference in key, name, county or state. Then a different session starts the bench (`npm run bench`), searches for and starts a new game in a drawn place and in one place in each of the four smaller territories (places and seeds named in the proof), and takes a screenshot of the creator's place list and of Government in each: the place names, counties and bodies must read as they did on the commit before. A one-year run of the played world in the drawn place (`npm run speed:year`, one process) must be no more than 20 percent slower than its base on the same machine. The owner plays it: he notices nothing, and the place search and every screen still name his town the same way.

**Files.** src/core2/place-lookup.ts, src/core2/places.ts, src/core2/place-map.ts, src/core2/data/places/place-map.json, src/core2/data/places/place-lookup.json, src/core2/data/places/localities.json

**Notes.** From the audit's "Duplicate systems" item 8 ("I checked each item below in the code myself"). The audit adds: "The nine files named calendar are not duplicates; each keeps a different calendar." Marked done, still shows: the core-one-map family (core-one-map-reader, core-one-map-lookups, core-one-map-state-readers, core-one-map-state-reads, core-one-map-counties, core-one-map-laws, core-one-map-elections-state, core-one-map-housing-town, core-one-map-last-town-records and others) moved readers onto `place-map.ts` one family at a time and each is done, yet the two older files remain with more importers than the map. Read their Notes for what was moved and the speed records (core-one-map-speed-record, core-one-map-speed-final) before starting. With 212 importers this may not fit one M item: if so, the claimer splits it into bounded parts (the listing first, then the lookup by importer family) and blocks this item on them, as the pool rule for a too-large item says. The importer counts are a regular-expression search on Nov 10 and may be off by a few. Not verified by the audit: whether the three files ever disagree about a place in play; the audit calls them duplicates from reading, and no wrong place on a screen was traced to them.

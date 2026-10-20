---
id: core-stopgap-territory-places-recorded-list
title: "Stopgaps in territory-places (recorded-list): 1 open"
area: core
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/territory-places-census
pr: #5322
blocked-on: research data: the row's replacement needs sourced data (Census 2020 Island Areas place identities (the research request territory-place-identities), read into the same listing. Oct 14 (OPUS-CORE): the candi...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/places/territory-places.json, kind recorded-list"
claimed-at: 2026-10-20T00:10:44.952Z
---

**What.** Replace or clear the 1 open recorded-list stopgap row(s) in src/core2/data/places/territory-places.json: SG-CORE-territory-places. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/places/territory-places.json

**Notes.** First row: The villages of Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana Islands come from the game's existing recorded list (carried over from the old place module), not from Census identities.

Built Oct 20 (claude, claude/territory-places-census): `territory-places.json` is now the Census 2020 Island Areas list (158 villages: key, name, state, alias, Census GEOID, 2020 population). The candidate file and its builder are deleted; place-lookup gives each village its GEOID and an approved provenance; `gov-rules/place-population.ts` reads a village's population from the list; `SG-CORE-territory-places` is resolved. Four villages from 1 to 44,908 people (Gagani, Fagali'i, Hagåtña, Dededo) build and play 30 days. The old engine's own list in `src/simulation/territory-places.ts` is untouched (it goes with the old engine).

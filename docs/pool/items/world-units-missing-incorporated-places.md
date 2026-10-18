---
id: world-units-missing-incorporated-places
title: "Incorporated places missing from the Census government listing have no town government (Manley Hot Springs, Alaska has none of its council seats)"
area: world
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The town's government comes from the Census of Governments 2025 listing, matched to a place by its geoid. Manley Hot Springs, Alaska (geoid 0246780, an incorporated city) has no unit in that listing: Alaska carries 149 municipalities, all with a place geoid, and none is named Manley, so the game gives the town no council or mayor and an 18-year-old there has nothing local to run for. The same may hold for other incorporated places. Count the places the Gazetteer calls incorporated that have no unit, by state, and decide whether the listing is missing them (a data fix from the Census file) or the match is (a name or geoid fix).

**Rules.** Research before building: the Census listing and the Gazetteer decide who exists; no place is named in code. One rule, all 56 places: the check runs over every state. Estimate, never UNKNOWN: a place with no unit is marked as such with its source, not given a guessed government.

**Done when.** A script lists, for each of the 56 places' states, the incorporated places with no government unit, with the listing's row count beside it; the lists for Alaska and one more state are in the PR body by geoid; and a test in src/core2 states that every place the Gazetteer marks incorporated either has a unit or is on a named exception list with its reason.

**Files.** src/core2/reference/government-units.ts, src/core2/gov-rules/local-governments.ts

**Notes.** Found Oct 18 (claude/eligible-on-date) in the headless path check, seed pc6. 8,532 of 32,394 localities have no municipal or township unit (26 percent), most of them census-designated places that really have no government of their own; Alaska has 206 of 355. The Gazetteer rows here carry no incorporation flag (geoid, name, state), so the check needs the Census class code from the Gazetteer file or the listing's own place codes.

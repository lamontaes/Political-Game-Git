---
id: places-government-proper-names-data
title: "Every government has a proper name on record: 122 listed names that miss their place record, and 107 townships"
area: gov
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: "Words builder W2, Nov 13, at Fable A's word on #8928 after #9000"
---

**What.** Since #9000 a government's name is its place record's proper name ("City of McCall", "DeKalb County"). Where the record holds no matching name, the listing's capitals are said by the display rule, and some come out wrong. 122 of 22,513 governments that have a place record miss it: "CITY OF REDWOOD" is Redwood City on its record, so the game says "City of Redwood", and "CITY OF SAINT PAUL" says "City of Saint Paul" where the record has St. Paul, Alaska. The 16,184 townships have no place record at all. 107 of them hold a Mc, Mac, De, La or O name the rule cannot get right ("Township of Mcclellan"). Evidence: `docs/seen/w2-government-names/no-proper-name.md` (every row, with unit id, place id, the listing and the record). Seen: Politics, Budgets, the paper and Play as for any of these places.

**Cause.** Found in code: the government-units listing (`src/core2/reference/government-units.ts`, `name`) is in capitals only. For the 122, its last words do not match the place record's name (`corePlaceByKey(...).displayName`). Townships carry no `placeGeoid`, so `governmentProperName` (`src/core2/government-proper-name.ts`) has no record to read.

**Fix.** Give each of these a proper name in data, read by the one reader:
- For the 122, add a small override table keyed by unit id: the name as the government writes it ("Redwood City", "City of St. Paul").
- For the 107 townships, add the township's own name.
- `governmentProperName` reads the table before its letter match, so no code names a place.
- Source each row from the government's own site or the state's directory, and tag it SOURCED with its URL.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: no place is named in code, every name lives in data. One reader for every government (Fable A, Nov 13). Research before building: each name from a page actually read.

**Done when.** A second session runs `governmentWithoutProperName` over every listed government and gets 0 municipalities with a place record. The 107 townships are named, each with its source. Opening Politics in a new life at `placeKey=0660102` shows "Redwood City Council".

**Waits on.** #9000.

**Files.** src/core2/government-proper-name.ts, src/core2/data/places/ (a new override table)

**Notes.** Filed Nov 13 by Words builder W2.

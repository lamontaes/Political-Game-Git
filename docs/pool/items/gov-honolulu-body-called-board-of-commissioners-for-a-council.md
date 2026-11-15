---
id: gov-honolulu-body-called-board-of-commissioners-for-a-council
title: "A city-and-county body with a Council shows as a Board of Commissioners on the bill, while its members are called Council members"
area: gov
kind: bug
priority: 3
size: S
status: in-pr
claimed-by:
pr: 9404
blocked-on:
standard: 2
model: sonnet
effort: low
lead: governing
root: none
source: Account lead cluster 11 play walk, Nov 14 (Pearl City, Hawaii, seed 28098917-e63b-4362-bc91-939537321d7e: the bill paper reads "City and County of Honolulu Board of Commissioners")
claimed-at:
after:
checked:
---

**What.** The bill paper names the body "City and County of Honolulu Board of Commissioners" while the player who sits on it is a Council member, so one body has two names. Search first: gov-body-named-by-member-title and gov-county-board-follows-each-states-real-form-and-seats may hold the fix; if they do, add this evidence there and close this item. Seen: the bill paper's banner and the Where it is box in the Your office tab.

**Cause.** Found in code: `countyGoverningBodyRules` (src/core2/gov-rules/county-governing-body-rules.ts) read a body name only for the 12 states whose size is read, and for every other state, and for a read state whose size was unreadable, it fell back to the national average name "Board of Commissioners". Hawaii has no size row, so its council took the average name. Read first: where `governmentProperName` and the body's display name take the county-board kind (`localPlaceOf` in src/core2/modules/legislature.ts) against the place's own record of its governing body's name.

**Fix.** A `usualNames` block in data/research/local-government/county-governing-bodies.json (ESTIMATED, spread stated) gives the usual body name and member title for each of the 35 states with county government and no reading; the rules resolve a name as the county's own named body, then its state's reading, then the state's usual name, then the national average. A test walks every county in every state and territory.

**Time box.** 2 hours for one Sonnet session to find the cause and write it here. When it runs out, write what was read and stop.

**Rules.** One place facts live in data; never name a state or city in logic.

**Done when.** A second session, in a played world in a place and seed nobody chose, reads the same screens and sees one wording on all of them.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/bench/legislature.ts

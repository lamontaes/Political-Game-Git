---
id: gov-honolulu-body-called-board-of-commissioners-for-a-council
title: "A city-and-county body with a Council shows as a Board of Commissioners on the bill, while its members are called Council members"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
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

**Cause.** Needs cause. Read first: where `governmentProperName` and the body's display name take the county-board kind (`localPlaceOf` in src/core2/modules/legislature.ts) against the place's own record of its governing body's name.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session to find the cause and write it here. When it runs out, write what was read and stop.

**Rules.** One place facts live in data; never name a state or city in logic.

**Done when.** A second session, in a played world in a place and seed nobody chose, reads the same screens and sees one wording on all of them.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/bench/legislature.ts

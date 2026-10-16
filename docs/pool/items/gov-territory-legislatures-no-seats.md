---
id: gov-territory-legislatures-no-seats
title: "Guam, American Samoa, the Northern Marianas and the Virgin Islands open with legislatures that have no seats, so no cabinet is confirmed"
area: gov
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/executive-test-governor-held
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T21:39:10.422Z
---

**What.** Guam, American Samoa, the Northern Mariana Islands and the Virgin Islands open with a legislature office that has no seats and no members. `data/research/offices/legislature-party-counts-2026.json` has no rows for those four (Puerto Rico and the District of Columbia have theirs), and the Census district geography lists none for them, so `legislatureOffices` in `src/core2/offices-state.ts` builds each body with `seats: 0`. Nothing can then be confirmed by it (a governor's cabinet nominees get 0 yes against 0 no, so no post is filled; `src/core2/executive.test.ts` found it in Inarajan, Guam, seed 5d6286f1c46181ee54d6d1e03422c9e84f769509ad1be71be7f479f60d7a7c2c), no bill is introduced there, and the territory has no legislators for the world to read. Add each body's real roster (Guam: 15 at-large senators; American Samoa: 18 senators and 21 representatives; Northern Mariana Islands: 9 senators and 20 representatives; Virgin Islands: 15 at-large senators) with party or independent labels and a citation, in the same file and shape as Puerto Rico's, so the seats exist and are elected by the territory as a whole.

**Rules.** Research before building: members and parties are SOURCED from the territories' legislatures with citations, never invented. One rule, all 56 places: no territory named in logic, the data carries it. An effect is a read: the cabinet confirmation and the legislature engine read the seated members.

**Done when.** In a one-year run of the played world (buildBenchWorld) in each of the four territories (the places and seeds named in the PR body) the legislature has its real number of seats with members, a governor's cabinet nominees are confirmed or rejected by those members, and the executive test passes with the confirmable check removed.

**Files.** data/research/offices/legislature-party-counts-2026.json, src/core2/offices-state.ts, src/core2/executive.test.ts

**Notes.** Found by running all of src/core2 on main (Oct 16). The executive test now expects a cabinet only where the legislature has members and names this item; remove that condition when the four bodies are seated.

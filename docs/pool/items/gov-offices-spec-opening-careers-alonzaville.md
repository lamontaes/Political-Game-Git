---
id: gov-offices-spec-opening-careers-alonzaville
title: "Offices spec M2-01 fails in Alonzaville, Virginia: no seat holder at the opening has an earlier term or a term that began before it"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Fable, Nov 10, 2026, from the golden-path run on pull request 8114 (job 129673752621), reproduced on clean main
---

**What.** The accepted golden-path step M2-01 (`npx vitest run src/core2/offices.test.ts`) fails in Alonzaville, Virginia, place key 5101416, seed a71d8801349f11cab987e8af7e075c95c260bd0200384ee8a1d9569ca5012e70. The failing test is 'holders at the opening have careers of real length: terms begin before it and earlier terms are on the record', with 'AssertionError: 5101416: expected 0 to be greater than 0'. That message comes from one of the two counts near the end of the test (src/core2/offices.test.ts, about lines 229 and 230): `before`, the serving terms that began before the opening, or `withPast`, the serving holders with at least one earlier term on the record; in this place one of them is zero. The other five tests in the file pass there. The golden-path runner draws each step's place from the commit, so any pull request can draw this place and read as a regression (verdict 'Golden path: REGRESSION'). Reproduced on clean main at b5de07d397 on Nov 10 with: GOLDEN_PATH_SEED=a71d8801349f11cab987e8af7e075c95c260bd0200384ee8a1d9569ca5012e70 GOLDEN_PATH_PLACE_KEY=5101416 npx vitest run src/core2/offices.test.ts --testTimeout=300000.

**Rules.** Red main comes first (owner, Oct 15). One rule, all 56 places: the fix is in how every place's sitting holders get their careers at the opening, never a special case for this place. Estimate, never unknown: a holder a player can open has a career on the record.

**Done when.** The command above passes on main. The same test passes in three more drawn places named with their seeds, one of them an unincorporated place of under 500 people in a county with few seats. A second session opens the card of a sitting holder in Alonzaville, Virginia in the running game and reads a term that began before the game's start, with its record opening in dev mode's Trace.

**Files.** src/core2/offices.test.ts, src/core2/modules/offices.ts, src/core2/opening-officials.ts

**Notes.** The same test failed for a different reason in Vivian, West Virginia on Oct 24 (item gov-offices-spec-opening-careers-vivian, done in #5910: a minimum-age edge). Not checked: which of the two counts is zero here, and how many seats cover Alonzaville. Skill red-main says how to take it from here.

---
id: gov-offices-spec-opening-careers-alonzaville
title: "518 places have no district on record, so no U.S. House or legislative seat covers the town (the offices step fails in Alonzaville, Virginia)"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/pool-gov-offices-spec-opening-careers-alonzaville
pr: #8533
blocked-on:
lead: cto
standard: 2
model: opus
effort: medium
root: rc9-place-facts-one-default
source: Fable, Nov 10, 2026, from the golden-path run on pull request 8114 (job 129673752621), reproduced on clean main
after:
checked: fable 2026-11-10
merged-at:
claimed-at: 2026-11-11T03:38:11.022Z
branch: claude/pool-gov-offices-spec-opening-careers-alonzaville
---

**What.** The accepted golden-path step M2-01 (`npx vitest run src/core2/offices.test.ts`) fails in Alonzaville, Virginia, place key 5101416, seed a71d8801349f11cab987e8af7e075c95c260bd0200384ee8a1d9569ca5012e70. The failing test is 'holders at the opening have careers of real length: terms begin before it and earlier terms are on the record', with 'AssertionError: 5101416: expected 0 to be greater than 0'. That message comes from one of the two counts near the end of the test (src/core2/offices.test.ts, about lines 229 and 230): `before`, the serving terms that began before the opening, or `withPast`, the serving holders with at least one earlier term on the record; in this place one of them is zero. The other five tests in the file pass there. The golden-path runner draws each step's place from the commit, so any pull request can draw this place and read as a regression (verdict 'Golden path: REGRESSION'). Reproduced on clean main at b5de07d397 on Nov 10 with: GOLDEN_PATH_SEED=a71d8801349f11cab987e8af7e075c95c260bd0200384ee8a1d9569ca5012e70 GOLDEN_PATH_PLACE_KEY=5101416 npx vitest run src/core2/offices.test.ts --testTimeout=300000.

**Cause.** Measured: `GOLDEN_PATH_SEED=a71d8801349f11cab987e8af7e075c95c260bd0200384ee8a1d9569ca5012e70 GOLDEN_PATH_PLACE_KEY=5101416 npx vitest run src/core2/offices.test.ts --testTimeout=300000` still fails on main e15e039586 (Nov 10; Alonzaville, Virginia). The zero count is `withPast`. Only seven seats cover the town: the President, the Vice President, two U.S. senators, the Governor, the Lieutenant Governor and the Attorney General. The two senators are both in a first term and the three state officers took office that week, so none has an earlier term. No U.S. House seat, no state Senate seat and no House of Delegates seat covers the town. Found in code: `townDistrict` in src/core2/offices-state.ts (line 199) returns nothing when `placeDistrictJoin` in src/districts/place-membership.ts (line 182) answers `unknown`, and then every district seat is written with `coversTown` false (offices-state.ts line 522 for the U.S. House). The join is compiled from the Census files that relate districts to the 2020 list of places; the game's places are the 2025 Gazetteer's (src/core2/data/places/localities.json). Measured over every place of the game: 518 of 32,508 are in no chamber's file, 280 of them in Indiana, 116 in Pennsylvania, 32 in Virginia and 19 in Guam. The same gap for counties was closed with src/core2/data/places/place-county-by-point.json, which gives Alonzaville its county (51171).

**Fix.** Give every place the join does not know an estimated district in each chamber, from data the game already holds. In the compile step that writes src/districts/place-membership.generated.json, for each such place take the places of its own county (place-county-by-point.json) that the join does know, and in each chamber record the district that holds the most of their people, tagged as an estimate with its source. `placeDistrictJoin` answers with it as a new kind, `estimated`, and `townDistrict` reads that kind the way it reads a whole place. Register one stopgap in src/core2/data/stopgaps/office.json saying the district is taken from the county's other places until each place is assigned by its own point against the district lines. Add a check to src/core2/offices.test.ts that draws a place from the 518 and reads a U.S. House seat covering it and, where its state elects its chambers by district, one seat of each. Leave the careers test as it is.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Red main comes first (owner, Oct 15). One rule, all 56 places: the fix is one rule for every place the join does not know, never a row typed for this place. Estimate, never UNKNOWN: a district a player can see is an estimate with its source, never missing. Every shortcut is a registered stopgap. Follow .agents/skills/researcher/SKILL.md for the estimate's tag and source.

**Done when.** The command above passes on main. The new check passes in three drawn places from the 518, named with their seeds, one of them in Indiana or Pennsylvania. A second session starts the game in Alonzaville, Virginia, opens the Politics screen and reads a U.S. representative, a state senator and a delegate for the town, each marked as an estimate in dev mode's Trace, and opens one holder's card to a term that began before the game's start.

**Waits on.** Nothing.

**Files.** src/core2/offices.test.ts, src/core2/offices-state.ts, src/districts/place-membership.ts, src/districts/place-membership.generated.json, src/core2/data/places/place-county-by-point.json, src/core2/data/stopgaps/office.json

**Notes.** The same test failed for a different reason in Vivian, West Virginia on Oct 24 (item gov-offices-spec-opening-careers-vivian, done in #5910: a minimum-age edge). Not checked: which of the two counts is zero here, and how many seats cover Alonzaville. Skill red-main says how to take it from here.

**Notes (Fable, Nov 10, how it was found).** A probe printed every serving term with the seats that cover the town, then `placeDistrictJoin` for this place and two other Virginia places in each chamber (this one answered `unknown` three times), then counted the same answer over every place of the game. What a player in one of the 518 places meets today: no congressman and no state legislators on the Politics screen, and no legislative race to file for. The play-first item play-stop-05-politics-lists-wrong-officials reads the same seats.

Not seen in the game (2026-11-11, second-session-2): Alonzaville, Virginia (place key 5101416), seed a71d8801349f11cab987e8af7e075c95c260bd0200384ee8a1d9569ca5012e70, main 67947ae8: offices.test.ts on the named place and seed still fails at line 230: 5101416 expected 0 to be greater than 0, no holder with an earlier term on record

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:38 UTC) on branch claude/pool-gov-offices-spec-opening-careers-alonzaville.

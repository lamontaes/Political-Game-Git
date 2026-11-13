---
id: release-main-red-hold-scenes-federal-holds
title: "The hold-scenes check takes a place whose only held bills are in Congress, whose chairs nobody here follows"
area: release
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/red-main-hold-scenes-chair
pr:
after:
blocked-on:
lead: words
model: opus
effort: low
root: none
source: Red desk, Nov 13 (Fable A on #8928, comment 6842448463)
---

**What.** `src/director/hold-scenes.test.ts` fails on clean main at GOLDEN_PATH_SEED=07dadfc81a04b1923d9ea056b67cde5952921ea0 in Pine Hills, Florida (1256825), on its first draw: "no chair was asked for a hearing: expected 0 to be greater than 0". All four bills held in that world's 90 days are U.S. House and Senate bills, whose chairs are members of Congress from other states. Seen: a council, county board or legislature chair asked for a hearing by the sponsor of the bill it holds.

**Cause.** Found in code: the check watches only the members of the town's city, county and state bodies (`director.watch`), but takes any `bill-held-in-committee` record as the place's hold, and the legislature engine records Congress's holds too (src/core2/modules/legislature.ts, with the bill's `level`). A place whose only holds are federal counted as found, and no watched chair could be asked.

**Fix.** Test only: the check takes the holds of the bodies it watches (the record's `level` among city, county and state), and a place with none is passed over by name with the levels it did hold, as a place with no hold already was. Every assertion is unchanged.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: the check keeps drawing places and names each one passed over. No assertion is loosened; the check reads what the director in that world follows.

**Done when.** A second session runs hold-scenes.test.ts on main at GOLDEN_PATH_SEED=07dadfc81a04b1923d9ea056b67cde5952921ea0 and at a fresh seed, each naming its drawn place, and the chair and member scenes are both found and composed.

**Waits on.** Nothing.

**Files.** src/director/hold-scenes.test.ts

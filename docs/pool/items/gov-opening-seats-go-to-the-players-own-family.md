---
id: gov-opening-seats-go-to-the-players-own-family
title: "A new life's parents, brothers and sisters hold the town's elected seats, because the opening seats are filled only from the few full people"
area: gov
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/gov-opening-seats-weigh-counted-adults
pr: #8827
after:
blocked-on:
lead: governing
model: opus
effort: high
root: design-one-model-two-tiers
source: lead's play walks and reviews on Nov 11, 2026 (the first Journal note of three new lives), then the code
checked:
claimed-at: 2026-11-11T14:44:38.322Z
merged-at: 2026-11-11T15:27:20.105Z
---

**What.** In a new life the player is 18 and their family runs the town. Three lives read on Nov 11, each on the first screen: Tatum, South Carolina (seed w8-q), "My father Jerry is a commissioner at the County of Marlboro. My brother Jeremiah is a commissioner at the County of Marlboro. My brother Ezra works at the Town of Tatum as a fire chief."; Athens, Michigan (seed f8aee52b-7aa0-45a2-a3f7-6820913dd30f), mother a county commissioner, father a council member, brother the chief administrative officer; Woonsocket, Rhode Island (seed w8-f), mother a council member, sister the fire chief. A town of thousands of adults has a handful of seats; one household holding two or three of them in every life is the simulation's doing, not the town's. Every scene and talk at home treats the player as an official's child today. Seen: the first Journal note, the People screen and Politics' Government tab, where the members of the town's bodies stop being the player's own household.

**Cause.** Found in code: the player is picked first, from the whole generated town (`entrantBornNear` in src/bench/world.ts, line 201), and only then is the town cut down to full people: the player's family and circle (`fullPeople` in src/core2/residents.ts, line 245), about eight sampled households (`representativeSample` in src/core2/representative-sample.ts) and public workers' households. The opening then seats every elected local office from full people alone: `suitedResidents` in src/core2/modules/offices.ts (line 425) reads `api.state.people`, keeps residents aged 25 to 80, leaves out only the player (line 446), and ranks by three traits; the loop at line 733 gives the seats to the top of that list. The player's parents and grown brothers and sisters are a large share of those few adults, so they win seats in life after life. The town's counted adults are never weighed, though they carry the same traits (`countedResidents`, as `countedPool` in src/core2/modules/staff.ts, line 564, already reads them for staff posts). The department heads have the same fault and their own item, gov-appointments-weigh-counted-adults.

**Fix.**

1. **One reader of who could hold a town post.** In src/core2/modules/offices.ts, `suitedResidents` weighs the town's counted adults beside its full people by the same three traits and the same age bounds, reading `countedResidents` once at the opening. It returns the best suited in order, each marked full or counted.
2. **Fill in only the ones seated.** A counted adult who takes a seat is filled in with `fillInPerson` (src/core2/state.ts, line 2309) before `seatResident` runs, so their job, pay and household match what the records already say. Nobody else is filled in.
3. **No rule about the player's family.** The family is weighed like anyone else and holds a seat only when it ranks at the top of the whole town. Do not add a line that leaves relatives out: that would be a typed exception, and a real official's child is a life worth playing when the town's own numbers give it.
4. **The department heads read the same list.** When gov-appointments-weigh-counted-adults is built, `townPostInput` in src/core2/modules/executive.ts calls this reader for its counted candidates in place of its three drawn adults. If that item is built first, this one calls its reader. One reader, not two.
5. **Not daily.** The counted adults are read once, at the opening, and at a vacancy filled without an election. Nothing scans them on an ordinary day.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One model, two tiers (owner, Oct 14): a rule that applies only to full people is an unregistered placeholder, and who may hold a seat is such a rule today. Two-level population (owner, Oct 11): a filled-in person must match what the records already say. No dice: the seat goes to the best suited by traits, over the whole town, never by a draw. One rule, all 56 places: the checks draw their places and name them with their seeds. Speed (owner, Oct 29): the counted adults are read at the opening and at a vacancy, never every day; `npm run speed:year` holds its bar.

**Done when.** A second session, in the running game on main at 1440x900, starts ten new lives in drawn places it writes down with their seeds and reads the first Journal note and Politics' Government tab in each. In at most one of the ten does anyone in the player's household hold an elected local seat, and in none do two. Each seated official it opens has a card whose job, home and household agree with the town's records. A test in src/core2/modules draws ten places, opens each world and checks the same count, naming every place and seed it passed over. `npm run speed:year` on the same base and machine shows no year more than 20% slower.

**Waits on.** Nothing. Related: gov-appointments-weigh-counted-adults (the department heads; the same reader).

**Files.** src/core2/modules/offices.ts, src/core2/modules/executive.ts, src/core2/modules/staff.ts, src/core2/state.ts, src/core2/modules/offices-opening-seats.test.ts (new)

**Notes.** Written by the lead (Fable B), Nov 11, 10:50 UTC. The three lives above are the pictures in docs/seen/words-first-journal-note/ on pull request #8772; the code was read on main the same hour. Not yet measured: how many of a town's opening seats go to the player's household over many drawn places. The builder counts that first, over ten drawn places on main, and writes the numbers here before changing anything.

Counted on main by opus-5251, Nov 11, before any change. `src/core2/modules/offices-opening-seats.test.ts` (new, on branch claude/gov-opening-seats-weigh-counted-adults) was run with seed os1, ten drawn places, counting the elected local seats at the opening held by the player's household. Three of the ten held one or more: Gay, Georgia (1332384), seed os1:0, held 2 of 19; Cameron, Missouri (2910828), seed os1:5, held 1 of 15; Beallsville, Pennsylvania (4204568), seed os1:8, held 1 of 18. The other seven held none: Upper Santan Village, Arizona (0 of 11), Fagatogo, American Samoa (no local seats), West Mountain, Connecticut (0 of 3), Jane, Missouri (0 of 15), Rader Creek, Montana (0 of 8), Doral, Florida (0 of 17) and Charlestown, Rhode Island (0 of 5).

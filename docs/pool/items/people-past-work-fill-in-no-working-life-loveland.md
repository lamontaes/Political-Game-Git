---
id: people-past-work-fill-in-no-working-life-loveland
title: "Someone filled in from a nearby place with no recorded business gets no working life (Loveland, Oklahoma: 12 of 12)"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: none
source: found by the cause finder for Fable B, Nov 11, 2026, tracing past-work-journal-line-missing-ozan
---

**What.** src/core2/past-work.test.ts fails on main in Loveland, Oklahoma (place key 4044150, seed a84391cf323ac74a002a45066fab4e883fed5292af3c540a1aa262c2a577a60f) in 'gives someone filled in from the counts their working life too': "12 filled in: expected 0 to be greater than 0". Twelve adults of working age are filled in from the counts and not one has a working life on record. Seen: the past of a person the player meets from a nearby place, which tells no job they ever held.

**Cause.** Found in code: `runPastWork` in src/core2/past-work.ts (about line 538) skips anyone whose day-one place has no business on record (`if (!places.has(person.placeId)) continue;`), before the branch at about line 616 that already handles such a person ("Someone whose town has no business on record ... worked where the records do not reach: no employer is named"). Measured: `node --import tsx` with a probe outside the repository, the same world on main 061eda78. The counted households number 218, holding 430 people and 182 adults aged 30 to 59. The first 12 the test fills in live in jurisdiction_11eee12d9a148471 and jurisdiction_ba39178906cdb474, other places in the county with no business of their own. Each gets a regional job on filling in (for example job:commuter:person_37b3e0cbef798621:2025-01-21), and `pastWorkFor` (line 1052) then gives them no spell. The stopgap SG-HIST-past-work-day-one-town (src/core2/data/stopgaps/hist.json) says a spell where the world keeps no employer runs "with no employer named", and officials living outside the town are not run. The code skips everyone in such a place, not only officials.

**Fix.** In `runPastWork` (src/core2/past-work.ts), narrow the skip at about line 538 to what the stopgap says: skip a person only when they hold no job in the played county (an official living elsewhere). A resident of another place in the county, whose day-one job is regional, runs as anyone does, and the branch at line 616 names no employer for the spells. Keep the full people's pre-start run the same for everyone the skip let through before. Run src/core2/past-work.test.ts in Loveland with the seed above and in two fresh drawn places. Keep the stopgap's text true, and update it if the officials' part changes.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Two-level population: a person filled in from the counts gets the past the run would have given them. No dice. One rule, all 56 places: no place is named in logic. Never weaken a test.

**Done when.** A second session replays the test src/core2/past-work.test.ts in Loveland, Oklahoma with the seed and place key above and in two fresh drawn places named with their seeds, and all six checks pass in each. In Loveland at least one of the twelve people filled in has a working-life record by id.

**Waits on.** Nothing.

**Files.** src/core2/past-work.ts, src/core2/past-work.test.ts, src/core2/data/stopgaps/hist.json

**Notes.** Nov 11 (cause finder for Fable B): found while checking fresh draws for past-work-journal-line-missing-ozan; replayed twice with the seed and place key. The test draws a new place each run unless both GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are set.

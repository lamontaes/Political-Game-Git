---
id: world-school-count-drops-a-met-husk-student
title: "A counted student in a nearby place stops being a student the moment they are filled in, because they become an inactive husk"
area: world
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Red desk, Nov 13 (Account lead T5 on #8928, comment 6848663002)
---

**What.** `src/core2/school-outcomes.test.ts` "a household whose income besides job pay sets its income fifth keeps that fifth and web factor when a student in it is met" fails on clean main (99540b89 and 48296b91) at SCHOOL_SEED=ed416411a7d5e66e (Guthrie, Texas, 4831640) and SCHOOL_SEED=aee954526ae660a6 (Steinauer, Nebraska): `person_db743fde45b1b763 filled in: expected undefined to be true`. In Guthrie the student found is a grade-12 senior (born December 2, 2007) in a counted household of a nearby counted place, `jurisdiction_d7ada046f68e037b`, not the player's town (`jurisdiction_e3f17adfb421ba03`). Before the fill-in `studentsByPlace` reads them as a counted student; after `fillInPerson` the same person (same place, household and birth date, alive) has tier `husk` and is a student in no grade. Guards: the one-model rule for schools, that filling a person in does not change who the school counts.

**Cause.** Found in code: `studentsByPlace` in src/core2/school-outcomes.ts skips every full person whose tier's cadence is `inactive` (`husk`, `newborn`), while its counted reader takes every counted household of every counted place; a person filled in outside the played town keeps the opening kin tier `husk` (src/core2/data/opening-kin.json `kinTier`, src/core2/population.ts), so filling them in moves them from the counted students to none. src/core2/modules/school.ts and src/core2/modules/jobs.ts filter inactive tiers the same way.

**Fix.** One rule for both tiers: either a filled-in person of a counted place takes an active tier (the place is in the played area), or the school reader reads a husk student of a counted place as it read them counted. Decide with the lives skill's husk rules (kept minimal until met; met here means filled in), and check the jobs reader that filters the same tiers.

**Time box.** 3 hours

**Rules.** One model, two tiers: a counted student and the same student filled in are read by the same rule, so a count never changes when someone is met; no assertion is loosened.

**Done when.** A second session runs school-outcomes.test.ts on main at SCHOOL_SEED=ed416411a7d5e66e and SCHOOL_SEED=aee954526ae660a6 and at a fresh seed, each naming its drawn place, and all four cases pass, the "keeps that fifth" case naming the student's place and tier after the fill-in.

**Waits on.** Nothing.

**Files.** src/core2/school-outcomes.ts, src/core2/state.ts

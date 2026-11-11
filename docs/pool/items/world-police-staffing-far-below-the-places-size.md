---
id: world-police-staffing-far-below-the-places-size
title: "A place's police department is one or two officers whatever its size, so anything read from police staffing is far too low"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: found Nov 10 by the builder of the patrol-hours record (pull request #8230)
checked: fable 2026-11-10
---

**What.** The new patrol-hours record adds up the paid hours of everyone on a place's police line. In Washington, D.C. that is one officer and 173.8 hours a month; in Myrtle Creek, Oregon it is two officers. Counted groups hold no police jobs at all. So patrol hours, arrests and anything else read from police staffing say a city of hundreds of thousands has one officer. The department should stand for the place's real force, the way a counted household stands for many.

**Cause.** Found in code: the opening sizes the school district from the town's people but leaves every other department at the one worker the town generator records. Measured on main d64255aa with `buildBenchWorld` at the opening, drawn with `drawPlace(<seed>, "police-staffing")`: Poultney, Vermont (5056800, seed pol-a, about 1,000 people), District Heights, Maryland (2423025, seed pol-b, about 5,900) and Hamlin, West Virginia (5434516, seed pol-c, about 900). Each town's `service:police` organization holds exactly one full job and no counted staff (`countedHeadcountOf` 0), whatever the town's size. Fire, municipal government and public health are the same (0 to 3 full jobs, no counted staff). The town's `service:school` district has 11, 51 and 10 counted teachers, because `withPublicSchoolDistrict` in src/core2/opening-public-schools.ts sizes it: school-age children times the public share, over the pupil-teacher ratio, taken from the workers the opening could not place, each job copying a recorded teacher's. Nothing does the same for police. The rate to size it from is already sourced: each state's sworn officers per 1,000 people (FBI 2024 Police Employee Data) in data/research/outcome-web/place-outcome-bases-2024.json, which the outcome web reads (data/research/outcome-web/links.json).

**Fix.** Add `withPoliceDepartmentStaff` beside src/core2/opening-public-schools.ts, built the same way and called right after it in src/bench/world.ts (line 394) and src/core2/tooling/generated-world.ts (line 61). For the town's `service:police` organization, set its officers to the town's people times its state's sworn officers per 1,000 (place-outcome-bases-2024.json), less the recorded officer. Take them from the opening's unplaced workers in seeded order, as counted jobs at the department, each copying the recorded officer's job (occupation, pay and hours), so they are paid on the department's public pay authority. Record the receipt (officers, rate and source) as the school district's receipt does. At Census size the counted jobs carry their household's weight like any counted job, so no extra full people are made. Register a stopgap for fire, public works and public health, which keep one worker until they get the same step, and file one item for them.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count; police staffing is no exception. This is a game: no more full people, counts only. Estimate, never UNKNOWN: the real officer rate checks the total and never sets one person's job. One rule, all 56 places.

**Done when.** A second session builds three drawn places of very different size (places and seeds named) and sees each police department's staff (full plus counted heads) within a tenth of the town's people times its state's officers per 1,000, with the receipt citing the FBI figure; no new full people exist. After world-police-patrol-and-grievance-causes-part-1-patrol-hours merges, the place's patrol-hours row follows that staff.

**Waits on.** Nothing to find the cause. The fix should land after world-police-patrol-and-grievance-causes-part-1-patrol-hours (pull request #8230), which adds the row that shows it.

**Files.** src/core2/opening-public-schools.ts, src/core2/opening-police-staff.ts (new), data/research/outcome-web/place-outcome-bases-2024.json, src/bench/world.ts, src/core2/tooling/generated-world.ts, src/core2/data/stopgaps/gov.json

**Notes.** Nov 11 (cause finder for Fable B): measured on main d64255aa in three drawn places with a probe outside the repository. Every department but the school district opens with the town generator's one worker; the school district alone is sized by an opening step, and police needs the same step.

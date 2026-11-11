---
id: macro-country-jobs-over-workers-mid-cycle-start
title: "A world opened on 2026-10-20 stops in its first months: the country tier holds more jobs than workers in Connecticut"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: 
blocked-on:
lead: money
model: opus
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** A bench world built in Willimantic, Connecticut (place key 0985810) on 2026-10-20 stopped while playing toward January 2027 with 'The country tier holds counts that cannot be: US-CT: 1748533.3121603252 jobs for 1747740.3194989176 workers' (src/core2/modules/macro.ts line 476, runMonth). Seen by the recount test (src/core2/recounts.test.ts at its first version, seed rc01, place seed from drawPlace('rc01','recounts:0')), which started the world two weeks before an election; a world opened on the game's own start date was not tried. Seen: the played world keeps running past its first months in a place drawn from all 56.

**Cause.** Needs cause. Looked at: only the thrown message and its line (macro.ts 476, countryProblems). Not traced: which month's job or worker movement pushes the state's jobs over its workers, and whether a start date other than gameStartDate matters.

**Fix.** None until the cause is found.

**Time box.** 3 hours

**Rules.** Ask why: name the month and the job and worker records that move Connecticut's counts past each other in that played world. One rule, all 56 places: the fix holds for every state's tier, never a named one.

**Done when.** A second session builds the bench world for Willimantic, Connecticut on 2026-10-20 with the place seed above, plays it to 2027-01-31 without the error, and plays two fresh drawn places the same way, naming each place and seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/macro.ts

**Notes (opus-5234, Nov 11).** Not tied to a mid-cycle start: a bench world opened on the game's own start date in Carroll, Nebraska (place key 3108010, place seed from drawPlace("lr01", "law-repeal-restores-silence")) stopped the same way in its first months, "The country tier holds counts that cannot be: US-NE: 952874.9748205602 jobs for 952873.9505938026 workers" (src/core2/law-repeal-restores-silence.test.ts at its first version, which played toward 2026). The excess is about one job in both places, so it may be a rounding of the tier's counts.

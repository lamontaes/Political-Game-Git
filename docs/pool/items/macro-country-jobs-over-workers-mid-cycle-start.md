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
after: world-census-scale-foundings-above-sample
blocked-on:
lead: money
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** A bench world built in Willimantic, Connecticut (place key 0985810) on 2026-10-20 stopped while playing toward January 2027 with 'The country tier holds counts that cannot be: US-CT: 1748533.3121603252 jobs for 1747740.3194989176 workers' (src/core2/modules/macro.ts line 476, runMonth). Seen by the recount test (src/core2/recounts.test.ts at its first version, seed rc01, place seed from drawPlace('rc01','recounts:0')), which started the world two weeks before an election; a world opened on the game's own start date was not tried. Seen: the played world keeps running past its first months in a place drawn from all 56.

**Cause.** Found in code: two faults meet. (1) The state's tier needs its jobs to equal its workers (`countryProblems`, src/core2/country-model.ts, slack one in a million), and `resolveCountryPart` (same file, about line 1121) caps each age band's workers at its people but leaves the jobs as counted. So any month in which the played places count more workers than people in a band brings in more jobs than workers, and `runMonth` (src/core2/modules/macro.ts line 476) throws. (2) The played places' counted workers outgrow their people because `startRegionalWork` (src/core2/modules/residents.ts, about line 3736) adds the household's weight to the per-record field `unplacedWorkers`, which `residentsPart` multiplies by the weight again; see world-census-scale-foundings-above-sample. Measured: `node --import tsx` with a probe outside the repository, Malaeloa/Ituau, American Samoa (`drawPlace("0ca4bee1b70dbf0c", "firearm-homicide-web")`), on main 986f946b. With about 1,440 adults all along, the town's counted workers were 657, 821, 995 and then 1,151 on 2025-04-20, and its households' `unplacedWorkers` 524, 679, 855 and then 1,010. On 2025-04-20 the bands 30 to 44 and 45 to 64 held 382 and 548 workers for 359 and 527 people, and the next month threw "US-AS: 22067.16 jobs for 22021.98 workers". The same throw stops Dandan, Northern Mariana Islands (`drawPlace("2afa0aac1a945a4e", "firearm-homicide-web")`, "US-MP: 25534.82 jobs for 25359.56 workers"). A territory is all one state, so the town is a large share of it and the throw comes in months. In a state the town's overshoot is small (about one job in Connecticut and Nebraska), but it is the same mismatch.

**Fix.** (1) Build world-census-scale-foundings-above-sample first: it keeps `unplacedWorkers` per record, which stops the runaway. (2) In `resolveCountryPart` (src/core2/country-model.ts), when a band's workers are capped at its people, take the same number of jobs off the part, from its sectors in proportion, so the part's jobs always equal its workers. Then no count of the played places, right or wrong, can break the tier's identity. Print the capped amount each month (a stopgap row if it is above zero), so an overshoot stays visible instead of being hidden. Add a test in src/core2/country-model.test.ts: a part with more workers than people in a band resolves to equal jobs and workers.

**Time box.** 2 hours for one Sonnet session after the foundings item lands. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: name the month and the job and worker records that move Connecticut's counts past each other in that played world. One rule, all 56 places: the fix holds for every state's tier, never a named one.

**Done when.** A second session builds the bench world for Willimantic, Connecticut on 2026-10-20 with the place seed above, plays it to 2027-01-31 without the error, and plays Malaeloa/Ituau, American Samoa and one more drawn place for six months the same way, naming each place and seed. The printed capped amount stays at zero after the foundings fix, and the new country-model test passes.

**Waits on.** world-census-scale-foundings-above-sample (the unit of `unplacedWorkers`).

**Files.** src/core2/country-model.ts, src/core2/country-model.test.ts, src/core2/modules/macro.ts, src/core2/modules/residents.ts

**Notes (opus-5234, Nov 11).** Not tied to a mid-cycle start: a bench world opened on the game's own start date in Carroll, Nebraska (place key 3108010, place seed from drawPlace("lr01", "law-repeal-restores-silence")) stopped the same way in its first months, "The country tier holds counts that cannot be: US-NE: 952874.9748205602 jobs for 952873.9505938026 workers" (src/core2/law-repeal-restores-silence.test.ts at its first version, which played toward 2026). The excess is about one job in both places, so it may be a rounding of the tier's counts.

Nov 11 (cause finder for Fable B): reproduced in two territories through src/core2/death-cause-firearm-homicide.test.ts, which now stops on this error, and followed the town's workers and people month by month with a probe outside the repository. The town's counted workers outgrow its people (the regional-work unit error), and the state's part caps the workers but not the jobs, so the tier's check throws. The fix makes the part keep jobs equal to workers and leaves the unit error to its own item.

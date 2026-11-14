---
id: public-action-join-reads-own-view-and-cost-of-going
title: "Nearly every adult in a town joins a rally or protest, because the join decision reads the town's mood and not the person's own view or cost of going"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words-engine
model: opus
effort: medium
root: none
source: Account lead stopgap disposal, Nov 14 (found sizing the counted share of public action)
claimed-at:
---

**What.** In a six-month bad term a town's health rally is joined by nearly every adult: Port O'Connor, Texas (drawn as `pa-a` from seed `pa-seed-9320`) had 143 named people and 399 counted people in its health rally, 542 against about 537 adults at the start of play (114 named, 423 counted); Lincoln, Vermont (`pa-b`) had 122 named plus 142 counted against 261 adults (112 named, 149 counted). Even before counted people were asked, 143 named joined where 114 named adults were counted at the start, so the named people alone were already close to the whole town. A rally or protest of nearly the whole town reads as a fault, and the paper and the crowd scene print the size. Seen: the paper's line about how many residents protested and the crowd scene's "strong" line show a believable share of the town.

**Cause.** Found in code: `src/core2/modules/public-action.ts`, `gather` and `gatherCounted` call `joinsGroup(api, person, Math.min(1, level), true, draw)` (`src/core2/modules/interest-groups.ts` line 761). The first argument that carries the person's pull is the town's organizing level for the area, the same for everyone, and `touches` is the constant `true` for everyone, so the pull is doubled for every adult whether or not the area touches them. What differs by person is only their temperament (`leanedYes` on `interest-groups.member-join`) and, for named people, their ties to those already in (`groupDraw`; zero for counted people). The person's own view of the area's question (`viewOn`, the views engine's stance, as `purpose-scene.ts` reads it), whether the area touches their own life (a renter in a rent protest, a jobless person in a protest over jobs), and the cost of going (work that day, age, care of children or the old) are not read.

**Fix.** In `gather` and `gatherCounted`, give `joinsGroup` the person's own pull: their view toward the side the action presses (the views engine's stance on `rule.question`, signed so a person who disagrees pulls zero) times the area's organizing level, and `touches` true only where the person is in the area's own group (the renters for rent, the jobless for jobs, school staff for schools, nobody for the all-residents areas unless the record says it touches them). Read the cost of going from the records that already exist: a person working that day (the jobs engine's schedule), a child or an old person in their care (the household), and their age. Delete the constant. Do not cap the size and do not add a weight; the sizes change because the reads change. Prove it with the same staged six-month term at `pa-a`, `pa-b` and `pa-c` of seed `pa-seed-9320`: the share of adults in each action falls, and a person who disagrees with the cause is not in it.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly, and stop.

**Rules.** An effect is a read, not a record: the views engine's stance and the household's records are read where the person decides. No dice: the view, the ties, the work and the care decide, and nothing is drawn. One rule, all 56 places: no place is named in the rule; places named above are only where it was measured. One model, two tiers: a counted person is asked by the same rule as a named one, times their record's count.

**Done when.** In a played world built with buildBenchWorld at the three pinned places, a staged bad term gives actions whose share of the town's adults is below half, a person whose stance on the question opposes the action is in none of them, and the share is the same for named and counted people of the same view, each action named by its record id; a second session replays it in a drawn place and seed nobody chose.

**Waits on.** The counted share of public action (this thread's third PR).

**Files.** src/core2/modules/public-action.ts, src/core2/modules/public-action-counted.test.ts, src/core2/modules/interest-groups.ts

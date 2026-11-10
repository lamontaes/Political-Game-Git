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

**Cause.** Needs cause. Looked at: the patrol-hours builder's report on pull request #8230 (src/core2/police-patrol.test.ts: Washington, D.C., seed a1, 1 police-line job; Myrtle Creek, Oregon, 2). Not read: where the opening builds a place's public jobs and how many it gives each department (src/bench/world.ts and the opening's public employers), whether police jobs carry a weight as counted households do, and whether src/core2/public-safety.ts already scales its police service by the budget line and not by staff.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session: for three drawn places of very different size, print the police department's jobs (full and counted, with any weight), its budget line, and the place's Census population, beside the real sworn-officer rate the outcome web already holds for the state. Find where the opening sizes the department. Then rewrite this item with `Found in code:` or `Measured:` and a real Fix that makes the staff stand for the place's size by weight, without filling in more full people.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count; police staffing is no exception. This is a game: no more full people, counts only. Estimate, never UNKNOWN: the real officer rate checks the total and never sets one person's job. One rule, all 56 places.

**Done when.** A second session reads the finding: for three drawn places (places and seeds named) the item gives the department's staff as the world holds it, the real figure beside it, and where the opening sets it, and the item is rewritten with its cause and a Fix. After the fix, a drawn place's patrol-hours row is within the reported band of the real hours for a place of its size.

**Waits on.** Nothing to find the cause. The fix should land after world-police-patrol-and-grievance-causes-part-1-patrol-hours (pull request #8230), which adds the row that shows it.

**Files.** src/bench/world.ts, src/core2/public-safety.ts, src/core2/police-patrol.test.ts (new)

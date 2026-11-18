---
id: people-shared-time-grows-ties
title: "A tie grows from the hours two people actually spend together (work, school, meetings, a campaign), so the player can make a friend in a played year"
area: core
kind: feature
priority: 2
size: M
status: merged
claimed-by:
pr: #9364
blocked-on:
lead: laws-effects
source: director lead, director-tie-turn-scenes-never-fire (#6335), Oct 27
after:
standard: 2
model: opus
effort: medium
root: design-life-record
checked: fable 2026-11-10
---

**What.** The relationship engine counts closeness as hours together over hours plus a half-closeness point (Hall 2019), and a friendship takes about 60 hours. The player's day gives acquaintances almost none: a year with the player watched moved no acquaintance's tie more than 0.006, and sixty daily talks with one acquaintance moved it from 0.025 to 0.043, because a talk is minutes. The director turns a tie once its growth adds up, and 60 hours together makes the becoming-friends scene play, but nothing in ordinary play gives the player those hours. Credit shared hours from the records that put two people in one place.

**Cause.** Measured: Laurel, Delaware, seed tie-1: a year with the player moved no acquaintance's tie more than 0.006; 60 daily talks moved one from 0.025 to 0.043. Code: src/core2/closeness.ts counts hours together.

**Fix.** Credit shared hours from records that put two people in one place (job hours at one employer, meeting attendance, campaign volunteers) into closeness, with the rate sourced from Hall 2019 or a time-use study.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: whether shared work shifts, classes, club or body meetings and campaign work count as hours together, and how much, is sourced (Hall 2019 or a time-use study), never guessed. Wire to the world: the hours come from the records that put two people in the same place. No dice. One rule, all 56 places.

**Done when.** A second session plays a year of buildBenchWorld in Laurel, Delaware (seed tie-1) and one more drawn place named with its seed, works or volunteers alongside someone, and sees closeness with them grow from those shared hours, named by the work or meeting record ids, and at least one acquaintance's tie turn and play a becoming-friends scene without any test fixture.

**Waits on.** Nothing.

**Files.** src/core2/closeness.ts, src/core2/data/closeness.json

**Notes.** Found by the director lead while diagnosing why becoming-friends never fired.

Nov 14 (Account lead thread, built locally, PR to follow): the weekly jobs step now credits each known pair at one employer with the minutes their own work schedules overlap, times `workContactShare` (ESTIMATED, spread 0.1 to 0.4) split over the people the workplace lets one know (`knownAmong`), through the one relationship writer: `src/core2/work-closeness.ts`, called from the `jobs-week` handler in `modules/jobs.ts`; test `src/core2/work-closeness.test.ts` (Iron Station NC 3733820). Housemates are already credited weekly (`shareHomeTime` in `modules/people.ts`). Next steps, not in that PR: neighbors on one street or building (nothing credits shared time there), classmates once the school engine records a class, and group members from meeting attendance.

**Why a year ends with about 2% fewer relationship rows (Nov 15, Sheridan WY 5669845 seed a1: 10205 without, 10042 with).** Every row that differs between the two years is a person-to-person contact row, and 5313 contact row ends without the change against 4960 with it sit on people whose ties the change credited (1190 rows changed level, 732 up, 458 down), while everyone else gains 24. The weekly credit lifts ties between known colleagues, the contact chooser's pull on those ties is the hours each has lost, so more of those people's weekly contacts go to colleagues they already have a tie with and fewer reach a new person. No limit on how many ties a person holds is involved: ties are never removed, and the weekly shortlist of fifteen (`SG-PEOPLE-cause-holder-weekly-contacts`, people.ts) was ruled out by running both years with it set above any person's ties, where the gap stayed (10187 against 9996). The gap is therefore a read of the new closeness, not a cap.

**Whether meeting new people has its own engine (Nov 15).** It has: `encounters.ts` meets people (at work, on joining, on a visit, in a meeting, in talk). It has no share of the chooser's time of its own, though: a visit to someone new competes with visits to known ties inside the same contact chooser (`contact-candidate` in `modules/people.ts` offers every tied person plus one untied person they know), so the fall in new ties that closer colleagues cause falls out of that competition and is not a second effect. If the owner wants a person's meeting of strangers to keep its own room, it is a change to that chooser's offers, not to this mechanism.

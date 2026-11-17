---
id: tests-retire-claim-household-left-the-counts
title: "The counted retiree test fails where a retiree's household leaves town in the same year"
area: world
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: red-main
pr:
after:
blocked-on:
lead: world
source: "Laws and effects on the crew issue 9747, Nov 17, 2026, from #9825's unit job"
model: fable
effort: medium
root: none
---

**What.** The test `src/core2/jobs-counted-retire-claim.test.ts` goes red on pull requests that do not touch it. It expects every counted worker who retired in the year to hold one live flow paying their claim at the year's end. Nothing a player sees is wrong.
Seen: the unit job of #9825 at Pleasant Hill, Missouri.

**Cause.** Measured: at Pleasant Hill, Missouri (2958394), seed 5bebb80a6e6a35892cacf54115952c3c8d70390bd8620536dcf06b9c3e20328b, by a probe that builds that world with `buildBenchWorld` and plays 140 days on main 74e6551b: person_4ffda2e97d6dcd65 retired on Feb 1, 2025 and claimed $1,505.30 a month; the flow `retirement-claim:person_4ffda2e97d6dcd65` ended on June 1 with the reason `household-left`, and the person is in no live counted household from that day. `endHouseholdFlows` in src/core2/modules/residents.ts ends an award with the household that leaves the counts. The other 202 retirees each keep one live flow. The engine is right and the test is wrong.

**Fix.** In the test's loop over retirees (src/core2/jobs-counted-retire-claim.test.ts), a retiree whose claim flow ended with `household-left` and who is in no live counted household is named and passed over; every other retiree is checked as before, and at least one must be. The player sees nothing new; a pull request stops going red on it.

**Time box.** 1 hour for one session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test draws its place and names it with its seed. One model, two tiers: a counted retiree's award ends with the household as a full household's does.

**Done when.** A second session, not the builder, runs the test at a drawn place it names with its seed (for example Pleasant Hill, Missouri, seed 5bebb80a6e6a35892cacf54115952c3c8d70390bd8620536dcf06b9c3e20328b), sees it pass and print how many retirees were checked and which were passed over because their household left the counts, and says so with `npm run pool -- seen`.

**Waits on.** Nothing.

**Files.** src/core2/jobs-counted-retire-claim.test.ts

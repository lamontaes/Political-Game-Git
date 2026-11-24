---
id: people-life-before-18-after-early-access
title: "A new game that starts before 18: the creator's ages under 18 and a player cohort the opening keeps, after early access"
area: people
kind: feature
priority: 3
size: M
status: blocked
standard: 2
claimed-by:
pr:
after:
blocked-on: early access ships first (owner, Nov 16)
lead: people
source: 'owner, Nov 16, 2026, 05:02 UTC: "Just do 18 and up right now. Life before 18 will come after early access."'
model: sonnet
effort: medium
root: none
---

**What.** Until early access ships, a new game starts the player at 18 or older. After it, the owner wants life before 18 playable. This item holds what the 18-and-up change took out of the new game's path, so the work starts from it instead of from scratch. Seen: the New game creator offers ages under 18, and a start without the creator can begin before 18.

**Cause.** Design: owner, Nov 16, 2026 ("Just do 18 and up right now"). The 18-and-up change (the opening-draws thread, PR after #9635) set `PLAYER_MIN_AGE = 18` in src/bench/world.ts and `CREATOR_MIN_AGE` in src/bench/creator.ts to it. It removed `cohortAge` (a 17-year-old cohort the opening was forced to hold) and the `playerEntryAge` cohort and parameter from src/core2/population.ts, and src/core2/population-cohort.test.ts with them. Before it, the player with no birthday was "the 17-year-old whose 18th birthday comes soonest" (`entrantChoice`). Life under 18 itself (children in households, school, kin) was not touched. src/bench/progress.ts still reads the entrant at 17 or 18 for the M0 turn-18 step.

**Fix.** When the owner opens it: lower `PLAYER_MIN_AGE` to the youngest age he names. Where a town's households hold nobody that age, use the existing `playerAge` search in population.ts, which draws households of every shape until one holds the age, rather than a forced cohort. Rewrite the M0 turn-18 step in progress.ts to read the player's own birthday.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places. No forced cohort and no fixed age: the age comes from the creator or the town's own people. Estimate, never UNKNOWN.

**Done when.** A second session starts a new game in a drawn place (named, with its seed) at the youngest age the owner names, from the creator and without it, and sees the player that age with a household, schooling and kin that fit it.

**Waits on.** Early access.

**Files.** src/bench/world.ts, src/bench/creator.ts, src/core2/population.ts, src/bench/progress.ts

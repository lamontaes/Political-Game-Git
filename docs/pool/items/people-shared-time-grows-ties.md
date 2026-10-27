---
id: people-shared-time-grows-ties
title: "A tie grows from the hours two people actually spend together (work, school, meetings, a campaign), so the player can make a friend in a played year"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: laws-effects
source: director lead, director-tie-turn-scenes-never-fire (#6335), Oct 27
---

**What.** The relationship engine counts closeness as hours together over hours plus a half-closeness point (Hall 2019, `src/core2/closeness.ts`), and a friendship takes about 60 hours. The player's day gives acquaintances almost none. In Laurel, Delaware (seed tie-1), a year with the player watched moved no acquaintance's tie more than 0.006. Sixty daily talks with one acquaintance moved it from 0.025 to 0.043, because a talk is minutes. Since #6335 the director turns a tie once its growth adds up, and 60 hours together makes the becoming-friends scene play. Nothing in ordinary play gives the player those hours.

**Rules.** Research before building: whether shared work shifts, classes, club or body meetings and campaign work count as hours together, and how much, is sourced (Hall 2019 or a time-use study), never guessed. Wire to the world: the hours come from the records that put two people in the same place (a job's hours at one employer, a meeting's attendance, a campaign's volunteers). No dice. One rule, all 56 places.

**Done when.** In a played year of buildBenchWorld in a drawn place (seed named), the player who works or volunteers alongside someone gains closeness with them from those shared hours, named by the work or meeting record ids, and at least one acquaintance's tie turns and plays a becoming-friends scene without any test fixture.

**Files.** src/core2/closeness.ts, src/core2/data/closeness.json

**Notes.** Found by the director lead while diagnosing why becoming-friends never fired.

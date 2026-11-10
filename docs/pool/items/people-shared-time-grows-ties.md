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
after:
standard: 2
model: opus
effort: medium
root: design-life-record
checked: fable 2026-11-10
---

**What.** The relationship engine counts closeness as hours together over hours plus a half-closeness point (Hall 2019), and a friendship takes about 60 hours. The player's day gives acquaintances almost none: a year with the player watched moved no acquaintance's tie more than 0.006, and sixty daily talks with one acquaintance moved it from 0.025 to 0.043, because a talk is minutes. The director turns a tie once its growth adds up, and 60 hours together makes the becoming-friends scene play, but nothing in ordinary play gives the player those hours. Credit shared hours from the records that put two people in one place. Seen: a person's card and the becoming-friends scene, which the player cannot reach in a played year today.

**Cause.** Measured: Laurel, Delaware, seed tie-1: a year with the player moved no acquaintance's tie more than 0.006; 60 daily talks moved one from 0.025 to 0.043. Code: src/core2/closeness.ts counts hours together.

**Fix.** Credit shared hours from records that put two people in one place (job hours at one employer, meeting attendance, campaign volunteers) into closeness, with the rate sourced from Hall 2019 or a time-use study.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: whether shared work shifts, classes, club or body meetings and campaign work count as hours together, and how much, is sourced (Hall 2019 or a time-use study), never guessed. Wire to the world: the hours come from the records that put two people in the same place. No dice. One rule, all 56 places.

**Done when.** A second session plays a year of buildBenchWorld in Laurel, Delaware (seed tie-1) and one more drawn place named with its seed, works or volunteers alongside someone, and sees closeness with them grow from those shared hours, named by the work or meeting record ids, and at least one acquaintance's tie turn and play a becoming-friends scene without any test fixture.

**Waits on.** Nothing.

**Files.** src/core2/closeness.ts, src/core2/data/closeness.json

**Notes.** Found by the director lead while diagnosing why becoming-friends never fired.

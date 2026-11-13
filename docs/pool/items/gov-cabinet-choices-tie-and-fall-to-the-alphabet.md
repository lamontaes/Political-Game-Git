---
id: gov-cabinet-choices-tie-and-fall-to-the-alphabet
title: 'The President''s cabinet choices tie, so every post lists the same members of Congress in state order (Arizona, California, Colorado, Connecticut, Florida)'
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Chalan Laulau, Northern Mariana Islands, seed fe27aa8b-db0e-4fc8-aff9-fc871d441c15)
---

**What.** On main 596d5127, an Advanced start in Chalan Laulau, Northern Mariana Islands (seed fe27aa8b-db0e-4fc8-aff9-fc871d441c15) as President Steven McCoy.

- **The desk.** On January 22, 2025 the cabinet desk opens with fifteen posts. Every post offers the same eight people in the same order. `/api/nominations` lists them for Secretary of Labor as `official:seat:US-AZ:us-house:09`, `US-CA:us-house:40`, `US-CA:us-house:41`, `US-CO:us-house:05`, `US-CT:us-house:05`, `US-FL:us-house:20`, `US-FL:us-house:28` and so on.
- **The order.** That is the order of their record ids. Each Nominate takes the first name off the top, and the next post's list starts one name later.
- **What the player reads.** The desk is meant to list "who each could go to, best first". In practice the Secretary of Defense is whoever's state comes first in the alphabet.

Seen: the President's cabinet desk on the first days of a term, and the people an unplayed President names.

**Cause.** Found in code: in `nominateAndConfirm` (`src/core2/appointments.ts`), a candidate's total is `loyalty * (alignment + acquaintance) + merit * qualification`, and ties sort by `candidateId`. The candidates come from `nominationCandidates` (`src/core2/office-day-federal-president.ts`). Two terms flatten:

- **Alignment.** It reads `officialLean`, which clamps `ideal * leanScale` to [-1, 1] (`src/core2/modules/officials.ts`, line 1123), so most members of the President's party sit at the clamp.
- **Qualification.** It is `min(1, servedYears / cabinetQualificationYears)`, which is 1 for anyone who has served 8 years.
- **Acquaintance.** It is 0 for strangers, which a President from a territory is to nearly every member.

So the totals tie and the alphabet decides. The ids in exact sorted order across all eight places is the sign: unequal totals would not land in that order.

**Fix.** The weighing reads the two people's own unclamped ideals: alignment is the distance between the candidate's `ideal` and the President's, on a sliding scale. Qualification keeps rising with years served on a sliding scale that does not cap: for example, `years / (years + cabinetQualificationYears)`, which is 0.5 at 8 years. No tie-break by id is left in the ranking a player sees: ties after both are broken by acquaintance strength (`closenessBetween`), not by whether they know each other. No new parameters. A post-specific merit (a member's committee, a former job in the field) is a separate item if wanted.

**Time box.** 2 hours

**Rules.** Sliding scales and causes: nothing flips at a threshold, and a clamp or a cap that makes everyone equal is one. No dice: the President's traits and record decide, never the order of ids. One rule, all 56 places: the check draws its place.

**Done when.** A test in src/core2 draws a place, seats its President and reads `nominationsOpen`: the first eight candidates' totals are not all equal and their order is not the order of their ids. A second session then sees, on the bench on main, a drawn Advanced start as President whose cabinet desk does not list its choices in state order (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/core2/appointments.ts, src/core2/office-day-federal-president.ts, src/core2/appointments.test.ts

**Notes.** The same alphabet tie-break was seen on the national desks in `press-address-ties-break-on-the-alphabet`. The ranking is shared with every appointment that calls `nominateAndConfirm` (governors, mayors), so the builder checks those lists too.

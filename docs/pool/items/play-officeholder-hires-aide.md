---
id: play-officeholder-hires-aide
title: "An officeholding player can hire an aide, as every other officeholder can"
area: play
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The staff engine's review hires aides for every town officeholder except the player, since no engine decides for the controlled person (staffReview in src/core2/modules/staff.ts skips state.playerId), and no bench control calls hireStaff, so a player who wins a seat never has an aide. Every scene cast from the officeholder's staff then skips the player: the staffer bringing a story against them (words-scene-staff-bad-news), the aide at the desk, a referred constituent case. The office screen should list the people the staff engine would weigh for the player (staffCandidates, with the reasons hireReasons gives), and let the player hire one through hireStaff, paid from the same post the engine's hires are.

**Rules.** No dice: who is listed and how well they would do the work come from the staff engine's own records, never a roll. An effect is a read: the hire is the staff row the director's staff fill and the delegated work read. No hand-written player text: the screen shows names, record data and control labels only.

**Done when.** In the bench, a player who holds a town seat in a drawn place (seed named) opens the office screen, sees the candidates the staff engine lists for them with their reasons, and hires one; the staff table then shows that aide serving the player, and the next scene cast from the player's staff (a story against them, the desk) brings that aide. A bench screenshot at 1440x900 with the place and seed under it shows the hire.

**Files.** src/bench/office.ts, src/bench/handler.ts, src/bench/play.mjs, src/core2/modules/staff.ts

**Notes.** TODO

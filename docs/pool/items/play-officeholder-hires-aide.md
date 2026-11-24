---
id: play-officeholder-hires-aide
title: "An officeholding player can hire an aide, as every other officeholder can"
area: play
kind: feature
priority: 1
size: S
status: merged
claimed-by: claude/pool-play-officeholder-hires-aide
pr: #8376
after:
blocked-on:
standard: 2
lead: play-first
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:15:23.048Z
branch: claude/pool-play-officeholder-hires-aide
merged-at: 2026-11-11T15:04:33.584Z
---

**What.** The staff engine's review hires aides for every town officeholder except the player, since no engine decides for the controlled person, and no bench control calls the hire, so a player who wins a seat never has an aide. Every scene cast from the officeholder's staff then skips the player: the staffer bringing a story against them, the aide at the desk, a referred constituent case. The office screen should list the people the staff engine would weigh for the player, with the reasons it gives, and let the player hire one, paid from the same post the engine's hires are.

**Cause.** Found in code: `staffReview` in src/core2/modules/staff.ts (line 1202) filters out `state.playerId` (line 1225), and `hireStaff` (line 700), `staffCandidates` (line 401) and `hireReasons` (line 679) are called only from src/bench/office-two-stakes.test.ts, never from the bench screens.

**Fix.** On the player's office screen list the candidates `staffCandidates` returns with the reasons `hireReasons` gives, and add a Hire control that calls `hireStaff` through a handler route, paid from the same post the engine's hires are. Control names come from src/bench/data/controls.json.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: who is listed and how well they would do the work come from the staff engine's own records, never a roll. An effect is a read, not a record: the hire is the staff row the director's staff fill and the delegated work read. No hand-written player text: the screen shows names, record data and control labels only.

**Done when.** A second session (not the builder) starts the bench in a drawn place (seed named), takes a town seat, opens the office screen, sees the candidates the staff engine lists with their reasons, and hires one. The staff table then shows that aide serving the player, and the next scene cast from the player's staff (a story against them, the desk) brings that aide. A screenshot at 1440x900 with the place and seed under it shows the hire, and a test over `hireStaff` from the bench route names the staff row's record id.

**Waits on.** Nothing.

**Files.** src/bench/office.ts, src/bench/handler.ts, src/bench/play.mjs, src/core2/modules/staff.ts, src/bench/data/controls.json

**Notes.** TODO

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:15 UTC) on branch claude/pool-play-officeholder-hires-aide.

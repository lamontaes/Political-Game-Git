---
id: release-main-red-coming-of-age-scene-morning
title: "A scene on the birthday morning uses up the coming-of-age stop, so a Week runs past the day the player turns eighteen"
area: play
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/red-main-coming-of-age-scene-morning
pr:
after:
blocked-on:
lead: play
model: opus
effort: low
root: none
source: Red desk, Nov 13 (red on main reported on #8928; seed 5cd2e18b)
---

**What.** `src/bench/player-day-morning.test.ts` fails "a coming of age met on the way is met on its morning" on clean main at GOLDEN_PATH_SEED=5cd2e18b25c5834c85a09af1d1b6409633727a1049246cde5279b0e8f1fd14f5 (Beaver Springs, Pennsylvania, 4204824): the resident turns eighteen on January 23, 2025, three days into a Week, and the Week ends on January 28 instead of resting on the birthday morning. A director scene (a candidate filed on January 22) stops the clock at 7:00 AM on the birthday; the advance takes that stop as the birthday's, and once the player goes on from the scene the Week runs to its end. Seen: a player who presses Week before turning eighteen and gets a scene that morning never lands on the day they come of voting age.

**Cause.** Found in code: in src/bench/player.ts `run`, the check for a stop packet (`packet.at.minuteOfDay >= this.dayStartMinute() && this.comesOfAgeStop(...)`) calls `comesOfAgeStop`, which marks the coming of age shown, even when the packet is a scene's stop that ends the advance anyway; on resume nothing is left to stop on the birthday.

**Fix.** The check runs only for a packet that is not a stop: a scene's stop ends the advance on its own, and the birthday stop is kept for the moment the player goes on from it, when the complete packet on the birthday morning stops the run.

**Time box.** 1 hour

**Rules.** Ask why: the stop the Week makes on the birthday is named by the packet that took it, the scene's or the day's own, and no assertion is loosened, skipped or given a raised timeout.

**Done when.** A second session runs player-day-morning.test.ts on main at GOLDEN_PATH_SEED=5cd2e18b25c5834c85a09af1d1b6409633727a1049246cde5279b0e8f1fd14f5 and at a fresh seed, naming the drawn places, and all three cases pass; and in a new life on the bench in a drawn place whose resident turns eighteen in the first week, Week rests on the birthday morning after any scene that morning.

**Waits on.** Nothing.

**Files.** src/bench/player.ts

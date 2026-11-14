---
id: play-clock-refuses-to-cross-a-stop-nothing-shows
title: "The clock refuses Hour, Day and Week on Oct 27, 2026 with no stop on screen (Hampstead, Maryland, a U.S. House candidate)"
area: play
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: found by fixer F6 running src/bench/polling.browser.mjs (Nov 14)
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** On the bench, seed 39ec0fdc-2c02-4e33-a7b7-e193551af953 (the check's pinned run seed; place Hampstead, Maryland, key 2436500), the player files for the U.S. House race on the ballot of Nov 3, 2026, the world runs 304 days (`POST /api/dev/run-until`) to Tuesday, Oct 27, 2026 8:30 PM, and from then on every clock button fails: Hour answers `/api/wait` 400, Day and Week answer `/api/advance` 400, and the screen shows only the room, the buttons and the line "Player stop clock cannot cross an unresolved stop." No talk, no sheet and no Continue is open (a screenshot is in the thread's files). A player cannot get past it: the clock stays at 8:30 PM on Oct 27 through 100 attempts. Seen: the bench polling check, run on that seed.

**Cause.** Found in code: the stop is the story director's interrupt for a "party asked" moment, registered by `src/director/ledger.ts:1658` (`registerInterrupts`) on 2025-12-27 for 2025-12-28 10:00 (record `person_3730523104093c5a:2025-12-27:party-asked:contest:seat:US-MD:governor:2026-11-03:party:US-MD:republican:person_3730523104093c5a`, kind `interrupt`, module `p13-story-director`). It was found by listing the player's registry rows on that seed on Oct 27, 2026 (the registry held it, ten months old, and `earliestModuleStopsV1` from today returned none). The polling check then runs the world 304 days with dev mode's run-until, which goes through `advance` in `src/bench/dev-mode.ts:1748`: that calls `this.player?.release()` and runs `advanceCore` on the world's own clock, so the player's clock never reaches the stop and nothing acknowledges it (`acknowledgeModuleStopsV1` is called only from `src/core2/player-v1.ts:712`, when the player's clock stops at it). When the player's clock is bound again, `bindModuleStopClockV1` (`src/core2/player-stops-v1.ts:494`) and `setFrontier` (`:527`) see the earliest registered stop is before the moment asked for and refuse every Hour, Day and Week. No scene or Continue is raised because the stop's moment is already in the past. So a player cannot pass it, but only after dev mode skipped past a stop the player had not yet answered; a player's own clock halts at the stop first. Not checked: whether any play path other than dev run-until leaves a stop behind.

**Fix.** (Built: `passPlayerStopsV1` in `src/core2/player-stops-v1.ts`, called by dev mode's `advance` and `runYear`.) When dev mode's `advance` takes the clock from the player, it releases (acknowledges) the player's registered stops that fall before the target date, the way the player's own resume does, and a stop with `hold` stays until answered. Then prove it on this seed and place: Day and Week move the clock to Nov 3, 2026.

**Time box.** 2 hours.

**Rules.** Replace, never layer: dev mode's skipped time answers a stop through the same acknowledgment the player's own clock uses, with no second stop engine. A stop is a screen the player can answer, and nothing may hold the clock with no way to resolve it.

**Done when.** A second session runs `node --import tsx src/bench/polling.browser.mjs` on a fresh bench (it runs that seed and place) and sees it run 304 days with dev mode, then reach Tuesday, Nov 3, 2026 and mark the ballot, with Hour, Day and Week moving the clock in the running game after the run; and `src/bench/dev-advance-stops.test.ts` passes.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/core2/player-stops-v1.ts, src/core2/life.ts, src/bench/dev-advance-stops.test.ts (new)

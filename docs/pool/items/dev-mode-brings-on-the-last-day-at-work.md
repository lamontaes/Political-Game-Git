---
id: dev-mode-brings-on-the-last-day-at-work
title: "Dev mode brings on the last day at work: the player leaves their job through the game's own Leave work, and the coworkers say goodbye"
area: director
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by: claude/pt-board-last-day
pr: #10521
blocked-on:
source: CTO 17:40Z item 5 on #10377 (comment 7139529302), the six work-scene producers; lane 8 took 4 to 6
claimed-at: 2026-11-24T19:40:00.000Z
after:
lead: play-first
model: opus
effort: high
root: none
merged-at: 2026-11-25T01:44:33.393Z
---

**What.** The last day at work (type `last-day`, purpose `last-day-farewell`, W8's lines) never staged in a dev run, and a waited year has no quit for a player who never presses Leave work. Seen: a player who leaves their job meets the coworkers still there for a goodbye, and dev mode can bring it on.

**Cause.** Found in code: `SCENE_RECIPES` in src/bench/dev-mode.ts gives `last-day` no recipe of its own, so dev mode can only wait for its first cause record (`school.finished` naming the player), which an adult never gets; the scene-trace view (src/bench/dev-views/scene-force-map.json) says the same. The scene itself stages when the player leaves a job: the jobs engine's `quitJob` ends it as a job left (`jobs:left-work:`), the director's household-pay read makes `money:job-left` on the job, and the type's cause matches it.

**Fix.** A `quit` recipe keyed on the `money:job-left` label (the job record also causes a first meeting, so the record kind cannot key it): `DevMode.forceQuit` leaves the player's job through `leaveJobAs`, the same call as the Leave work control, and leaves a `quit` mark. The scene-trace view counts `quit` among the recipes an engine's own call brings about, and the stale force-map row goes.

**Time box.** 2 hours.

**Rules.** Every effect can be triggered from the game's own code in dev mode and traced (owner, Nov 14). No second hook or writer: the quit is the existing Leave work call.

**Done when.** A second session, in a drawn place whose player has a job they may leave, uses dev mode's scene control on the last day and sees the last-day scene stage within days with coworkers still at that employer; `src/director/last-day-played.test.ts` passes.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-views/scene-trace.ts, src/bench/dev-views/scene-force-map.json, src/director/last-day-played.test.ts (new)

**Notes.** Filed by Board mock (lane 8), Nov 24.

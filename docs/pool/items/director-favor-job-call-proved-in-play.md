---
id: director-favor-job-call-proved-in-play
title: "A laid-off friend's call for a word is proved in a played world: the favor-job scene stages from the jobs engine's own layoff"
area: director
kind: wiring
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pt-board-favor-job
pr: 10531
blocked-on:
source: CTO 17:40Z item 5 on #10377 (comment 7139529302), the six work-scene producers; lane 8 took 4 to 6, this is 6
claimed-at: 2026-11-24T20:10:00.000Z
after:
lead: play-first
model: opus
effort: high
root: none
---

**What.** The friend's call (type `reach-out`, purpose `favor-job`, circumstance `job-lost-calls`) had no proof in a played world, and a probe that wrote the layoff and advanced the core directly saw no call. Seen: someone the working player knows, living apart, is laid off, and the next day they call the player to ask for a word.

**Cause.** Found in code: nothing in the engine. The call is a scene from circumstance, which the director makes only for an explicitly controlled player (`controlled` in src/director/ledger.ts) and only when a day closes. A probe that advances the core outside the player's clock, or stops the clock at midnight so no day closes, sees nothing. Through the player's own clock (`advancePlayerV1` past midnight), the jobs engine's `work.job-lost` from `layOffWorker` stages `circumstance:job-lost-calls` the same day and the scene composes.

**Fix.** Dev mode could not bring the call on from its screen: the Scenes panel's For list holds only the people the director tells stories for (the player and their home), and with no one picked the layoff recipe laid off the player first. Now, for a type whose circumstance row says the caller lives apart, a press with no one picked lays off the first person the player knows in another home who works and can be laid off today, through `layOffWorker` (src/bench/dev-mode.ts). And a drawn-place played test, `src/director/favor-job-played.test.ts`: dev mode's layoff for a working friend apart (`forceScene` with `forId`, the existing `layoff` recipe), days through the player's clock, and the call staged with the one laid off as the caller and composed. No engine change, no new hook.

**Time box.** 1 hour.

**Rules.** Every effect can be triggered from the game's own code in dev mode and traced (owner, Nov 14): dev mode's existing layoff control and its mark.

**Done when.** A second session, in a drawn place whose player works and knows a working person in another household, uses dev mode's scene control on "reach-out" for that person, presses Day, and sees that person call to ask for a word; `src/director/favor-job-played.test.ts` passes.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/director/favor-job-played.test.ts (new)

**Notes.** Filed by Board mock (lane 8), Nov 24. The Coordinator's brief was to stack this on the tracer's #10526 (`director.runningFor`); the call needs no `runningFor` when days pass through the player's clock, and the test passes on main at Washington, D.C., so it is cut from main. Dev mode's Run until is the path `runningFor` serves.

---
id: director-layoff-scene-reads-the-played-layoff
title: "A player laid off gets the layoff scene with the boss who decided it: the type reads the jobs engine's real layoff record"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pt-board-layoff-terms
pr:
blocked-on:
source: CTO 17:40Z item 5 on #10377 (comment 7139529302), the six work-scene producers; lane 8 took 4 to 6
claimed-at: 2026-11-24T19:20:00.000Z
after:
lead: play-first
model: opus
effort: high
root: none
---

**What.** The layoff scene (type `layoff`, purpose `layoff-terms`, W8's lines) never stages in play. Seen: a player laid off at work gets a scene with the boss who decided it, in a played world.

**Cause.** Found in code: the director keys a day's changes by cause id (`change` in src/director/ledger.ts, around line 964), and the first kind written wins. The jobs engine's `work.job-lost` carries the layoff's mood impulse (`severityImpulse` in src/core2/modules/jobs.ts), so the feeling read writes `event:work.job-lost` under that id first, and the household-pay read's `job-ended` kind for the same id is dropped. The layoff type matched only `money:job-ended`, which the player's own layoff never makes. The fixture in src/director/layoff-scene.test.ts emits a layoff with no impulse, so it passed.

**Fix.** Add a second cause to the `layoff` type in src/director/data/situation-types.json: `causeKind: "event:work.job-lost"`, `selfNamed`, `decidedBy` naming someone else, with the same bindings. Keep the `money:job-ended` cause, which a record with no impulse still makes. A played test draws places until a working player is laid off through dev mode (`layOffWorker`) and checks the scene stages from that record, with the decider as the boss, and composes.

**Time box.** 2 hours.

**Rules.** An effect is a read (the scene reads the jobs engine's own record). One record, one scene (the type still yields to the household's news-arrives).

**Done when.** A second session, in a drawn place with a working player, uses dev mode's layoff on the player and sees the layoff scene stage within days, the boss named as the record's decider; `src/director/layoff-played.test.ts` passes.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/layoff-played.test.ts (new)

**Notes.** Filed by Board mock (lane 8), Nov 24. Where the job's title is not sayable, the narration pieces (which require `position` without saying it) word nothing; sent to W8 for the lines.

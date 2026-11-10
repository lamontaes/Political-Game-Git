---
id: play-job-openings-on-screen
title: "Jobs and study lists the openings in town a jobless player could take, and why none fit when none do"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from world-player-jobless-no-offers)
lead: play-first
milestone: play-first
after:
model: sonnet
effort: medium
root: rc7-player-cannot-drive
checked: fable 2026-11-10
---

**What.** A jobless 18-year-old player can go a whole year with no job offer in some towns, and world-player-jobless-no-offers is fixing the offers. Jobs and study says No current job and nothing more, and the only openings shown anywhere is a Jobs open count on Metrics. List the open positions in town with employer, hours and pay, mark the ones the player fits by the jobs engine's own fit rule, and let the player apply to one; when none fit, say why (experience asked, hours, distance), read from the position records. Seen: Jobs and study, which lists the town's openings for a jobless player and says why none fit.

**Cause.** Design: docs/play-first/LAW.md section 11 (the world on screen makes sense) and the position records of the jobs module (src/core2/modules/jobs.ts); the only openings on screen is the Jobs open count from `jobs.openPositions` in src/bench/metrics.ts (line 231). The old src/bench/jobs.ts is gone.

**Fix.** On Jobs and study list the town's open positions (employer, hours, pay), mark the ones the player fits by the jobs engine's fit rule, let the player apply, and say why when none fit, all by position record id.

**Time box.** 3 hours for one Sonnet session; if not done, push what exists, open the draft PR, write the handoff.

**Rules.** Serves LAW.md section 11. Wire to the world: openings and fit come from the position records and the jobs engine's own fit rule. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** A second session, in a drawn place on the bench, sees a jobless adult player's Jobs and study list the town's open positions matching position record ids in a test, applies to one, and later sees the offer or the refusal by record id, shown by a screenshot with the place and seed named. The owner sees it on Jobs and study in his own game without opening dev mode.

**Waits on.** Nothing. (world-player-jobless-no-offers, which it once waited on, was closed as built: offers reach a jobless player within twelve weeks wherever a position is open.)

**Files.** src/bench/metrics.ts, src/bench/handler.ts, src/bench/play.mjs, src/core2/modules/jobs.ts

**You will see.** Out of work, you can see the jobs open in town and apply for one.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Notes.** Filed by the Oct 25 pool audit: world-player-jobless-no-offers's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with world-player-jobless-no-offers (needs-from in the handoff line).

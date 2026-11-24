---
id: jobs-no-new-coworker-in-a-played-year
title: "A played year brings the player no new coworker, so the first meeting at work never plays"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: opus
effort: medium
root: none
source: Promises engine thread, Nov 16, 2026, seeing #9610's dev view in a played life (Account lead's ruling to file it for the renters and jobs thread)
---

**What.** A working adult in a played life never meets a new coworker: dev mode's own run for the first-meeting scene went a whole year with no hire at the player's place of work, in a small town and in a mid-size city. The scene's cause is a `job` record with the `circumstance:new-coworker` source, so without a hire next to the player the scene, and the show-around promise it can end in, never happens in play. The promises tests reach it only by hiring people by hand.
Seen: dev mode's Scene run for first-meeting stopped at its 366-day cap with no record, at both places.

**Cause.** Needs cause. Measured: at Box, Oklahoma (creator start, born 1980, world seed 9c25c6f9-d1bd-498c-88c1-96d8f68987c8) and at Greenville, North Carolina (3728080, world seed 309bd39b-260d-43db-bee8-6196bff8a237, the player a stocker), by `POST /api/dev/scene {"typeKey":"first-meeting"}` on the bench from 2025-01-20: both returned `"reason":"cap"`, 366 days, `"records":[]`. Whether anyone at all was hired at the player's employer in that year was not measured. The next step is to count the hires at the player's organization over that year (core.finance.jobsByOrganization) and, if there are some, to read why src/director/circumstance.ts (source `new-coworker`) never names the player. If the world does hire next to the player, the producer that writes the new-coworker `job` record is where it goes wrong; if it does not hire, it is the turnover at the player's employer, the jobs engine's, against a real quits-and-hires rate.

**Fix.** None until the cause is found.

**Time box.** 2 hours to find the cause for one Opus session at medium effort; the fix is sized after.

**Rules.** Wire to the world: a scene's cause is a record the jobs engine writes in an ordinary played year, never a hire placed by hand.

**Done when.** In a drawn place with its seed, a second session starts a new life as a working adult, runs dev mode's first-meeting Scene run, and sees a new coworker's first meeting play within the year, then presses the reply that promises a show-around and sees it in the person card's Promises section.

**Waits on.** Nothing.

**Files.** src/director/circumstance.ts, src/bench/dev-mode.ts (forceScene, the `wait` recipe), the jobs engine's hiring under src/core2/modules/
